-- Break the RLS recursion between teacher_modules and assignments.
-- The assignment trigger validate_teacher_module_class_assignment() already
-- enforces that module, class and assignment all share the same school_id.
-- Therefore this policy must not query teacher_modules: its SELECT policy
-- itself checks assignments and would recurse.

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
    where sm.school_id = teacher_module_class_assignments.school_id
      and sm.user_id = auth.uid()
      and sm.active = true
      and sm.role = 'school_admin'
  )
);
