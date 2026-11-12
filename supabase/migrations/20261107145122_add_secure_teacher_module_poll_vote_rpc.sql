create or replace function public.submit_teacher_module_poll_vote(
  p_post_id uuid,
  p_module_id uuid,
  p_class_instance_id uuid,
  p_selected_choices text[] default '{}'::text[],
  p_text_answer text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_mode text;
  v_options jsonb;
  v_choice text;
  v_allowed text[];
  v_vote_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode='42501'; end if;

  select coalesce(p.interaction_data->>'responseMode','single'),
         coalesce(p.interaction_data->'options','[]'::jsonb)
    into v_mode, v_options
  from public.teacher_module_posts p
  join public.teacher_module_class_assignments a on a.module_id=p.module_id
  join public.class_instance_memberships cim on cim.class_instance_id=a.class_instance_id
  where p.id=p_post_id and p.module_id=p_module_id
    and p.post_type in ('poll','true_false') and p.status='published'
    and a.class_instance_id=p_class_instance_id and a.is_active=true and a.archived_at is null
    and cim.user_id=v_user_id and cim.role='student'::public.user_role and cim.left_at is null
  limit 1;

  if v_mode is null then raise exception 'Poll not available for this student' using errcode='42501'; end if;

  if v_mode='free_text' then
    if nullif(btrim(coalesce(p_text_answer,'')),'') is null then
      raise exception 'A text answer is required' using errcode='22023';
    end if;
    v_choice := 'free_text';
    p_selected_choices := '{}'::text[];
  else
    if coalesce(array_length(p_selected_choices,1),0)=0 then
      raise exception 'At least one option must be selected' using errcode='22023';
    end if;
    if v_mode <> 'multiple' and array_length(p_selected_choices,1) <> 1 then
      raise exception 'Only one option may be selected' using errcode='22023';
    end if;
    select array_agg('option_'||ordinal::text) into v_allowed
    from jsonb_array_elements_text(v_options) with ordinality as opts(value,ordinal);
    if exists(select 1 from unnest(p_selected_choices) choice where not (choice=any(coalesce(v_allowed,'{}'::text[])))) then
      raise exception 'Invalid poll option' using errcode='22023';
    end if;
    v_choice := p_selected_choices[1];
    p_text_answer := null;
  end if;

  insert into public.teacher_module_post_votes(post_id,module_id,class_instance_id,user_id,choice,selected_choices,text_answer)
  values(p_post_id,p_module_id,p_class_instance_id,v_user_id,v_choice,coalesce(p_selected_choices,'{}'::text[]),case when v_mode='free_text' then left(btrim(p_text_answer),3000) else null end)
  on conflict(post_id,user_id) do update
    set choice=excluded.choice, selected_choices=excluded.selected_choices, text_answer=excluded.text_answer
    where public.teacher_module_post_votes.user_id=v_user_id
  returning id into v_vote_id;

  if v_vote_id is null then raise exception 'Vote could not be saved' using errcode='42501'; end if;
  return jsonb_build_object('saved',true);
end;
$$;
revoke all on function public.submit_teacher_module_poll_vote(uuid,uuid,uuid,text[],text) from public,anon;
grant execute on function public.submit_teacher_module_poll_vote(uuid,uuid,uuid,text[],text) to authenticated;

