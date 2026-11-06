-- DR1FT security hardening
-- Individual student scenario reports are exclusively for teachers.
-- School admins and school leads retain aggregate reporting, but must not
-- receive individual student learning evidence through this RPC.

create or replace function public.get_teacher_student_scenario_report_scoped_v1(
  p_class_id uuid,
  p_student_id uuid,
  p_scenario_id uuid
)
returns table (
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
as $function$
begin
  if auth.uid() is null then
    raise exception 'Anmeldung erforderlich' using errcode = '42501';
  end if;

  -- Require an active teacher membership in the same school as the exact
  -- assigned scenario. A school_admin or school_lead role is not sufficient.
  if not exists (
    select 1
    from public.teacher_class_module_assignments a
    join public.teacher_class_subscriptions s
      on s.id = a.subscription_id
     and s.teacher_user_id = a.teacher_user_id
     and s.class_instance_id = a.class_instance_id
     and s.school_id = a.school_id
    join public.class_instances ci
      on ci.id = a.class_instance_id
     and ci.school_id = a.school_id
     and ci.school_year = a.school_year
    join public.school_memberships sm
      on sm.school_id = a.school_id
     and sm.user_id = auth.uid()
     and sm.active = true
     and sm.role = 'teacher'
    where a.class_instance_id = p_class_id
      and a.teacher_user_id = auth.uid()
      and a.module_type = 'scenario'
      and a.module_id = p_scenario_id
      and a.is_active = true
      and a.archived_at is null
      and s.is_active = true
      and s.school_year = ci.school_year
      and ci.is_active = true
      and ci.status = 'active'
      and (a.scheduled_start_at is null or a.scheduled_start_at <= now())
      and (a.scheduled_end_at is null or a.scheduled_end_at > now())
  ) then
    raise exception 'Individuelle Auswertungen sind ausschließlich für zugewiesene Lehrkräfte freigegeben'
      using errcode = '42501';
  end if;

  -- Keep the existing exact module-assignment authorization as defense in depth.
  if not public.has_teacher_module_assignment(p_class_id, 'scenario', p_scenario_id) then
    raise exception 'Kein aktiver Modulauftrag für dieses Szenario in dieser Klasse'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.class_instance_memberships cim
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
$function$;

revoke all on function public.get_teacher_student_scenario_report_scoped_v1(uuid, uuid, uuid)
  from public, anon;
grant execute on function public.get_teacher_student_scenario_report_scoped_v1(uuid, uuid, uuid)
  to authenticated, service_role;
