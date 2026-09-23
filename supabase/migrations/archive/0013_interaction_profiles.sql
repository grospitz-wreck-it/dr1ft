-- ============================================================
-- DR1FT — Interaction Profile Catalog
-- Redaktion definiert Interaktions-Defaults einmal zentral.
-- Konkrete Content-Items können diese Defaults optional überschreiben.
-- ============================================================

create table interaction_profiles (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  label text not null,
  description text,
  interaction_type text not null,
  dimensions jsonb not null default '{}',
  default_consequence jsonb not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table content_items
  add column interaction_profile_id uuid references interaction_profiles(id) on delete set null,
  add column interaction_overrides jsonb not null default '{}';

create index idx_content_items_interaction_profile on content_items(interaction_profile_id);

alter table interaction_profiles enable row level security;

create policy "authenticated read interaction profiles"
  on interaction_profiles for select using (auth.role() = 'authenticated');

create policy "staff manage interaction profiles"
  on interaction_profiles for all using (is_platform_staff());

insert into interaction_profiles
  (key, label, description, interaction_type, dimensions, default_consequence)
values
  ('view', 'Ansehen', 'Content öffnen und konsumieren.', 'view',
   '{"risk":1,"impulsivity":0,"social_pressure":0,"source_awareness":0,"difficulty":1}',
   '{"attention":1}'),
  ('open_link', 'Link öffnen', 'Einen externen oder eingebetteten Link öffnen.', 'open_link',
   '{"risk":2,"impulsivity":1,"social_pressure":0,"source_awareness":-1,"difficulty":2}',
   '{"exposure":1}'),
  ('like', 'Gefällt mir', 'Einen Beitrag positiv markieren.', 'like',
   '{"risk":1,"impulsivity":1,"social_pressure":2,"source_awareness":0,"difficulty":1}',
   '{"social_signal":1}'),
  ('share', 'Teilen', 'Content an andere Personen weitergeben.', 'share',
   '{"risk":2,"impulsivity":2,"social_pressure":3,"source_awareness":-1,"difficulty":3}',
   '{"amplification":1}'),
  ('comment', 'Kommentieren', 'Einen eigenen Kommentar veröffentlichen.', 'comment',
   '{"risk":2,"impulsivity":2,"social_pressure":2,"source_awareness":0,"difficulty":3}',
   '{"participation":1}'),
  ('check_source', 'Quelle prüfen', 'Quelle, Beleg oder Kontext aktiv prüfen.', 'check_source',
   '{"risk":-2,"impulsivity":-2,"social_pressure":-1,"source_awareness":3,"difficulty":3}',
   '{"critical_check":1}'),
  ('report', 'Melden', 'Problematischen oder zweifelhaften Content melden.', 'report',
   '{"risk":-2,"impulsivity":-1,"social_pressure":-1,"source_awareness":2,"difficulty":3}',
   '{"protective_action":1}'),
  ('ignore', 'Ignorieren', 'Content bewusst nicht weiter verfolgen.', 'ignore',
   '{"risk":-1,"impulsivity":-1,"social_pressure":-1,"source_awareness":1,"difficulty":2}',
   '{"avoidance":1}');
