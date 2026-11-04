-- School leadership has the same school-scoped module assignment rights
-- as school administration. Teachers remain limited to their own class.
-- Avoid querying teacher_modules here to prevent recursive RLS evaluation.

drop policy if exists teacher_module_assignments_teacher_manage
  on public.teacher_module_class_assignments;

create policy teacher_module_assignments_teacher_manage
on public.teacher_module_class_assignments
for all
to authenticated
using (
  assigned_by = auth.uid()
  and (
    exists (
      select 1
      from public.school_memberships sm
      join public.class_instances ci
        on ci.id = teacher_module_class_assignments.class_instance_id
       and ci.school_id = sm.school_id
      where sm.school_id = teacher_module_class_assignments.school_id
        and sm.user_id = auth.uid()
        and sm.active = true
        and sm.role in ('school_admin')
    )
    or exists (
      select 1
      from public.class_instance_memberships cim
      join public.class_instances ci
        on ci.id = cim.class_instance_id
       and ci.school_id = teacher_module_class_assignments.school_id
      where cim.class_instance_id = teacher_module_class_assignments.class_instance_id
        and cim.user_id = auth.uid()
        and cim.role = 'teacher'
        and cim.left_at is null
    )
  )
)
with check (
  assigned_by = auth.uid()
  and (
    exists (
      select 1
      from public.school_memberships sm
      join public.class_instances ci
        on ci.id = teacher_module_class_assignments.class_instance_id
       and ci.school_id = sm.school_id
      where sm.school_id = teacher_module_class_assignments.school_id
        and sm.user_id = auth.uid()
        and sm.active = true
        and sm.role in ('school_admin')
    )
    or exists (
      select 1
      from public.class_instance_memberships cim
      join public.class_instances ci
        on ci.id = cim.class_instance_id
       and ci.school_id = teacher_module_class_assignments.school_id
      where cim.class_instance_id = teacher_module_class_assignments.class_instance_id
        and cim.user_id = auth.uid()
        and cim.role = 'teacher'
        and cim.left_at is null
    )
  )
);
