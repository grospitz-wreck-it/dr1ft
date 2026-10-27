-- ============================================================
-- DR1FT — School Administration RLS
-- Platform admins may manage schools and school memberships.
-- School admins/leads remain scoped to their own school.
-- ============================================================

-- ------------------------------------------------------------
-- SCHOOLS
-- ------------------------------------------------------------

drop policy if exists "platform admins manage schools"
  on public.schools;

create policy "platform admins manage schools"
  on public.schools
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());


-- ------------------------------------------------------------
-- SCHOOL MEMBERSHIPS
-- ------------------------------------------------------------

drop policy if exists "platform admins manage school memberships"
  on public.school_memberships;

create policy "platform admins manage school memberships"
  on public.school_memberships
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());


-- ------------------------------------------------------------
-- SCHOOL ADMIN / LEAD
-- ------------------------------------------------------------
-- Keep the existing self/own-school SELECT behaviour.
-- Platform admins are handled by the policy above.
