-- ============================================================
-- DR1FT — NPC Studio
--
-- NPCs are reusable world entities. They are not owned by one
-- scenario. A creator keeps a stable persona/voice and can be
-- linked into many scenarios and age-specific storylines.
--
-- AI is used at authoring time only. Runtime NPC conversations
-- remain deterministic, redaction-controlled reply trees.
-- ============================================================

alter table public.creators
  add column if not exists npc_category text not null default 'citizen',
  add column if not exists npc_role text not null default 'ambient',
  add column if not exists bio text,
  add column if not exists interest_tags text[] not null default '{}',
  add column if not exists age_bands text[] not null default '{}',
  add column if not exists story_role text,
  add column if not exists ai_identity jsonb not null default '{}',
  add column if not exists is_active boolean not null default true;

create index if not exists creators_npc_category_idx
  on public.creators (npc_category);

create index if not exists creators_npc_role_idx
  on public.creators (npc_role);

create index if not exists creators_interest_tags_gin_idx
  on public.creators using gin (interest_tags);

create index if not exists creators_age_bands_gin_idx
  on public.creators using gin (age_bands);

-- A reusable NPC can participate in multiple scenarios and can have
-- a different narrative role for each age band.
create table if not exists public.npc_story_links (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  story_arc_id uuid references public.story_arcs(id) on delete set null,
  age_band text not null,
  role_label text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_id, scenario_id, age_band)
);

create index if not exists npc_story_links_creator_idx
  on public.npc_story_links (creator_id);

create index if not exists npc_story_links_scenario_age_idx
  on public.npc_story_links (scenario_id, age_band);

-- A dialog is a concrete, age-specific conversation tree belonging
-- to one NPC and optionally one scenario/story arc.
create table if not exists public.npc_dialogs (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  scenario_id uuid references public.scenarios(id) on delete cascade,
  story_arc_id uuid references public.story_arcs(id) on delete set null,
  age_band text not null,
  title text not null,
  description text,
  root_content_item_id uuid references public.content_items(id) on delete set null,
  status content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists npc_dialogs_creator_idx
  on public.npc_dialogs (creator_id);

create index if not exists npc_dialogs_scenario_age_idx
  on public.npc_dialogs (scenario_id, age_band);

alter table public.content_items
  add column if not exists npc_dialog_id uuid references public.npc_dialogs(id) on delete cascade;

create index if not exists content_items_npc_dialog_idx
  on public.content_items (npc_dialog_id);

alter table public.npc_story_links enable row level security;
alter table public.npc_dialogs enable row level security;

create policy "authenticated read npc story links"
  on public.npc_story_links for select
  using (auth.role() = 'authenticated');

create policy "staff manage npc story links"
  on public.npc_story_links for all
  using (is_platform_staff());

create policy "authenticated read npc dialogs"
  on public.npc_dialogs for select
  using (auth.role() = 'authenticated');

create policy "staff manage npc dialogs"
  on public.npc_dialogs for all
  using (is_platform_staff());

-- Keep the existing creator RLS and add no new public write path.
-- NPC profile mutations remain staff-only through the existing
-- "staff manage creators" policy from 0008.
