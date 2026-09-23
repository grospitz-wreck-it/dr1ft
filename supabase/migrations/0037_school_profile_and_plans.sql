-- ============================================================
-- DR1FT — School profile + commercial plan foundation
-- Keeps school identity in the existing schools table while
-- separating commercial plan from funding/sponsorship state.
-- ============================================================

alter table public.schools
  add column if not exists school_type text,
  add column if not exists student_count integer,
  add column if not exists status text not null default 'active',
  add column if not exists plan text not null default 'free',
  add column if not exists funding_type text not null default 'none',
  add column if not exists internal_notes text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.schools
  drop constraint if exists schools_student_count_check;

alter table public.schools
  add constraint schools_student_count_check
  check (student_count is null or student_count >= 0);

alter table public.schools
  drop constraint if exists schools_status_check;

alter table public.schools
  add constraint schools_status_check
  check (status in ('active', 'inactive', 'suspended'));

alter table public.schools
  drop constraint if exists schools_plan_check;

alter table public.schools
  add constraint schools_plan_check
  check (plan in ('free', 'starter', 'school', 'growth', 'enterprise'));

alter table public.schools
  drop constraint if exists schools_funding_type_check;

alter table public.schools
  add constraint schools_funding_type_check
  check (funding_type in ('none', 'sponsored', 'grant'));

create index if not exists idx_schools_plan on public.schools(plan);
create index if not exists idx_schools_status on public.schools(status);
create index if not exists idx_schools_school_type on public.schools(school_type);

-- Platform admins may update the school profile. Existing read/manage policy
-- from the school administration RLS migration remains the authority.
drop policy if exists "platform admins update schools" on public.schools;
create policy "platform admins update schools"
  on public.schools
  for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
