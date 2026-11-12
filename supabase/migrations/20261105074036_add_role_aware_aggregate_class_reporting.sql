
create or replace function public.get_class_aggregate_learning_report_v1(p_class_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_school_id uuid;
  v_school_year text;
  v_is_school_admin boolean := false;
  v_is_class_teacher boolean := false;
  v_is_subscribed boolean := false;
  v_total_students integer := 0;
  v_participating_students integer := 0;
  v_response_count integer := 0;
  v_success_count integer := 0;
  v_partial_count integer := 0;
  v_not_yet_count integer := 0;
  v_modules jsonb := '[]'::jsonb;
begin
  if v_user is null then
    raise exception 'Anmeldung erforderlich' using errcode = '42501';
  end if;

  select ci.school_id, ci.school_year
    into v_school_id, v_school_year
  from public.class_instances ci
  where ci.id = p_class_id and ci.is_active = true;

  if v_school_id is null then
    raise exception 'Aktive Klasseninstanz nicht gefunden' using errcode = 'P0002';
  end if;

  select exists (
    select 1 from public.school_memberships sm
    where sm.school_id = v_school_id and sm.user_id = v_user
      and sm.active = true and sm.role in ('school_admin','school_lead')
  ) into v_is_school_admin;

  select exists (
    select 1 from public.class_instance_teacher_roles ctr
    where ctr.class_instance_id = p_class_id and ctr.teacher_user_id = v_user
      and ctr.role = 'class_teacher' and ctr.is_active = true
  ) into v_is_class_teacher;

  select exists (
    select 1 from public.teacher_class_subscriptions s
    where s.class_instance_id = p_class_id and s.teacher_user_id = v_user
      and s.is_active = true and s.school_year = v_school_year
  ) into v_is_subscribed;

  if not (v_is_school_admin or v_is_class_teacher or v_is_subscribed) then
    raise exception 'Keine Berechtigung für das Klassenreporting' using errcode = '42501';
  end if;

  select count(*)::integer into v_total_students
  from public.class_instance_memberships cim
  where cim.class_instance_id = p_class_id and cim.role::text = 'student' and cim.left_at is null;

  with allowed_scenarios as (
    select distinct a.module_id as scenario_id
    from public.teacher_class_module_assignments a
    where a.class_instance_id = p_class_id
      and a.school_year = v_school_year
      and a.module_type = 'scenario'
      and a.is_active = true
      and a.archived_at is null
      and (
        v_is_school_admin or v_is_class_teacher
        or a.teacher_user_id = v_user
      )
  ),
  latest as (
    select distinct on (r.user_id, r.scenario_id, r.card_id)
      r.user_id, r.scenario_id, r.outcome
    from public.scenario_learning_card_responses r
    join allowed_scenarios a on a.scenario_id = r.scenario_id
    where r.class_instance_id = p_class_id
    order by r.user_id, r.scenario_id, r.card_id, r.occurred_at desc, r.id desc
  ),
  totals as (
    select count(*)::integer as response_count,
      count(*) filter (where outcome = 'success')::integer as success_count,
      count(*) filter (where outcome = 'partial')::integer as partial_count,
      count(*) filter (where outcome = 'not_yet')::integer as not_yet_count,
      count(distinct user_id)::integer as participating_students
    from latest
  ),
  per_module as (
    select l.scenario_id, s.title,
      count(*)::integer as responses,
      count(distinct l.user_id)::integer as participants,
      count(*) filter (where l.outcome = 'success')::integer as success,
      count(*) filter (where l.outcome = 'partial')::integer as partial,
      count(*) filter (where l.outcome = 'not_yet')::integer as not_yet
    from latest l join public.scenarios s on s.id = l.scenario_id
    group by l.scenario_id, s.title
  )
  select t.response_count, t.success_count, t.partial_count, t.not_yet_count,
         t.participating_students,
         coalesce((select jsonb_agg(jsonb_build_object(
           'scenario_id', m.scenario_id,
           'title', m.title,
           'responses', m.responses,
           'participants', m.participants,
           'success', m.success,
           'partial', m.partial,
           'not_yet', m.not_yet
         ) order by m.title) from per_module m), '[]'::jsonb)
    into v_response_count, v_success_count, v_partial_count, v_not_yet_count,
         v_participating_students, v_modules
  from totals t;

  return jsonb_build_object(
    'class_id', p_class_id,
    'total_students', v_total_students,
    'participating_students', v_participating_students,
    'response_count', v_response_count,
    'success_count', v_success_count,
    'partial_count', v_partial_count,
    'not_yet_count', v_not_yet_count,
    'modules', v_modules,
    'scope', case when v_is_school_admin then 'school_aggregate'
                  when v_is_class_teacher then 'class_teacher_aggregate'
                  else 'own_modules_aggregate' end
  );
end;
$$;

revoke all on function public.get_class_aggregate_learning_report_v1(uuid) from public, anon;
grant execute on function public.get_class_aggregate_learning_report_v1(uuid) to authenticated;

