-- ============================================================
-- DR1FT — Actor editorial RLS
-- ============================================================

alter table if exists public.actor_profiles enable row level security;

drop policy if exists "staff manage actor profiles" on public.actor_profiles;
create policy "staff manage actor profiles"
  on public.actor_profiles for all
  using (is_platform_staff())
  with check (is_platform_staff());

-- Module assignments are editorial configuration. Keep the actor_id as the
-- canonical owner while npc_id remains the compatibility reference.
alter table if exists public.npc_module_assignments enable row level security;
drop policy if exists "staff manage actor module assignments" on public.npc_module_assignments;
create policy "staff manage actor module assignments"
  on public.npc_module_assignments for all
  using (is_platform_staff())
  with check (is_platform_staff());
