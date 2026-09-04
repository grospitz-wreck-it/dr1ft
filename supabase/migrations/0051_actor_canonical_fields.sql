-- ============================================================
-- DR1FT — Actor canonical fields
-- ============================================================

-- Make the legacy profile migration safe on clean databases as well.
alter table if exists public.npc_profiles
  add column if not exists actor_type text not null default 'person';

-- Module assignments describe which modules an actor can participate in.
alter table if exists public.npc_module_assignments
  add column if not exists actor_id uuid references public.actor_profiles(id) on delete cascade;

create index if not exists idx_npc_module_assignments_actor
  on public.npc_module_assignments(actor_id, scenario_id);

update public.npc_module_assignments ma
set actor_id = a.id
from public.actor_profiles a
where ma.actor_id is null
  and a.legacy_npc_id = ma.npc_id;

-- Generation history also gets the canonical actor reference.
alter table if exists public.npc_generation_runs
  add column if not exists actor_id uuid references public.actor_profiles(id) on delete set null;

create index if not exists idx_npc_generation_runs_actor
  on public.npc_generation_runs(actor_id, created_at desc);

update public.npc_generation_runs gr
set actor_id = a.id
from public.actor_profiles a
where gr.actor_id is null
  and a.legacy_npc_id = gr.npc_id;

-- Keep new/edited legacy NPC records synchronized with the canonical actor.
create or replace function public.sync_npc_module_assignment_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.actor_id is null and new.npc_id is not null then
    select a.id into new.actor_id
    from public.actor_profiles a
    where a.legacy_npc_id = new.npc_id
    limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_npc_module_assignment_actor on public.npc_module_assignments;
create trigger trg_sync_npc_module_assignment_actor
before insert or update on public.npc_module_assignments
for each row execute function public.sync_npc_module_assignment_actor();

create or replace function public.sync_npc_generation_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.actor_id is null and new.npc_id is not null then
    select a.id into new.actor_id
    from public.actor_profiles a
    where a.legacy_npc_id = new.npc_id
    limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_npc_generation_actor on public.npc_generation_runs;
create trigger trg_sync_npc_generation_actor
before insert or update on public.npc_generation_runs
for each row execute function public.sync_npc_generation_actor();
