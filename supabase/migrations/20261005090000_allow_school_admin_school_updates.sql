-- Allow school administrators to persist school profile and branding changes.
-- Reads already exist via the school-admin SELECT policy; UPDATE must be
-- explicitly granted because the generic platform-admin policy is not enough.
drop policy if exists "school admins update own school" on public.schools;

create policy "school admins update own school" on public.schools
  for update
  to authenticated
  using (public.is_school_admin_of(id))
  with check (public.is_school_admin_of(id));
