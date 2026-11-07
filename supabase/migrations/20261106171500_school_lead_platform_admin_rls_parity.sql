-- RLS parity for school_lead and platform_admin on school/class administration surfaces.

drop policy if exists "school admins update class instances" on public.class_instances;
create policy "school managers update class instances"
on public.class_instances
for update
to authenticated
using (public.can_manage_school(class_instances.school_id))
with check (public.can_manage_school(class_instances.school_id));

drop policy if exists "platform admins view all class instances" on public.class_instances;
create policy "platform admins view all class instances"
on public.class_instances
for select
to authenticated
using (public.is_platform_admin());

drop policy if exists "school admins update own school" on public.schools;
create policy "school managers update own school"
on public.schools
for update
to authenticated
using (public.can_manage_school(schools.id))
with check (public.can_manage_school(schools.id));

drop policy if exists "school admins view own school" on public.schools;
create policy "school managers view own school"
on public.schools
for select
to authenticated
using (public.can_manage_school(schools.id));

drop policy if exists "teacher_module_assignments_teacher_manage" on public.teacher_module_class_assignments;
create policy "school managers and assigned teachers manage teacher module class assignments"
on public.teacher_module_class_assignments
for all
to authenticated
using (
  (
    public.can_manage_school(teacher_module_class_assignments.school_id)
    and exists (
      select 1
      from public.class_instances ci
      where ci.id = teacher_module_class_assignments.class_instance_id
        and ci.school_id = teacher_module_class_assignments.school_id
    )
  )
  or exists (
    select 1
    from public.class_instance_memberships cim
    join public.school_memberships sm
      on sm.school_id = teacher_module_class_assignments.school_id
     and sm.user_id = cim.user_id
     and sm.active = true
     and sm.role = 'teacher'
    where cim.class_instance_id = teacher_module_class_assignments.class_instance_id
      and cim.user_id = auth.uid()
      and cim.role::text = 'teacher'
      and cim.left_at is null
  )
)
with check (
  (
    public.can_manage_school(teacher_module_class_assignments.school_id)
    and exists (
      select 1
      from public.class_instances ci
      where ci.id = teacher_module_class_assignments.class_instance_id
        and ci.school_id = teacher_module_class_assignments.school_id
    )
  )
  or exists (
    select 1
    from public.class_instance_memberships cim
    join public.school_memberships sm
      on sm.school_id = teacher_module_class_assignments.school_id
     and sm.user_id = cim.user_id
     and sm.active = true
     and sm.role = 'teacher'
    where cim.class_instance_id = teacher_module_class_assignments.class_instance_id
      and cim.user_id = auth.uid()
      and cim.role::text = 'teacher'
      and cim.left_at is null
  )
);

drop policy if exists "class_instance_teacher_roles_school_admin_manage" on public.class_instance_teacher_roles;
create policy "school and platform admins manage class teacher roles"
on public.class_instance_teacher_roles
for all
to authenticated
using (
  public.can_manage_school(class_instance_teacher_roles.school_id)
)
with check (
  public.can_manage_school(class_instance_teacher_roles.school_id)
  and exists (
    select 1
    from public.class_instances ci
    join public.school_memberships teacher_sm
      on teacher_sm.school_id = ci.school_id
    where ci.id = class_instance_teacher_roles.class_instance_id
      and ci.school_id = class_instance_teacher_roles.school_id
      and teacher_sm.user_id = class_instance_teacher_roles.teacher_user_id
      and teacher_sm.active = true
      and teacher_sm.role = 'teacher'
  )
);

drop policy if exists "class_instance_teacher_roles_school_admin_read" on public.class_instance_teacher_roles;
create policy "class and school admins read class teacher roles"
on public.class_instance_teacher_roles
for select
to authenticated
using (
  class_instance_teacher_roles.teacher_user_id = auth.uid()
  or public.can_manage_school(class_instance_teacher_roles.school_id)
);
