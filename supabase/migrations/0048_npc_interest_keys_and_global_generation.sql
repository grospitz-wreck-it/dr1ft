-- ============================================================
-- DR1FT — NPC interest keys / global NPC generation
--
-- NPC interests use the same canonical catalog as player interests.
-- NPC profiles are generated globally; class-instance assignment
-- happens later through the NPC runtime/assignment layer.
-- ============================================================

alter table public.npc_profiles
  add column if not exists interest_keys text[] not null default '{}';

create index if not exists idx_npc_profiles_interest_keys
  on public.npc_profiles using gin (interest_keys);

alter table public.npc_generation_runs
  alter column class_instance_id drop not null;
