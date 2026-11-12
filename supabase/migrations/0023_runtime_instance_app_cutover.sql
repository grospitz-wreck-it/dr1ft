-- DR1FT: cut application runtime over to class instances.
-- Global scenarios/content remain reusable; runtime belongs to one instance.

alter table public.class_instance_scenario_assignments
  add column if not exists pacing_mode text not null default 'compact';

create or replace function is_teacher_of_class_instance(target_instance_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.class_instance_memberships cim
    where cim.class_instance_id = target_instance_id
      and cim.user_id = auth.uid()
      and cim.role in ('teacher', 'school_admin')
      and cim.left_at is null
  );
$$;

-- Creates the first instance for a legacy class. The legacy row remains for
-- backwards compatibility while the application moves to class_instances.
create or replace function create_class_instance_from_class(
  p_class_id uuid,
  p_school_year text default '2026/27'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class public.classes%rowtype;
  v_instance_id uuid;
begin
  select * into v_class
  from public.classes
  where id = p_class_id
    and created_by = auth.uid();

  if not found then
    raise exception 'Klasse nicht gefunden oder keine Berechtigung';
  end if;

  insert into public.class_instances (
    id, school_id, name, grade_level, school_year, access_code, created_by, is_active
  ) values (
    v_class.id, v_class.school_id, v_class.name, v_class.grade_level,
    p_school_year, v_class.access_code, v_class.created_by, v_class.is_active
  )
  on conflict (id) do update set
    name = excluded.name,
    grade_level = excluded.grade_level,
    school_year = excluded.school_year,
    access_code = excluded.access_code,
    is_active = excluded.is_active;

  v_instance_id := v_class.id;

  insert into public.class_instance_memberships (class_instance_id, user_id, role)
  values (v_instance_id, auth.uid(), 'teacher')
  on conflict (class_instance_id, user_id) do update
    set role = excluded.role, left_at = null;

  return v_instance_id;
end;
$$;

-- Ensure scenario assignments created by the current teacher are scoped to
-- the instance. Existing legacy assignments were already mirrored by 0022.
create or replace function upsert_class_instance_scenario_assignment(
  p_instance_id uuid,
  p_scenario_id uuid,
  p_pacing_mode text default 'compact'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_teacher_of_class_instance(p_instance_id) then
    raise exception 'Keine Berechtigung für diese Klasseninstanz';
  end if;

  insert into public.class_instance_scenario_assignments (
    class_instance_id, scenario_id, assigned_by, pacing_mode
  ) values (
    p_instance_id, p_scenario_id, auth.uid(), p_pacing_mode
  )
  on conflict (class_instance_id, scenario_id) do update
    set pacing_mode = excluded.pacing_mode;
end;
$$;

create or replace function remove_class_instance_scenario_assignment(
  p_instance_id uuid,
  p_scenario_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_teacher_of_class_instance(p_instance_id) then
    raise exception 'Keine Berechtigung für diese Klasseninstanz';
  end if;

  delete from public.class_instance_scenario_assignments
  where class_instance_id = p_instance_id
    and scenario_id = p_scenario_id;
end;
$$;

create or replace function update_class_instance_scenario_pacing(
  p_instance_id uuid,
  p_scenario_id uuid,
  p_pacing_mode text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_teacher_of_class_instance(p_instance_id) then
    raise exception 'Keine Berechtigung für diese Klasseninstanz';
  end if;

  update public.class_instance_scenario_assignments
  set pacing_mode = p_pacing_mode
  where class_instance_id = p_instance_id
    and scenario_id = p_scenario_id;
end;
$$;
