-- Extend teacher-module polls to support arbitrary choice counts, multi-select and private free-text answers.
alter table public.teacher_module_post_votes
  add column if not exists selected_choices text[] not null default '{}',
  add column if not exists text_answer text;

update public.teacher_module_post_votes
set selected_choices = case
  when choice = 'option_1' then array['option_1']::text[]
  when choice = 'option_2' then array['option_2']::text[]
  when choice = 'true' then array['option_1']::text[]
  when choice = 'false' then array['option_2']::text[]
  else '{}'::text[]
end
where cardinality(selected_choices) = 0;

alter table public.teacher_module_post_votes
  drop constraint if exists teacher_module_post_votes_choice_check;

alter table public.teacher_module_post_votes
  add constraint teacher_module_post_votes_choice_check
  check (choice in ('option_1','option_2','option_3','option_4','option_5','option_6','option_7','option_8','option_9','option_10','option_11','option_12','option_13','option_14','option_15','option_16','option_17','option_18','option_19','option_20','option_21','option_22','option_23','option_24','option_25','option_26','option_27','option_28','option_29','option_30','option_31','option_32','option_33','option_34','option_35','option_36','option_37','option_38','option_39','option_40','true','false','free_text'));

drop function if exists public.submit_teacher_module_post_vote(uuid, uuid, text);

create or replace function public.submit_teacher_module_post_vote(
  p_post_id uuid,
  p_class_instance_id uuid,
  p_choices text[] default '{}',
  p_text_answer text default null
)
returns table(choice text, vote_count bigint, total_votes bigint, my_choice text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_module_id uuid;
  v_post_type text;
  v_config jsonb;
  v_mode text;
  v_option_count integer;
  v_choice text;
  v_total bigint;
begin
  if v_user_id is null then raise exception 'Nicht authentifiziert.'; end if;

  select module_id, post_type, coalesce(interaction_data, '{}'::jsonb)
    into v_module_id, v_post_type, v_config
  from public.teacher_module_posts
  where id = p_post_id and post_type in ('poll','true_false') and status = 'published';

  if v_module_id is null then raise exception 'Diese Umfrage ist nicht verfügbar.'; end if;
  if not exists (
    select 1 from public.teacher_module_class_assignments a
    join public.class_instance_memberships cim on cim.class_instance_id = a.class_instance_id
    where a.module_id = v_module_id and a.class_instance_id = p_class_instance_id
      and a.is_active = true and cim.user_id = v_user_id
      and cim.role = 'student' and cim.left_at is null
  ) then raise exception 'Du hast keinen Zugriff auf diese Umfrage.'; end if;

  v_mode := case when v_post_type = 'true_false' then 'single' else coalesce(v_config->>'responseMode','single') end;
  v_option_count := case when v_post_type = 'true_false' then 2
    else greatest(0, jsonb_array_length(coalesce(v_config->'options','[]'::jsonb))) end;

  if v_mode = 'free_text' then
    if length(trim(coalesce(p_text_answer,''))) = 0 then raise exception 'Bitte gib eine Antwort ein.'; end if;
    if length(p_text_answer) > 5000 then raise exception 'Deine Antwort ist zu lang (maximal 5.000 Zeichen).'; end if;
    p_choices := '{}'::text[];
    v_choice := 'free_text';
  else
    if coalesce(cardinality(p_choices),0) < 1 then raise exception 'Bitte wähle mindestens eine Antwort.'; end if;
    if v_mode = 'single' and cardinality(p_choices) <> 1 then raise exception 'Bitte wähle genau eine Antwort.'; end if;
    if v_mode not in ('single','multiple') then raise exception 'Ungültiger Antwortmodus.'; end if;
    if exists (
      select 1 from unnest(p_choices) selected(value)
      where selected.value !~ '^option_[0-9]+$'
        or split_part(selected.value,'_',2)::integer < 1
        or split_part(selected.value,'_',2)::integer > v_option_count
    ) then raise exception 'Ungültige Antwortoption.'; end if;
    if (select count(distinct value) from unnest(p_choices) value) <> cardinality(p_choices) then
      raise exception 'Antwortoptionen dürfen nicht doppelt vorkommen.';
    end if;
    v_choice := p_choices[1];
    p_text_answer := null;
  end if;

  insert into public.teacher_module_post_votes(post_id,module_id,class_instance_id,user_id,choice,selected_choices,text_answer)
  values(p_post_id,v_module_id,p_class_instance_id,v_user_id,v_choice,coalesce(p_choices,'{}'::text[]),nullif(trim(p_text_answer), ''))
  on conflict(post_id,user_id) do update
    set choice = excluded.choice,
        selected_choices = excluded.selected_choices,
        text_answer = excluded.text_answer,
        created_at = now();

  select count(*)::bigint into v_total
  from public.teacher_module_post_votes v
  where v.post_id = p_post_id and v.class_instance_id = p_class_instance_id;

  if v_mode = 'free_text' then
    return query select 'free_text'::text, v_total, v_total, 'free_text'::text;
  else
    return query
    with choices as (
      select ('option_' || n)::text as choice from generate_series(1,v_option_count) n
    ), counts as (
      select selected.value as choice, count(*)::bigint as vote_count
      from public.teacher_module_post_votes v
      cross join lateral unnest(coalesce(v.selected_choices, array[v.choice])) selected(value)
      where v.post_id = p_post_id and v.class_instance_id = p_class_instance_id
      group by selected.value
    )
    select choices.choice, coalesce(counts.vote_count,0), v_total,
      array_to_string(coalesce(p_choices,'{}'::text[]),',')
    from choices left join counts using(choice)
    order by choices.choice;
  end if;
end;
$$;

grant execute on function public.submit_teacher_module_post_vote(uuid, uuid, text[], text) to authenticated;
notify pgrst, 'reload schema';
