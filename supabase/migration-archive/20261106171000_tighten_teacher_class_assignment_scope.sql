-- Tighten teacher-class assignments against stale school memberships and bind class-teacher roles to their school.
create or replace function public.is_teacher_of_class_instance(target_instance_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select
    exists (
      select 1
      from public.class_instances ci
      join public.class_instance_memberships cim on cim.class_instance_id = ci.id
      join public.school_memberships sm
        on sm.school_id = ci.school_id
       and sm.user_id = cim.user_id
       and sm.active = true
       and sm.role = 'teacher'
      where ci.id = target_instance_id
        and cim.user_id = (select auth.uid())
        and cim.role::text = 'teacher'
        and cim.left_at is null
    )
    or exists (
      select 1
      from public.class_instance_teacher_roles ctr
      join public.class_instances ci
        on ci.id = ctr.class_instance_id
       and ci.school_id = ctr.school_id
      where ctr.class_instance_id = target_instance_id
        and ctr.teacher_user_id = (select auth.uid())
        and ctr.role = 'class_teacher'
        and ctr.is_active = true
    )
    or exists (
      select 1
      from public.class_instances ci
      join public.school_memberships sm on sm.school_id = ci.school_id
      where ci.id = target_instance_id
        and sm.user_id = (select auth.uid())
        and sm.active = true
        and sm.role in ('school_admin', 'school_lead')
    )
    or exists (
      select 1 from public.platform_staff ps
      where ps.user_id = (select auth.uid())
        and ps.role::text = 'platform_admin'
    )
    or exists (
      select 1
      from public.class_instance_memberships cim
      where cim.class_instance_id = target_instance_id
        and cim.user_id = (select auth.uid())
        and cim.role::text = 'school_admin'
        and cim.left_at is null
    );
$function$;

create or replace function public.can_access_class_dashboard(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select exists (
    select 1
    from public.class_instances ci
    where ci.id = p_class_id
      and (
        exists (
          select 1
          from public.class_instance_memberships cim
          join public.school_memberships sm
            on sm.school_id = ci.school_id
           and sm.user_id = cim.user_id
           and sm.active = true
           and sm.role = 'teacher'
          where cim.class_instance_id = ci.id
            and cim.user_id = (select auth.uid())
            and cim.role::text = 'teacher'
            and cim.left_at is null
        )
        or exists (
          select 1
          from public.teacher_class_subscriptions tcs
          join public.school_memberships sm
            on sm.school_id = ci.school_id
           and sm.user_id = tcs.teacher_user_id
           and sm.active = true
           and sm.role = 'teacher'
          where tcs.class_instance_id = ci.id
            and tcs.school_id = ci.school_id
            and tcs.school_year = ci.school_year
            and tcs.teacher_user_id = (select auth.uid())
            and tcs.is_active = true
        )
        or exists (
          select 1
          from public.class_instance_teacher_roles ctr
          where ctr.class_instance_id = ci.id
            and ctr.school_id = ci.school_id
            and ctr.teacher_user_id = (select auth.uid())
            and ctr.role = 'class_teacher'
            and ctr.is_active = true
        )
        or exists (
          select 1
          from public.school_memberships sm
          where sm.school_id = ci.school_id
            and sm.user_id = (select auth.uid())
            and sm.active = true
            and sm.role in ('school_admin', 'school_lead')
        )
        or exists (
          select 1
          from public.platform_staff ps
          where ps.user_id = (select auth.uid())
            and ps.role::text = 'platform_admin'
        )
      )
  );
$function$;

create or replace function public.can_manage_class_image(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select exists (
    select 1
    from public.class_instances ci
    where ci.id::text = split_part(object_name, '/', 1)
      and (
        exists (
          select 1
          from public.class_instance_memberships cim
          join public.school_memberships sm
            on sm.school_id = ci.school_id
           and sm.user_id = cim.user_id
           and sm.active = true
           and sm.role = 'teacher'
          where cim.class_instance_id = ci.id
            and cim.user_id = (select auth.uid())
            and cim.left_at is null
            and cim.role::text = 'teacher'
        )
        or exists (
          select 1
          from public.class_instance_teacher_roles ctr
          where ctr.class_instance_id = ci.id
            and ctr.school_id = ci.school_id
            and ctr.teacher_user_id = (select auth.uid())
            and ctr.role = 'class_teacher'
            and ctr.is_active = true
        )
        or exists (
          select 1
          from public.school_memberships sm
          where sm.school_id = ci.school_id
            and sm.user_id = (select auth.uid())
            and sm.active = true
            and sm.role in ('school_admin', 'school_lead')
        )
        or exists (
          select 1
          from public.platform_staff ps
          where ps.user_id = (select auth.uid())
            and ps.role::text = 'platform_admin'
        )
      )
  );
$function$;

create or replace function public.copy_student_to_class_instance(
  p_previous_instance_id uuid,
  p_new_instance_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_school_id uuid;
  v_target_school_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Nicht authentifiziert' using errcode = '28000';
  end if;

  if p_previous_instance_id is null or p_new_instance_id is null or p_user_id is null then
    raise exception 'Ungültige Klassen- oder Schülerzuordnung' using errcode = '22023';
  end if;

  select school_id into v_school_id
  from public.class_instances where id = p_previous_instance_id;

  select school_id into v_target_school_id
  from public.class_instances where id = p_new_instance_id;

  if v_school_id is null or v_target_school_id is null then
    raise exception 'Ausgangs- oder Zielklasse nicht gefunden' using errcode = 'P0002';
  end if;

  if not (
    exists (
      select 1
      from public.class_instance_memberships cim
      join public.school_memberships sm
        on sm.school_id = v_school_id
       and sm.user_id = cim.user_id
       and sm.active = true
       and sm.role = 'teacher'
      where cim.class_instance_id = p_previous_instance_id
        and cim.user_id = auth.uid()
        and cim.role::text = 'teacher'
        and cim.left_at is null
    )
    or exists (
      select 1
      from public.class_instance_teacher_roles ctr
      where ctr.class_instance_id = p_previous_instance_id
        and ctr.school_id = v_school_id
        and ctr.teacher_user_id = auth.uid()
        and ctr.role = 'class_teacher'
        and ctr.is_active = true
    )
    or exists (
      select 1
      from public.school_memberships sm
      where sm.school_id = v_school_id
        and sm.user_id = auth.uid()
        and sm.active = true
        and sm.role in ('school_admin', 'school_lead')
    )
    or exists (
      select 1
      from public.platform_staff ps
      where ps.user_id = auth.uid()
        and ps.role::text = 'platform_admin'
    )
  ) then
    raise exception 'Keine Berechtigung für diese Klasse' using errcode = '42501';
  end if;

  if v_school_id <> v_target_school_id or not exists (
    select 1
    from public.class_instances source
    join public.class_instances target
      on target.id = p_new_instance_id
     and target.previous_instance_id = source.id
     and target.school_id = source.school_id
    where source.id = p_previous_instance_id
  ) then
    raise exception 'Zielklasse gehört nicht zum angegebenen Schuljahreswechsel' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.class_instance_memberships learner
    where learner.class_instance_id = p_previous_instance_id
      and learner.user_id = p_user_id
      and learner.role::text = 'student'
      and learner.left_at is null
  ) then
    raise exception 'Die Person ist kein aktives Mitglied der Ausgangsklasse' using errcode = '42501';
  end if;

  insert into public.class_instance_memberships (class_instance_id, user_id, role)
  values (p_new_instance_id, p_user_id, 'student')
  on conflict (class_instance_id, user_id) do nothing;
end;
$function$;

-- A class membership alone is not enough if the teacher subscription was revoked.
create or replace function public.get_class_aggregate_learning_report_v1(p_class_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
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

  select ci.school_id, ci.school_year into v_school_id, v_school_year
  from public.class_instances ci
  where ci.id = p_class_id and ci.is_active = true;

  if v_school_id is null then
    raise exception 'Aktive Klasseninstanz nicht gefunden' using errcode = 'P0002';
  end if;

  select
    exists (
      select 1 from public.school_memberships sm
      where sm.school_id = v_school_id and sm.user_id = v_user
        and sm.active = true and sm.role in ('school_admin', 'school_lead')
    )
    or exists (
      select 1 from public.platform_staff ps
      where ps.user_id = v_user and ps.role::text = 'platform_admin'
    )
  into v_is_school_admin;

  select exists (
    select 1 from public.class_instance_teacher_roles ctr
    where ctr.class_instance_id = p_class_id and ctr.school_id = v_school_id
      and ctr.teacher_user_id = v_user
      and ctr.role = 'class_teacher' and ctr.is_active = true
  ) into v_is_class_teacher;

  select exists (
    select 1
    from public.teacher_class_subscriptions s
    join public.school_memberships sm
      on sm.school_id = s.school_id
     and sm.user_id = s.teacher_user_id
     and sm.active = true
     and sm.role = 'teacher'
    where s.class_instance_id = p_class_id
      and s.school_id = v_school_id
      and s.teacher_user_id = v_user
      and s.is_active = true
      and s.school_year = v_school_year
  ) into v_is_subscribed;

  if not (v_is_school_admin or v_is_class_teacher or v_is_subscribed) then
    raise exception 'Keine Berechtigung für das Klassenreporting' using errcode = '42501';
  end if;

  select count(*)::integer into v_total_students
  from public.class_instance_memberships cim
  where cim.class_instance_id = p_class_id
    and cim.role::text = 'student'
    and cim.left_at is null;

  with allowed_scenarios as (
    select distinct a.module_id as scenario_id
    from public.teacher_class_module_assignments a
    where a.class_instance_id = p_class_id
      and a.school_id = v_school_id
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
    from latest l
    join public.scenarios s on s.id = l.scenario_id
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
    'scope', case
      when v_is_school_admin then 'school_aggregate'
      when v_is_class_teacher then 'class_teacher_aggregate'
      else 'own_modules_aggregate'
    end
  );
end;
$function$;

revoke all on function public.can_access_class_dashboard(uuid) from public, anon;
grant execute on function public.can_access_class_dashboard(uuid) to authenticated;
