-- Let subscribed subject teachers read the class-share rows that make a
-- class-scoped teacher module visible in the library. The prior policy only
-- recognized class_instance_memberships, while subscriptions are separate.
drop policy if exists "teacher_module_assignments_members_read"
on public.teacher_module_class_assignments;

create policy "teacher_module_assignments_members_read"
on public.teacher_module_class_assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.class_instance_memberships cim
    where cim.class_instance_id = teacher_module_class_assignments.class_instance_id
      and cim.user_id = auth.uid()
      and cim.left_at is null
  )
  or exists (
    select 1
    from public.teacher_class_subscriptions s
    join public.school_memberships sm
      on sm.school_id = s.school_id
     and sm.user_id = auth.uid()
     and sm.active = true
     and sm.role = 'teacher'
    where s.class_instance_id = teacher_module_class_assignments.class_instance_id
      and s.school_id = teacher_module_class_assignments.school_id
      and s.teacher_user_id = auth.uid()
      and s.is_active = true
  )
  or public.can_manage_school(school_id)
);

-- Recreate the management policy with an explicitly qualified school match.
drop policy if exists "school managers and assigned teachers manage teacher module cla"
on public.teacher_module_class_assignments;

create policy "school managers and assigned teachers manage teacher module cla"
on public.teacher_module_class_assignments
for all
to authenticated
using (
  (
    public.can_manage_school(teacher_module_class_assignments.school_id)
    and exists (
      select 1 from public.class_instances ci
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
  or exists (
    select 1
    from public.teacher_class_subscriptions s
    join public.teacher_modules tm
      on tm.id = teacher_module_class_assignments.module_id
     and tm.school_id = s.school_id
     and tm.created_by = auth.uid()
    join public.school_memberships sm
      on sm.school_id = s.school_id
     and sm.user_id = auth.uid()
     and sm.active = true
     and sm.role = 'teacher'
    where s.class_instance_id = teacher_module_class_assignments.class_instance_id
      and s.school_id = teacher_module_class_assignments.school_id
      and s.teacher_user_id = auth.uid()
      and s.is_active = true
  )
)
with check (
  (
    public.can_manage_school(teacher_module_class_assignments.school_id)
    and exists (
      select 1 from public.class_instances ci
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
  or exists (
    select 1
    from public.teacher_class_subscriptions s
    join public.teacher_modules tm
      on tm.id = teacher_module_class_assignments.module_id
     and tm.school_id = s.school_id
     and tm.created_by = auth.uid()
    join public.school_memberships sm
      on sm.school_id = s.school_id
     and sm.user_id = auth.uid()
     and sm.active = true
     and sm.role = 'teacher'
    where s.class_instance_id = teacher_module_class_assignments.class_instance_id
      and s.school_id = teacher_module_class_assignments.school_id
      and s.teacher_user_id = auth.uid()
      and s.is_active = true
      and teacher_module_class_assignments.assigned_by = auth.uid()
  )
);