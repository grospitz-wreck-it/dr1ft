-- DR1FT Teacher Workspace hardening
-- Forward-only migration. Existing rows are preserved.

-- Teachers must be able to resolve the school belonging to their class.
alter table public.schools enable row level security;

drop policy if exists "teachers view their school" on public.schools;
create policy "teachers view their school"
  on public.schools
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.class_instances ci
      join public.class_instance_memberships cim
        on cim.class_instance_id = ci.id
      where ci.school_id = schools.id
        and cim.user_id = auth.uid()
        and cim.left_at is null
        and cim.role in ('teacher', 'school_admin')
    )
  );

-- A class instance has one active module. If legacy data contains multiple
-- assignments, retain the most recently assigned one before adding the
-- database invariant.
delete from public.class_instance_scenario_assignments a
using public.class_instance_scenario_assignments b
where a.class_instance_id = b.class_instance_id
  and a.id <> b.id
  and (
    a.assigned_at < b.assigned_at
    or (a.assigned_at = b.assigned_at and a.id < b.id)
  );

create unique index if not exists uq_one_active_module_per_class_instance
  on public.class_instance_scenario_assignments(class_instance_id);

-- Teacher reports are kept as immutable-ish snapshots for later review.
create table if not exists public.teacher_reports (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete set null,
  class_instance_id uuid not null references public.class_instances(id) on delete cascade,
  student_user_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null default 'Lernreport',
  status text not null default 'generated' check (status in ('draft','generated','archived')),
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_teacher_reports_student
  on public.teacher_reports(student_user_id, created_at desc);

create index if not exists idx_teacher_reports_class
  on public.teacher_reports(class_instance_id, created_at desc);

alter table public.teacher_reports enable row level security;

drop policy if exists "teachers can manage own class reports" on public.teacher_reports;
create policy "teachers can manage own class reports"
  on public.teacher_reports
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.class_instance_memberships cim
      where cim.class_instance_id = teacher_reports.class_instance_id
        and cim.user_id = auth.uid()
        and cim.left_at is null
        and cim.role in ('teacher','school_admin')
    )
  )
  with check (
    exists (
      select 1
      from public.class_instance_memberships cim
      where cim.class_instance_id = teacher_reports.class_instance_id
        and cim.user_id = auth.uid()
        and cim.left_at is null
        and cim.role in ('teacher','school_admin')
    )
  );
