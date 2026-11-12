-- Snapshot completion feedback belongs to the scenario referenced by assignment_id.
-- scenario_assessment_snapshots intentionally has no scenario_id column.
create or replace function public.capture_scenario_completion_feedback_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_scenario_id uuid;
begin
  if new.completion_feedback is not null then return new; end if;

  select a.scenario_id into v_scenario_id
  from public.class_instance_scenario_assignments a
  where a.id = new.assignment_id;

  if v_scenario_id is null then
    raise exception 'Szenariozuordnung für Assessment-Snapshot nicht gefunden'
      using errcode = '23503';
  end if;

  select s.completion_feedback into new.completion_feedback
  from public.scenarios s where s.id = v_scenario_id;

  return new;
end;
$function$;

-- A subject teacher may publish their own class-scoped module to a class
-- they actively subscribe to. This does not grant access to other modules.
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
      where ci.id = class_instance_id and ci.school_id = school_id
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
    where s.id is not null
      and s.class_instance_id = teacher_module_class_assignments.class_instance_id
      and s.school_id = teacher_module_class_assignments.school_id
      and s.teacher_user_id = auth.uid()
      and s.is_active = true
  )
)
with check (
  (
    public.can_manage_school(school_id)
    and exists (
      select 1 from public.class_instances ci
      where ci.id = class_instance_id and ci.school_id = school_id
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