-- DR1FT — school-scoped adult identity and report metadata
-- Teacher accounts are provisioned by administration; public teacher signup is disabled.

alter table public.schools
  add column if not exists email_domain text;

create unique index if not exists uq_schools_email_domain
  on public.schools(lower(email_domain))
  where email_domain is not null;

create table if not exists public.school_memberships (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('school_admin', 'school_lead', 'teacher')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (school_id, user_id)
);

create index if not exists idx_school_memberships_user on public.school_memberships(user_id);
create index if not exists idx_school_memberships_school on public.school_memberships(school_id);

alter table public.school_memberships enable row level security;

create or replace function public.is_school_admin_of(target_school_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.school_memberships sm
    where sm.school_id = target_school_id
      and sm.user_id = auth.uid()
      and sm.active = true
      and sm.role in ('school_admin', 'school_lead')
  );
$$;

drop policy if exists "school members view own school membership" on public.school_memberships;
create policy "school members view own school membership"
  on public.school_memberships for select
  using (user_id = auth.uid() or public.is_school_admin_of(school_id));

create table if not exists public.teacher_reports (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete set null,
  class_instance_id uuid not null references public.class_instances(id) on delete cascade,
  student_user_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null default 'Lernreport',
  status text not null default 'generated' check (status in ('draft', 'generated', 'archived')),
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_teacher_reports_student on public.teacher_reports(student_user_id, created_at desc);
create index if not exists idx_teacher_reports_class on public.teacher_reports(class_instance_id, created_at desc);

alter table public.teacher_reports enable row level security;

create or replace function public.is_teacher_or_admin_of_class_instance(target_instance_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.class_instance_memberships cim
    where cim.class_instance_id = target_instance_id
      and cim.user_id = auth.uid()
      and cim.left_at is null
      and cim.role in ('teacher', 'school_admin')
  );
$$;

create policy "teachers can manage own class reports"
  on public.teacher_reports for all
  using (public.is_teacher_or_admin_of_class_instance(class_instance_id))
  with check (public.is_teacher_or_admin_of_class_instance(class_instance_id));
