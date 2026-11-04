-- DR1FT security hardening phase 2
-- Separate class-level administration from school-lead visibility.
--
-- School leads may inspect school metadata, staff assignments and aggregate
-- counts through dedicated school-scoped policies/RPCs. They must not gain
-- class rosters or student-level learning/reporting data merely by holding
-- the school_lead role.

-- A teacher-level permission means an active teacher or school_admin
-- membership in this exact class instance. School-level school_lead is
-- intentionally excluded; school administrators retain access only when
-- assigned to the class or through explicitly scoped school-admin policies.
create or replace function public.is_teacher_of_class_instance(
  target_instance_id uuid
)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1
    from public.class_instance_memberships cim
    where cim.class_instance_id = target_instance_id
      and cim.user_id = (select auth.uid())
      and cim.role in ('teacher'::public.user_role, 'school_admin'::public.user_role)
      and cim.left_at is null
  );
$$;

revoke all privileges on function public.is_teacher_of_class_instance(uuid)
  from public, anon;
grant execute on function public.is_teacher_of_class_instance(uuid)
  to authenticated, service_role;

-- Remove the permissive policy that let every member read every membership
-- row in their class. A student's own membership remains readable. Assigned
-- teachers/school-admin class members may read the roster. School leads retain
-- only the separate staff-assignment policy introduced in phase 1.
drop policy if exists "members view instance memberships"
  on public.class_instance_memberships;
drop policy if exists "authenticated members view instance memberships"
  on public.class_instance_memberships;

create policy "users view own class instance memberships"
  on public.class_instance_memberships
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "assigned teachers view class instance memberships"
  on public.class_instance_memberships
  for select
  to authenticated
  using (public.is_teacher_of_class_instance(class_instance_id));

-- is_school_admin_of() intentionally includes school_lead for school
-- portal navigation. Do not reuse it for student membership visibility.
drop policy if exists "school admins view their school class memberships"
  on public.class_instance_memberships;

create policy "school admins view their school class memberships"
  on public.class_instance_memberships
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.class_instances ci
      join public.school_memberships sm on sm.school_id = ci.school_id
      where ci.id = class_instance_memberships.class_instance_id
        and sm.user_id = (select auth.uid())
        and sm.active = true
        and sm.role = 'school_admin'
    )
  );

comment on function public.is_teacher_of_class_instance(uuid) is
  'Returns true only for an active teacher or school_admin membership in the specified class instance. School-lead access is handled by separate school-scoped policies and aggregate RPCs.';
