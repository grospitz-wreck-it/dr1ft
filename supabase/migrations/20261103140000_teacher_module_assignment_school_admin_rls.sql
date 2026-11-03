-- Fix assignment RLS for school-admin module publishing.
-- Use the canonical school_memberships row directly rather than depending on
-- a helper function whose policy evaluation may differ in this insert path.
-- Access is constrained to the same school as the target class and module.

drop policy if exists teacher_module_assignments_teacher_manage
  on public.teacher_module_class_assignments;

create policy teacher_module_assignments_teacher_manage
on public.teacher_module_class_assignments
for all
to authenticated
using (
  assigned_by = auth.uid()
  and exists (
    select 1
    from public.school_memberships sm
    join public.class_instances ci
      on ci.id = teacher_module_class_assignments.class_instance_id
     and ci.school_id = sm.school_id
    where sm.school_id = teacher_module_class_assignments.school_id
      and sm.user_id = auth.uid()
      and sm.active = true
      and sm.role = 'school_admin'
  )
)
with check (
  assigned_by = auth.uid()
  and exists (
    select 1
    from public.school_memberships sm
    join public.class_instances ci
      on ci.id = teacher_module_class_assignments.class_instance_id
     and ci.school_id = sm.school_id
    join public.teacher_modules tm
      on tm.id = teacher_module_class_assignments.module_id
     and tm.school_id = sm.school_id
    where sm.school_id = teacher_module_class_assignments.school_id
      and sm.user_id = auth.uid()
      and sm.active = true
      and sm.role = 'school_admin'
  )
);
