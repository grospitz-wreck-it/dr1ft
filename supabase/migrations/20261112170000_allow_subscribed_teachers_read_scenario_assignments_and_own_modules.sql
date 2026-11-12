-- Allow subscribed subject teachers to see the class-level DR1FT scenario
-- assignment row that is created by add_class_instance_scenario_assignment().
-- This is SELECT-only; class-wide writes remain restricted to class managers.
drop policy if exists "subscribed teachers view instance scenario assignments"
  on public.class_instance_scenario_assignments;

create policy "subscribed teachers view instance scenario assignments"
on public.class_instance_scenario_assignments
for select
to authenticated
using (
  public.can_manage_class_scenario_assignments(class_instance_id)
  or exists (
    select 1
    from public.teacher_class_subscriptions tcs
    join public.school_memberships sm
      on sm.school_id = tcs.school_id
     and sm.user_id = auth.uid()
     and sm.active = true
     and sm.role = 'teacher'
    where tcs.class_instance_id = class_instance_scenario_assignments.class_instance_id
      and tcs.teacher_user_id = auth.uid()
      and tcs.is_active = true
  )
);

-- A creator must be able to read their own module row in order to assign it.
-- This grants no UPDATE/DELETE rights and does not expose other creators' drafts.
drop policy if exists "teacher_modules_creator_read_own"
  on public.teacher_modules;

create policy "teacher_modules_creator_read_own"
on public.teacher_modules
for select
to authenticated
using (created_by = auth.uid());
