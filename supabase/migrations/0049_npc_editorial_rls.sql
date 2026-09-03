-- ============================================================
-- DR1FT — NPC Generator: editorial write policies
--
-- NPC profiles are global editorial definitions. The editorial
-- generator uses the authenticated Supabase session, so writes must
-- be explicitly allowed for platform staff.
-- ============================================================

alter table public.npc_profiles enable row level security;
alter table public.npc_module_assignments enable row level security;
alter table public.npc_generation_runs enable row level security;

drop policy if exists "staff manage npc profiles" on public.npc_profiles;
create policy "staff manage npc profiles"
on public.npc_profiles
for all
using (is_platform_staff())
with check (is_platform_staff());

drop policy if exists "staff manage npc module assignments" on public.npc_module_assignments;
create policy "staff manage npc module assignments"
on public.npc_module_assignments
for all
using (is_platform_staff())
with check (is_platform_staff());

drop policy if exists "staff manage npc generation runs" on public.npc_generation_runs;
create policy "staff manage npc generation runs"
on public.npc_generation_runs
for all
using (is_platform_staff())
with check (is_platform_staff());
