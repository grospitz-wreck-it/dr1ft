-- Restore/extend the school administration layer on the current class-instance branch.
alter table public.schools
  add column if not exists street text,
  add column if not exists house_number text,
  add column if not exists postal_code text,
  add column if not exists city text,
  add column if not exists phone text,
  add column if not exists website text,
  add column if not exists school_type text,
  add column if not exists student_count integer,
  add column if not exists status text not null default 'active',
  add column if not exists plan text not null default 'free',
  add column if not exists funding_type text not null default 'none',
  add column if not exists internal_notes text,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists uq_schools_email_domain
  on public.schools(lower(email_domain))
  where email_domain is not null;

create table if not exists public.school_memberships (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('school_admin','school_lead','teacher')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (school_id,user_id)
);

alter table public.school_memberships enable row level security;
alter table public.schools enable row level security;

create or replace function public.is_school_admin_of(target_school_id uuid)
returns boolean language sql security definer stable set search_path=public
as $$
  select exists (
    select 1 from public.school_memberships sm
    where sm.school_id=target_school_id
      and sm.user_id=auth.uid()
      and sm.active
      and sm.role in ('school_admin','school_lead')
  );
$$;

create or replace function public.get_school_member_directory(p_school_id uuid)
returns table(id uuid,user_id uuid,email text,display_name text,role text,active boolean,created_at timestamptz)
language plpgsql security definer stable set search_path=public
as $$
begin
  if not public.is_platform_admin() and not public.is_school_admin_of(p_school_id) then
    raise exception 'Nicht berechtigt, diese Schule zu verwalten';
  end if;
  return query
  select sm.id,sm.user_id,au.email::text,up.display_name,sm.role,sm.active,sm.created_at
  from public.school_memberships sm
  join auth.users au on au.id=sm.user_id
  left join public.user_profiles up on up.id=sm.user_id
  where sm.school_id=p_school_id
  order by sm.active desc,sm.role,coalesce(up.display_name,au.email),sm.created_at;
end;
$$;

grant execute on function public.get_school_member_directory(uuid) to authenticated;

drop policy if exists "platform admins manage schools" on public.schools;
create policy "platform admins manage schools" on public.schools
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists "school admins view own school" on public.schools;
create policy "school admins view own school" on public.schools
  for select to authenticated using (public.is_school_admin_of(id));

drop policy if exists "platform admins manage school memberships" on public.school_memberships;
create policy "platform admins manage school memberships" on public.school_memberships
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists "school members view own school membership" on public.school_memberships;
create policy "school members view own school membership" on public.school_memberships
  for select using (user_id=auth.uid() or public.is_school_admin_of(school_id));

-- Teacher reports are retained as part of the school administration domain.
create table if not exists public.teacher_reports (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete set null,
  class_instance_id uuid not null references public.class_instances(id) on delete cascade,
  student_user_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null default 'Lernreport',
  status text not null default 'generated',
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.teacher_reports enable row level security;
create index if not exists idx_teacher_reports_class on public.teacher_reports(class_instance_id,created_at desc);
create index if not exists idx_teacher_reports_student on public.teacher_reports(student_user_id,created_at desc);
