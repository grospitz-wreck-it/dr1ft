-- ============================================================
-- DR1FT — Staff-Verwaltung: Schreibrechte für platform_admin
-- ============================================================

create or replace function is_platform_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from platform_staff
    where user_id = auth.uid() and role = 'platform_admin'
  );
$$;

create policy "platform admins manage staff"
  on platform_staff for all
  using (is_platform_admin());
