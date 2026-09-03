-- DR1FT — Global actors + module availability
-- Actors are global editorial entities; modules define availability.

alter table public.npc_profiles
  add column if not exists actor_type text not null default 'person';

alter table public.npc_profiles
  drop constraint if exists npc_profiles_actor_type_check;

alter table public.npc_profiles
  add constraint npc_profiles_actor_type_check
  check (actor_type in ('person','creator','news_outlet','brand','company','organization','community','bot'));

create table if not exists public.npc_module_assignments (
  id uuid primary key default gen_random_uuid(),
  npc_id uuid not null references public.npc_profiles(id) on delete cascade,
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (npc_id, scenario_id)
);

create index if not exists idx_npc_module_assignments_scenario
  on public.npc_module_assignments (scenario_id, npc_id);
create index if not exists idx_npc_module_assignments_npc
  on public.npc_module_assignments (npc_id, scenario_id);

alter table public.npc_module_assignments enable row level security;
drop policy if exists "npc module assignments readable" on public.npc_module_assignments;
create policy "npc module assignments readable" on public.npc_module_assignments for select using (true);

comment on table public.npc_module_assignments is 'Global actor availability per DR1FT module/scenario. No class-instance ownership.';
comment on column public.npc_profiles.actor_type is 'Role of the global digital-world actor.';
