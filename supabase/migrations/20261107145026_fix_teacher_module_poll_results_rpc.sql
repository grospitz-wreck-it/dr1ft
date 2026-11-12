create or replace function public.get_teacher_module_poll_results(p_post_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_module_id uuid;
  v_class_instance_id uuid;
  v_mode text;
  v_options jsonb;
  v_total integer;
  v_results jsonb;
  v_my_selection jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select p.module_id, a.class_instance_id, coalesce(p.interaction_data->>'responseMode', 'single'),
         coalesce(p.interaction_data->'options', '[]'::jsonb)
    into v_module_id, v_class_instance_id, v_mode, v_options
  from public.teacher_module_posts p
  join public.teacher_module_class_assignments a on a.module_id = p.module_id
  join public.class_instance_memberships cim on cim.class_instance_id = a.class_instance_id
  where p.id = p_post_id and p.post_type in ('poll', 'true_false') and p.status = 'published'
    and a.is_active = true and a.archived_at is null
    and cim.user_id = v_user_id and cim.role = 'student'::public.user_role and cim.left_at is null
  limit 1;

  if v_module_id is null then
    raise exception 'Poll not available for this student' using errcode = '42501';
  end if;

  select count(*)::integer into v_total
  from public.teacher_module_post_votes
  where post_id = p_post_id and module_id = v_module_id and class_instance_id = v_class_instance_id;

  if v_mode = 'free_text' then
    v_results := jsonb_build_array(jsonb_build_object('label', 'Antworten abgegeben', 'count', v_total, 'key', 'free_text'));
  elsif v_mode = 'multiple' then
    select coalesce(jsonb_agg(jsonb_build_object('key', o.key, 'label', o.label, 'count', coalesce(c.vote_count, 0)) order by o.ordinal), '[]'::jsonb)
    into v_results
    from (
      select option_value as label, 'option_' || ordinal::text as key, ordinal
      from jsonb_array_elements_text(v_options) with ordinality as opts(option_value, ordinal)
    ) o
    left join (
      select choice_key, count(distinct user_id)::integer as vote_count
      from public.teacher_module_post_votes v
      cross join lateral unnest(v.selected_choices) as choice_key
      where v.post_id = p_post_id and v.module_id = v_module_id and v.class_instance_id = v_class_instance_id
      group by choice_key
    ) c on c.choice_key = o.key;
  else
    select coalesce(jsonb_agg(jsonb_build_object('key', o.key, 'label', o.label, 'count', coalesce(c.vote_count, 0)) order by o.ordinal), '[]'::jsonb)
    into v_results
    from (
      select option_value as label, 'option_' || ordinal::text as key, ordinal
      from jsonb_array_elements_text(v_options) with ordinality as opts(option_value, ordinal)
    ) o
    left join (
      select choice, count(*)::integer as vote_count
      from public.teacher_module_post_votes
      where post_id = p_post_id and module_id = v_module_id and class_instance_id = v_class_instance_id
      group by choice
    ) c on c.choice = o.key;
  end if;

  select jsonb_build_object('submitted', true, 'selected', to_jsonb(v.selected_choices))
    into v_my_selection
  from public.teacher_module_post_votes v
  where v.post_id = p_post_id and v.user_id = v_user_id
  limit 1;

  return jsonb_build_object('total', v_total, 'results', v_results,
    'myVote', coalesce(v_my_selection, jsonb_build_object('submitted', false, 'selected', '[]'::jsonb)),
    'responseMode', v_mode);
end;
$$;
revoke all on function public.get_teacher_module_poll_results(uuid) from public, anon;
grant execute on function public.get_teacher_module_poll_results(uuid) to authenticated;

