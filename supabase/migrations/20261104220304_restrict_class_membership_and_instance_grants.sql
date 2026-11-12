-- Narrow direct browser access to class instances and memberships.
--
-- Class membership changes are performed only by trusted server-side flows:
-- - join_class_as_student (SECURITY DEFINER)
-- - create_class_instance_from_class (SECURITY DEFINER)
-- - create/manage student account Edge Functions (service_role)
-- - copy_student_to_class_instance (SECURITY DEFINER)
--
-- A generic "teachers manage instance memberships" ALL policy would let any
-- teacher add or promote arbitrary users to teacher/school_admin memberships.
-- Staff-to-class assignment must instead be handled by an explicitly
-- authorized school_admin/school_lead workflow.

drop policy if exists "teachers manage instance memberships"
  on public.class_instance_memberships;

drop policy if exists "members view instance memberships"
  on public.class_instance_memberships;

create policy "authenticated members view instance memberships"
  on public.class_instance_memberships
  for select
  to authenticated
  using (public.is_member_of_class_instance(class_instance_id));

-- School administrators retain visibility of all class memberships in
-- their own school through the existing dedicated SELECT policy.

revoke all privileges on table public.class_instance_memberships
  from public, anon, authenticated;

grant select on table public.class_instance_memberships
  to authenticated;

comment on table public.class_instance_memberships is
  'Class membership data. Browser roles have SELECT only; membership writes are performed through validated server-side workflows.';

-- Class instances are read by authenticated class members and school
-- administrators. Browser updates are limited to the exact fields used by
-- the teacher workspace; identity, school ownership, access codes and
-- predecessor links cannot be changed through the Data API.

drop policy if exists "members view their class instance"
  on public.class_instances;

create policy "authenticated members view their class instance"
  on public.class_instances
  for select
  to authenticated
  using (public.is_member_of_class_instance(id));

drop policy if exists "teachers manage class instances"
  on public.class_instances;

create policy "authorized staff update class instances"
  on public.class_instances
  for update
  to authenticated
  using (public.is_teacher_of_class_instance(id))
  with check (public.is_teacher_of_class_instance(id));

revoke all privileges on table public.class_instances
  from public, anon, authenticated;

grant select on table public.class_instances
  to authenticated;

grant update (
  name,
  grade_level,
  school_year,
  is_active,
  status,
  class_image_path,
  class_image_position_x,
  class_image_position_y,
  class_image_zoom
) on table public.class_instances
  to authenticated;

comment on table public.class_instances is
  'Class instance records. Authenticated users may read only rows allowed by RLS; authorized staff may update workspace fields only. Identity, school ownership, access codes, creator and predecessor links are not browser-editable.';
