
create or replace function public.get_teacher_student_scenario_report_scoped_v1(
  p_class_id uuid,
  p_student_id uuid,
  p_scenario_id uuid
)
returns table(
  response_id uuid,
  scenario_id uuid,
  scenario_title text,
  card_id text,
  card_title text,
  card_prompt text,
  objective_id uuid,
  objective_title text,
  selected_option_id text,
  selected_option_label text,
  selected_option_feedback text,
  recommended_option_label text,
  outcome text,
  occurred_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Anmeldung erforderlich' using errcode = '42501';
  end if;

  if not public.has_teacher_module_assignment(p_class_id, 'scenario', p_scenario_id) then
    raise exception 'Kein aktiver Modulauftrag für dieses Szenario in dieser Klasse'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.class_instance_memberships cim
    where cim.class_instance_id = p_class_id
      and cim.user_id = p_student_id
      and cim.role::text = 'student'
      and cim.left_at is null
  ) then
    raise exception 'Schüler:in gehört nicht aktiv zu dieser Klasseninstanz'
      using errcode = '42501';
  end if;

  return query
  with latest as (
    select distinct on (r.scenario_id, r.card_id) r.*
    from public.scenario_learning_card_responses r
    where r.user_id = p_student_id
      and r.class_instance_id = p_class_id
      and r.scenario_id = p_scenario_id
    order by r.scenario_id, r.card_id, r.occurred_at desc, r.id desc
  )
  select
    r.id,
    s.id,
    s.title,
    r.card_id,
    coalesce(card.value ->> 'title', 'Lernaufgabe'),
    nullif(card.value ->> 'prompt', ''),
    r.learning_objective_id,
    coalesce(nullif(card.value ->> 'objective', ''), lo.title),
    r.option_id,
    coalesce(r.answer_label, selected.value ->> 'label', 'Antwort gespeichert'),
    coalesce(nullif(selected.value ->> 'feedback', ''), nullif(selected.value ->> 'explanation', '')),
    (
      select opt.value ->> 'label'
      from jsonb_array_elements(coalesce(card.value -> 'options', '[]'::jsonb)) opt(value)
      where opt.value ->> 'outcome' = 'success'
      order by opt.value ->> 'id'
      limit 1
    ),
    r.outcome,
    r.occurred_at
  from latest r
  join public.scenarios s on s.id = r.scenario_id
  left join public.learning_objectives lo on lo.id = r.learning_objective_id
  left join lateral jsonb_array_elements(coalesce(s.learning_cards, '[]'::jsonb)) card(value)
    on card.value ->> 'id' = r.card_id
  left join lateral jsonb_array_elements(coalesce(card.value -> 'options', '[]'::jsonb)) selected(value)
    on selected.value ->> 'id' = r.option_id
  order by s.title, r.occurred_at desc;
end;
$$;

revoke all on function public.get_teacher_student_scenario_report_scoped_v1(uuid,uuid,uuid) from public, anon;
grant execute on function public.get_teacher_student_scenario_report_scoped_v1(uuid,uuid,uuid) to authenticated;

