-- Align module authorization across school and class roles.
-- School admins/leads can manage modules for classes in their own school.
-- A directly assigned class manager can create a module even when no
-- school_memberships row exists (legacy/imported class memberships).

drop function if exists public.upsert_class_instance_scenario_assignment(uuid, uuid, text);

create function public.upsert_class_instance_scenario_assignment(
  p_instance_id uuid,
  p_scenario_id uuid,
  p_pacing_mode text default 'compact'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_school_id uuid;
  v_authorized boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Nicht authentifiziert';
  end if;

  if p_pacing_mode not in ('compact', 'as_designed') then
    raise exception 'Ungültiger Pacing-Modus';
  end if;

  select ci.school_id into v_school_id
  from public.class_instances ci
  where ci.id = p_instance_id;

  if v_school_id is null then
    raise exception 'Klasseninstanz nicht gefunden';
  end if;

  select exists (
    select 1
    from public.school_memberships sm
    where sm.school_id = v_school_id
      and sm.user_id = auth.uid()
      and sm.active = true
      and sm.role in ('school_admin')
  ) or exists (
    select 1
    from public.class_instance_memberships cim
    where cim.class_instance_id = p_instance_id
      and cim.user_id = auth.uid()
      and cim.left_at is null
      and cim.role in ('teacher', 'school_admin')
  )
  into v_authorized;

  if not v_authorized then
    raise exception 'Keine Berechtigung für diese Klasseninstanz';
  end if;

  delete from public.class_instance_scenario_assignments
  where class_instance_id = p_instance_id
    and scenario_id <> p_scenario_id;

  insert into public.class_instance_scenario_assignments (
    class_instance_id, scenario_id, assigned_by, pacing_mode
  )
  values (
    p_instance_id, p_scenario_id, auth.uid(), p_pacing_mode
  )
  on conflict (class_instance_id, scenario_id)
  do update set
    assigned_by = excluded.assigned_by,
    assigned_at = now(),
    pacing_mode = excluded.pacing_mode
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.upsert_class_instance_scenario_assignment(uuid, uuid, text) to authenticated;

-- Let directly assigned class managers create their own modules, even if
-- their account has no separate school_memberships row.
drop policy if exists teacher_modules_creator_manage on public.teacher_modules;
create policy teacher_modules_creator_manage
on public.teacher_modules
for all
to authenticated
using (
  created_by = auth.uid()
  and (
    exists (
      select 1
      from public.school_memberships sm
      where sm.school_id = teacher_modules.school_id
        and sm.user_id = auth.uid()
        and sm.active = true
        and sm.role in ('teacher', 'school_admin')
    )
    or exists (
      select 1
      from public.class_instance_memberships cim
      join public.class_instances ci on ci.id = cim.class_instance_id
      where ci.school_id = teacher_modules.school_id
        and cim.user_id = auth.uid()
        and cim.left_at is null
        and cim.role in ('teacher', 'school_admin')
    )
  )
)
with check (
  created_by = auth.uid()
  and (
    exists (
      select 1
      from public.school_memberships sm
      where sm.school_id = teacher_modules.school_id
        and sm.user_id = auth.uid()
        and sm.active = true
        and sm.role in ('teacher', 'school_admin')
    )
    or exists (
      select 1
      from public.class_instance_memberships cim
      join public.class_instances ci on ci.id = cim.class_instance_id
      where ci.school_id = teacher_modules.school_id
        and cim.user_id = auth.uid()
        and cim.left_at is null
        and cim.role in ('teacher', 'school_admin')
    )
  )
);

-- Class teachers and school managers can read assigned published modules.
drop policy if exists teacher_modules_assigned_class_read on public.teacher_modules;
create policy teacher_modules_assigned_class_read
on public.teacher_modules
for select
to authenticated
using (
  status = 'published'
  and (
    public.is_school_admin_of(teacher_modules.school_id)
    or exists (
      select 1
      from public.teacher_module_class_assignments a
      join public.class_instance_memberships cim on cim.class_instance_id = a.class_instance_id
      where a.module_id = teacher_modules.id
        and a.is_active = true
        and cim.user_id = auth.uid()
        and cim.left_at is null
    )
  )
);

-- School admins/leads may manage assignments for classes in their own school.
drop policy if exists school_managers_manage_class_scenario_assignments
  on public.class_instance_scenario_assignments;
create policy school_managers_manage_class_scenario_assignments
on public.class_instance_scenario_assignments
for all
to authenticated
using (
  exists (
    select 1
    from public.class_instances ci
    join public.school_memberships sm on sm.school_id = ci.school_id
    where ci.id = class_instance_scenario_assignments.class_instance_id
      and sm.user_id = auth.uid()
      and sm.active = true
      and sm.role in ('school_admin')
  )
)
with check (
  exists (
    select 1
    from public.class_instances ci
    join public.school_memberships sm on sm.school_id = ci.school_id
    where ci.id = class_instance_scenario_assignments.class_instance_id
      and sm.user_id = auth.uid()
      and sm.active = true
      and sm.role in ('school_admin')
  )
);
