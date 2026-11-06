-- DR1FT: class creation and individual-report permissions
-- Teachers may not create first classes or follow-on classes.
-- Student promotion remains available to active class teachers.
-- Individual student reports are reserved for school leadership/admins.

create or replace function public.can_view_class_individual_reports(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    exists (
      select 1 from public.platform_staff ps
      where ps.user_id = auth.uid() and ps.role = 'platform_admin'
    )
    or exists (
      select 1
      from public.class_instances ci
      join public.school_memberships sm on sm.school_id = ci.school_id
      where ci.id = p_class_id
        and sm.user_id = auth.uid()
        and sm.active = true
        and sm.role in ('school_admin', 'school_lead')
    );
$$;

revoke all on function public.can_view_class_individual_reports(uuid) from public, anon;
grant execute on function public.can_view_class_individual_reports(uuid) to authenticated;

-- Follow-on class creation: admin roles only.
create or replace function public.create_next_class_instance(
  p_previous_instance_id uuid,
  p_name text,
  p_school_year text,
  p_access_code text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_new_id uuid;
  v_school_id uuid;
  v_grade_level int;
begin
  if auth.uid() is null then
    raise exception 'Nicht authentifiziert' using errcode = '42501';
  end if;

  select school_id, grade_level
    into v_school_id, v_grade_level
  from public.class_instances
  where id = p_previous_instance_id;

  if v_school_id is null then
    raise exception 'Ausgangsklasse nicht gefunden';
  end if;

  if not public.can_manage_school(v_school_id) then
    raise exception 'Nur Schuladmins, Schulleitung oder Plattformadmins dürfen Folgeklassen anlegen'
      using errcode = '42501';
  end if;

  insert into public.class_instances (
    school_id, name, grade_level, school_year, access_code,
    created_by, previous_instance_id
  )
  values (
    v_school_id, trim(p_name), v_grade_level + 1, p_school_year,
    upper(trim(p_access_code)), auth.uid(), p_previous_instance_id
  )
  returning id into v_new_id;

  -- Keep the existing staff assignments; the class creator is not
  -- automatically promoted to a teacher.
  insert into public.class_instance_memberships (class_instance_id, user_id, role)
  select v_new_id, user_id, role
  from public.class_instance_memberships
  where class_instance_id = p_previous_instance_id
    and role in ('teacher', 'school_admin')
    and left_at is null
  on conflict (class_instance_id, user_id) do nothing;

  return v_new_id;
end;
$$;

-- First-class creation through the legacy class table is also admin-only.
drop policy if exists "authenticated users can create own classes" on public.classes;
create policy "school admins create classes for their school"
on public.classes
for insert
to authenticated
with check (
  public.can_manage_school(school_id)
  and created_by = auth.uid()
);

-- The creator's legacy membership must reflect the admin role, not teacher.
drop policy if exists "class creators bootstrap their own teacher membership" on public.class_memberships;
create policy "school admins bootstrap their own admin membership"
on public.class_memberships
for insert
to authenticated
with check (
  user_id = auth.uid()
  and role = 'school_admin'::public.user_role
  and exists (
    select 1 from public.classes c
    where c.id = class_memberships.class_id
      and public.can_manage_school(c.school_id)
      and c.created_by = auth.uid()
  )
);

-- Rebuild legacy class -> class instance creation as admin-only.
create or replace function public.create_class_instance_from_class(
  p_class_id uuid,
  p_school_year text default '2026/27'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
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
    raise exception 'Klasse nicht gefunden oder keine Berechtigung'
      using errcode = '42501';
  end if;

  if not public.can_manage_school(v_class.school_id) then
    raise exception 'Nur Schuladmins, Schulleitung oder Plattformadmins dürfen Klassen anlegen'
      using errcode = '42501';
  end if;

  insert into public.class_instances (
    id, school_id, name, grade_level, school_year, access_code, created_by, is_active
  ) values (
    v_class.id, v_class.school_id, v_class.name, v_class.grade_level,
    p_school_year, v_class.access_code, auth.uid(), v_class.is_active
  )
  on conflict (id) do update set
    name = excluded.name,
    grade_level = excluded.grade_level,
    school_year = excluded.school_year,
    access_code = excluded.access_code,
    is_active = excluded.is_active;

  v_instance_id := v_class.id;

  insert into public.class_instance_memberships (class_instance_id, user_id, role)
  values (v_instance_id, auth.uid(), 'school_admin'::public.user_role)
  on conflict (class_instance_id, user_id) do update
    set role = excluded.role, left_at = null;

  return v_instance_id;
end;
$$;

-- Replace the teacher-only guard on RPCs that return per-student records.
do $$
declare
  fn_name text;
  fn_oid oid;
  fn_def text;
  old_guard text := 'if not public.is_teacher_of_class_instance(p_class_id) then';
  new_guard text := 'if not public.can_view_class_individual_reports(p_class_id) then';
begin
  foreach fn_name in array array[
    'get_class_student_competency_evidence',
    'get_class_student_competency_progress',
    'get_class_student_mission_progress',
    'get_class_student_learning_evidence_v1'
  ]
  loop
    select p.oid into fn_oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = fn_name
    order by p.oid desc limit 1;

    if fn_oid is null then
      raise exception 'Expected report RPC % was not found', fn_name;
    end if;

    fn_def := pg_get_functiondef(fn_oid);
    if position(old_guard in fn_def) = 0 then
      raise exception 'Expected authorization guard not found in %', fn_name;
    end if;
    fn_def := replace(fn_def, old_guard, new_guard);
    execute fn_def;
  end loop;
end;
$$;

-- Scoped scenario report: allow school leadership/admin of the same school,
-- while preserving exact teacher assignment checks for teachers.
do $$
declare
  fn_oid oid;
  fn_def text;
  old_teacher_check text := 'if not exists (';
  new_teacher_check text := 'if not public.can_view_class_individual_reports(p_class_id) and not exists (';
begin
  select p.oid into fn_oid
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'get_teacher_student_scenario_report_scoped_v1'
  order by p.oid desc limit 1;

  if fn_oid is null then
    raise exception 'Scoped scenario report RPC not found';
  end if;

  fn_def := pg_get_functiondef(fn_oid);
  if position('from public.teacher_class_module_assignments a' in fn_def) = 0 then
    raise exception 'Expected scoped teacher assignment check not found';
  end if;
  fn_def := replace(
    fn_def,
    old_teacher_check || E'\n    select 1\n    from public.teacher_class_module_assignments a',
    new_teacher_check || E'\n    select 1\n    from public.teacher_class_module_assignments a'
  );
  fn_def := replace(
    fn_def,
    'if not public.has_teacher_module_assignment(p_class_id, ''scenario'', p_scenario_id) then',
    'if not public.can_view_class_individual_reports(p_class_id) and not public.has_teacher_module_assignment(p_class_id, ''scenario'', p_scenario_id) then'
  );
  execute fn_def;
end;
$$;

-- Admin-only individual report persistence and retrieval.
drop policy if exists "teachers can manage own class reports" on public.teacher_reports;
create policy "school leadership manage individual class reports"
on public.teacher_reports
for all
to authenticated
using (public.can_view_class_individual_reports(class_instance_id))
with check (public.can_view_class_individual_reports(class_instance_id));
