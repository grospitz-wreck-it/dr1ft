-- ============================================================
-- DR1FT — Initiales Datenbankschema
-- Prinzipien: Content over Code, Engine-First, Human-in-the-Loop
-- ============================================================

-- ---------- ENUMS ----------

create type content_status as enum (
  'draft',        -- KI/Autor hat Entwurf erstellt
  'in_review',    -- wartet auf redaktionelle Prüfung
  'approved',     -- freigegeben, aber noch nicht live
  'live',         -- aktiv im Feed ausspielbar
  'archived',     -- zurückgezogen
  'rejected'      -- abgelehnt
);

create type content_type as enum (
  'post',
  'comment',
  'dm_message',
  'mission',
  'minigame',
  'reflection_prompt'
);

create type age_rating as enum (
  'all_ages',
  '12_plus',
  '16_plus'
);

create type creator_kind as enum (
  'npc',          -- simulierter Feed-Account
  'system'        -- Plattform-eigene Stimme (z.B. Reflexions-Hinweise)
);

-- ---------- SCENARIOS ----------
-- Ein Szenario bündelt Content zu einem Thema (z.B. "Online-Radikalisierung")

create table scenarios (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,               -- z.B. "online-radicalization"
  title text not null,
  description text,
  age_rating age_rating not null default '12_plus',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- COMPETENCIES ----------
-- Kompetenzen aus der Educational Philosophy (Critical Thinking, etc.)

create table competencies (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,               -- z.B. "critical_thinking"
  title text not null,
  description text
);

-- ---------- CREATORS ----------
-- Simulierte NPC-Accounts, die Content "posten"

create table creators (
  id uuid primary key default gen_random_uuid(),
  kind creator_kind not null default 'npc',
  display_name text not null,
  handle text unique not null,
  avatar_url text,
  persona jsonb not null default '{}',     -- Stil, Rhetorik-Muster, Glaubwürdigkeits-Score
  scenario_id uuid references scenarios(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- CONTENT ITEMS ----------
-- Zentrale Tabelle: Posts, Kommentare, DMs, Missionen, Minigames

create table content_items (
  id uuid primary key default gen_random_uuid(),
  type content_type not null,
  scenario_id uuid references scenarios(id) on delete cascade,
  creator_id uuid references creators(id) on delete set null,
  parent_id uuid references content_items(id) on delete cascade, -- z.B. Kommentar -> Post

  title text,
  body text,                               -- Text-Inhalt
  media_url text,                          -- Bild/Video (Supabase Storage)
  media_type text,                         -- 'image' | 'video' | null

  -- Manipulations-/Lern-Metadaten (flexibel, wächst ohne Schema-Änderung)
  manipulation_techniques text[] default '{}',   -- z.B. {'whataboutism','false_authority'}
  target_competencies uuid[] default '{}',       -- Referenzen auf competencies.id
  difficulty smallint check (difficulty between 1 and 5) default 1,
  age_rating age_rating not null default '12_plus',

  -- externe Quellenangaben (für real referenzierte, redaktionell geprüfte Inhalte)
  source_refs jsonb default '[]',          -- [{"label":"jugendschutz.net","url":"..."}]

  -- Freigabe-Workflow
  status content_status not null default 'draft',
  reviewed_by uuid,                        -- auth.users.id des Redakteurs
  reviewed_at timestamptz,
  review_notes text,

  extra jsonb not null default '{}',       -- Erweiterungsfeld für neue Contenttypen

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_content_items_status on content_items(status);
create index idx_content_items_scenario on content_items(scenario_id);
create index idx_content_items_type on content_items(type);

-- ---------- MISSIONS ----------
-- Strukturierte Lern-Einheiten, die mehrere Content-Items verknüpfen

create table missions (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid references scenarios(id) on delete cascade,
  slug text unique not null,
  title text not null,
  description text,
  trigger_condition jsonb default '{}',    -- Event-basiert, z.B. {"event":"PostViewed","count":3}
  reflection_content_id uuid references content_items(id),
  status content_status not null default 'draft',
  created_at timestamptz not null default now()
);

-- ---------- USER PROFILES ----------
-- (auth.users kommt von Supabase Auth; hier nur Zusatzdaten)

create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  birth_year int,                          -- für Altersfreigabe-Filterung, keine Speicherung genauer Geburtsdaten
  created_at timestamptz not null default now()
);

-- ---------- USER INTERACTIONS ----------
-- Jede Interaktion ist Lern-/Analyse-Datum (kein Punktesystem)

create table user_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_profiles(id) on delete cascade,
  content_item_id uuid references content_items(id) on delete cascade,
  interaction_type text not null,          -- 'view','like','share','report','ignore','comment'...
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create index idx_user_interactions_user on user_interactions(user_id);
create index idx_user_interactions_content on user_interactions(content_item_id);

-- ---------- USER COMPETENCY PROGRESS ----------
-- Wachstum statt Punkte: qualitative Evidenz statt Score-Only

create table user_competency_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_profiles(id) on delete cascade,
  competency_id uuid references competencies(id) on delete cascade,
  evidence jsonb default '[]',             -- Liste beobachteter Entscheidungen/Reflexionen
  level smallint check (level between 1 and 5) default 1,
  updated_at timestamptz not null default now(),
  unique (user_id, competency_id)
);

-- ---------- MISSION PROGRESS ----------

create table user_mission_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_profiles(id) on delete cascade,
  mission_id uuid references missions(id) on delete cascade,
  status text not null default 'started', -- 'started','completed'
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, mission_id)
);

-- ---------- ROW LEVEL SECURITY ----------

alter table content_items enable row level security;
alter table user_profiles enable row level security;
alter table user_interactions enable row level security;
alter table user_competency_progress enable row level security;
alter table user_mission_progress enable row level security;

-- Nur "live" Content ist für normale Nutzer sichtbar
create policy "public read live content"
  on content_items for select
  using (status = 'live');

-- Nutzer sehen/verwalten nur ihre eigenen Daten
create policy "users manage own profile"
  on user_profiles for all
  using (auth.uid() = id);

create policy "users manage own interactions"
  on user_interactions for all
  using (auth.uid() = user_id);

create policy "users manage own competency progress"
  on user_competency_progress for all
  using (auth.uid() = user_id);

create policy "users manage own mission progress"
  on user_mission_progress for all
  using (auth.uid() = user_id);

-- Redakteure (eigene Rolle über Supabase Custom Claims) verwalten allen Content
-- -> wird in einer separaten Migration ergänzt, sobald Rollen-System steht
