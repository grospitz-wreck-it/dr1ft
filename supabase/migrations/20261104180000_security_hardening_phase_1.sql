-- DR1FT security hardening phase 1
-- Restrict the class-history view to authenticated callers and make it
-- obey the caller's RLS policies on the underlying membership tables.
-- The previous owner-rights view exposed every class membership row.

create or replace view public.student_class_history
with (security_invoker = true)
as
select
  cim.user_id,
  ci.id as class_instance_id,
  ci.school_id,
  ci.name as class_name,
  ci.grade_level,
  ci.school_year,
  cim.joined_at,
  cim.left_at
from public.class_instance_memberships cim
join public.class_instances ci
  on ci.id = cim.class_instance_id;

revoke all privileges on table public.student_class_history
  from public, anon, authenticated;

grant select on table public.student_class_history
  to authenticated, service_role;

comment on view public.student_class_history is
  'Class membership history exposed through invoker rights; underlying class_instance_memberships and class_instances RLS policies determine which rows the caller may see.';

-- These RPCs are internal bootstrap/runtime helpers. The supported callers
-- are SECURITY DEFINER membership triggers and trusted server-side code.
-- Browser clients must not be able to choose an arbitrary user_id and
-- class_instance_id to create progress or unlock missions.
revoke all privileges on function public.start_arc_for_user(uuid, uuid)
  from public, anon, authenticated;
revoke all privileges on function public.start_arc_for_user(uuid, uuid, uuid)
  from public, anon, authenticated;

revoke all privileges on function public.unlock_mission_for_user(uuid, uuid)
  from public, anon, authenticated;
revoke all privileges on function public.unlock_mission_for_user(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke all privileges on function public.unlock_mission_for_user(uuid, uuid, integer)
  from public, anon, authenticated;

grant execute on function public.start_arc_for_user(uuid, uuid)
  to service_role;
grant execute on function public.start_arc_for_user(uuid, uuid, uuid)
  to service_role;
grant execute on function public.unlock_mission_for_user(uuid, uuid)
  to service_role;
grant execute on function public.unlock_mission_for_user(uuid, uuid, uuid)
  to service_role;
grant execute on function public.unlock_mission_for_user(uuid, uuid, integer)
  to service_role;

comment on function public.start_arc_for_user(uuid, uuid, uuid) is
  'Internal class-instance arc bootstrap helper; not callable by browser roles.';
comment on function public.unlock_mission_for_user(uuid, uuid, uuid) is
  'Internal class-instance mission unlock helper; not callable by browser roles.';
