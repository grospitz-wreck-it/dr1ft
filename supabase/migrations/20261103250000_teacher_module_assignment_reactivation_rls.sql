-- Allow any currently authorized class teacher or school admin to
-- reactivate/manage a class assignment, even when another user originally
-- created that assignment. The tenant boundary is enforced through the
-- class instance's school_id and the current user's active membership.

drop policy if exists teacher_module_assignments_teacher_manage
  on public.teacher_module_class_assignments;

create policy teacher_module_assignments_teacher_manage
on public.teacher_module_class_assignments
for all
to authenticated
using (
  exists (
    select 1
    from public.class_instances ci
    join public.school_memberships sm
      on sm.school_id = ci.school_id
    where ci.id = teacher_module_class_assignments.class_instance_id
      and ci.school_id = teacher_module_class_assignments.school_id
      and sm.user_id = auth.uid()
      and sm.active = true
      and sm.role = 'school_admin'
  )
  or exists (
    select 1
    from public.class_instance_memberships cim
    where cim.class_instance_id = teacher_module_class_assignments.class_instance_id
      and cim.user_id = auth.uid()
      and cim.role = 'teacher'
      and cim.left_at is null
  )
)
with check (
  exists (
    select 1
    from public.class_instances ci
    join public.school_memberships sm
      on sm.school_id = ci.school_id
    where ci.id = teacher_module_class_assignments.class_instance_id
      and ci.school_id = teacher_module_class_assignments.school_id
      and sm.user_id = auth.uid()
      and sm.active = true
      and sm.role = 'school_admin'
  )
  or exists (
    select 1
    from public.class_instance_memberships cim
    where cim.class_instance_id = teacher_module_class_assignments.class_instance_id
      and cim.user_id = auth.uid()
      and cim.role = 'teacher'
      and cim.left_at is null
  )
);

notify pgrst, 'reload schema';
