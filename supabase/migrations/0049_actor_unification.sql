-- ============================================================
-- DR1FT — Actor Unification
--
-- Akteur = globale Identität/Weltentität.
-- NPC = autonom handelnder Akteur mit instanzgebundener Runtime.
--
-- Die bestehenden npc_* Runtime-Tabellen bleiben bewusst erhalten:
-- sie beschreiben Verhalten in einer laufenden Simulation, nicht die
-- Identität eines Akteurs. Die bisherige npc_profiles-Tabelle wird
-- deshalb in die neue kanonische actor_profiles-Tabelle überführt.
-- ============================================================

create table if not exists public.actor_profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  handle text not null,
  actor_type text not null default 'person',
  age integer,
  keywords text[] not null default '{}',
  context text not null default '',
  persona jsonb not null default '{}'::jsonb,
  voice jsonb not null default '{}'::jsonb,
  interests text[] not null default '{}',
  interest_keys text[] not null default '{}',
  is_active boolean not null default true,
  legacy_npc_id uuid,
  legacy_creator_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_actor_profiles_handle
  on public.actor_profiles(handle);
create unique index if not exists idx_actor_profiles_legacy_npc
  on public.actor_profiles(legacy_npc_id)
  where legacy_npc_id is not null;
create unique index if not exists idx_actor_profiles_legacy_creator
  on public.actor_profiles(legacy_creator_id)
  where legacy_creator_id is not null;
create index if not exists idx_actor_profiles_type
  on public.actor_profiles(actor_type);
create index if not exists idx_actor_profiles_interest_keys
  on public.actor_profiles using gin (interest_keys);

-- Bestehende NPC-Definitionen werden zu Akteuren. Die IDs bleiben stabil,
-- damit Runtime-/Content-Verknüpfungen ohne Datenverlust migriert werden können.
insert into public.actor_profiles (
  id, display_name, handle, actor_type, age, keywords, context, persona,
  voice, interests, interest_keys, is_active, legacy_npc_id, created_at, updated_at
)
select
  n.id,
  n.display_name,
  n.handle,
  coalesce(nullif(n.actor_type, ''), 'person'),
  n.age,
  n.keywords,
  n.context,
  n.persona,
  n.voice,
  n.interests,
  coalesce(n.interest_keys, '{}'),
  n.is_active,
  n.id,
  n.created_at,
  n.updated_at
from public.npc_profiles n
on conflict (id) do update set
  display_name = excluded.display_name,
  handle = excluded.handle,
  actor_type = excluded.actor_type,
  age = excluded.age,
  keywords = excluded.keywords,
  context = excluded.context,
  persona = excluded.persona,
  voice = excluded.voice,
  interests = excluded.interests,
  interest_keys = excluded.interest_keys,
  is_active = excluded.is_active,
  legacy_npc_id = excluded.legacy_npc_id,
  updated_at = excluded.updated_at;

-- Alte Creator-Accounts werden ebenfalls Akteure. Sie bleiben als Legacy-
-- Datensätze erhalten, damit bestehende Creator-Seiten/Content nicht brechen.
insert into public.actor_profiles (
  id, display_name, handle, actor_type, age, keywords, context, persona,
  voice, interests, interest_keys, is_active, legacy_creator_id, created_at, updated_at
)
select
  c.id,
  c.display_name,
  c.handle,
  'creator',
  null,
  '{}',
  '',
  coalesce(c.persona, '{}'),
  '{}',
  '{}',
  '{}',
  true,
  c.id,
  c.created_at,
  c.created_at
from public.creators c
where not exists (select 1 from public.actor_profiles a where a.id = c.id)
  and not exists (select 1 from public.actor_profiles a where a.legacy_creator_id = c.id);

alter table public.content_items
  add column if not exists actor_id uuid references public.actor_profiles(id) on delete set null;

create index if not exists idx_content_items_actor
  on public.content_items(actor_id, created_at desc);

-- Bestehende Creator-Inhalte werden dem entsprechenden Akteur zugeordnet.
update public.content_items ci
set actor_id = a.id
from public.actor_profiles a
where ci.actor_id is null
  and ci.creator_id is not null
  and a.legacy_creator_id = ci.creator_id;

-- Bereits generierte NPC-Inhalte tragen ihre NPC-ID im extra-Feld.
update public.content_items ci
set actor_id = a.id
from public.actor_profiles a
where ci.actor_id is null
  and ci.extra ->> 'npcId' is not null
  and a.legacy_npc_id::text = ci.extra ->> 'npcId';

-- Runtime bleibt NPC-Runtime: ein NPC ist jetzt ein Akteur, der autonom handelt.
alter table public.npc_instance_profiles
  add column if not exists actor_id uuid references public.actor_profiles(id) on delete cascade;

create index if not exists idx_npc_instance_profiles_actor
  on public.npc_instance_profiles(actor_id, class_instance_id);

update public.npc_instance_profiles r
set actor_id = a.id
from public.actor_profiles a
where r.actor_id is null
  and a.legacy_npc_id = r.npc_id;

alter table public.npc_social_interactions
  add column if not exists actor_id uuid references public.actor_profiles(id) on delete cascade;

create index if not exists idx_npc_social_interactions_actor
  on public.npc_social_interactions(actor_id, class_instance_id, created_at desc);

update public.npc_social_interactions si
set actor_id = r.actor_id
from public.npc_instance_profiles r
where si.actor_id is null
  and si.npc_instance_id = r.id
  and r.actor_id is not null;

-- Content-Select erlaubt weiterhin globale Inhalte und instanzgebundene Inhalte.
-- Akteur-Inhalte bekommen damit dieselbe Sichtbarkeitslogik wie bisher.
alter table public.actor_profiles enable row level security;
drop policy if exists "actor profiles readable" on public.actor_profiles;
create policy "actor profiles readable"
  on public.actor_profiles for select using (true);

-- Diese Spalten sind die neue kanonische Schnittstelle. Die alten IDs bleiben
-- zunächst als Kompatibilitätsschicht bestehen und werden in einer späteren
-- Bereinigungsmigration entfernt, sobald alle alten Creator-/NPC-Pfade umgestellt sind.
