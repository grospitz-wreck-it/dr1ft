-- School-managed external sign-in configuration.
-- Client secrets are encrypted by the application before they reach Postgres.
create table if not exists public.school_sso_connections (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  provider text not null check (provider in ('iserv')),
  issuer_url text not null,
  client_id text not null,
  secret_ciphertext text not null,
  secret_iv text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  unique (school_id, provider)
);

alter table public.school_sso_connections enable row level security;

drop policy if exists "school admins manage own SSO connections" on public.school_sso_connections;
create policy "school admins manage own SSO connections"
  on public.school_sso_connections
  for all to authenticated
  using (public.is_platform_admin() or public.is_school_admin_of(school_id))
  with check (public.is_platform_admin() or public.is_school_admin_of(school_id));

comment on table public.school_sso_connections is
  'School-specific SSO provider settings. Secret fields contain application-encrypted ciphertext and must never be returned to clients.';
