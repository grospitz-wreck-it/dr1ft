-- Break the teacher_modules <-> teacher_module_class_assignments RLS cycle.
-- The helper is SECURITY DEFINER and reads only the ownership/subscription facts
-- needed for the creator's own class-share write path.
create or replace function public.can_teacher_manage_own_module_class_assignment(
  p_module_id uuid,
  p_class_instance_id uuid,
  p_school_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.teacher_modules tm
    join public.teacher_class_subscriptions s
      on s.class_instance_id = p_class_instance_id
     and s.school_id = p_school_id
     and s.teacher_user_id = auth.uid()
     and s.is_active = true
    join public.school_memberships sm
      on sm.school_id = p_school_id
     and sm.user_id = auth.uid()
     and sm.active = true
     and sm.role = 'teacher'
    join public.class_instances ci
      on ci.id = p_class_instance_id
     and ci.school_id = p_school_id
    where tm.id = p_module_id
      and tm.school_id = p_school_id
      and tm.created_by = auth.uid()
  );
$function$;

revoke all on function public.can_teacher_manage_own_module_class_assignment(uuid,uuid,uuid) from public;
grant execute on function public.can_teacher_manage_own_module_class_assignment(uuid,uuid,uuid) to authenticated;

drop policy if exists "school managers and assigned teachers manage teacher module cla"
  on public.teacher_module_class_assignments;

create policy "school managers and assigned teachers manage teacher module cla"
on public.teacher_module_class_assignments
for all
to authenticated
using (
  (
    public.can_manage_school(school_id)
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
  or public.can_teacher_manage_own_module_class_assignment(
    teacher_module_class_assignments.module_id,
    teacher_module_class_assignments.class_instance_id,
    teacher_module_class_assignments.school_id
  )
)
with check (
  (
    public.can_manage_school(school_id)
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
  or (
    public.can_teacher_manage_own_module_class_assignment(
      teacher_module_class_assignments.module_id,
      teacher_module_class_assignments.class_instance_id,
      teacher_module_class_assignments.school_id
    )
    and teacher_module_class_assignments.assigned_by = auth.uid()
  )
);
