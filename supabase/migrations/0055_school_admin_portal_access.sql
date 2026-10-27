-- ============================================================
-- DR1FT — School-admin read access
-- Allows active school admins/leads to open their own school portal.
-- Platform-admin access remains unchanged.
-- ============================================================

drop policy if exists "school admins view own school" on public.schools;

create policy "school admins view own school"
  on public.schools
  for select
  to authenticated
  using (public.is_school_admin_of(id));
