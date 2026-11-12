-- Allow subscribed subject teachers to add DR1FT scenarios to a class.
-- This is insert-only: editing, deactivating, scheduling and archiving remain restricted
-- to class teachers and school/platform leadership.

create or replace function public.add_class_instance_scenario_assignment(
  p_instance_id uuid,
  p_scenario_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Nicht authentifiziert' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.class_instances ci
    join public.school_memberships sm
      on sm.school_id = ci.school_id
     and sm.user_id = v_user
     and sm.active = true
     and sm.role = 'teacher'
    join public.teacher_class_subscriptions s
      on s.class_instance_id = ci.id
     and s.school_id = ci.school_id
     and s.school_year = ci.school_year
     and s.teacher_user_id = v_user
     and s.is_active = true
    where ci.id = p_instance_id
      and ci.is_active = true
      and ci.status = 'active'
  ) then
    raise exception 'Fachlehrkräfte müssen diese aktive Klasse abonniert haben' using errcode = '42501';
  end if;

  if not exists (select 1 from public.scenarios s where s.id = p_scenario_id) then
    raise exception 'Szenario nicht gefunden' using errcode = 'P0002';
  end if;

  insert into public.class_instance_scenario_assignments (
    class_instance_id, scenario_id, assigned_by, pacing_mode
  )
  values (p_instance_id, p_scenario_id, v_user, 'compact')
  on conflict (class_instance_id, scenario_id) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id
    from public.class_instance_scenario_assignments
    where class_instance_id = p_instance_id
      and scenario_id = p_scenario_id;
  end if;

  return v_id;
end;
$function$;

revoke all on function public.add_class_instance_scenario_assignment(uuid, uuid) from public, anon;
grant execute on function public.add_class_instance_scenario_assignment(uuid, uuid) to authenticated, service_role;