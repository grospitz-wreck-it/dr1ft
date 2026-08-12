-- ============================================================
-- DR1FT — Technik-Lexikon (öffentliche Homepage)
--
-- WICHTIG: Diese Tabelle ist für generische, pädagogisch unbedenkliche
-- Manipulationsmuster gedacht (false_authority, peer_pressure, ...) —
-- NICHT für reale Symbole/Codes aus extremistischen Szenen. Solche
-- Inhalte gehören ausschließlich in den authentifizierten,
-- altersgegateten Schüler-Bereich (content_items), nie in eine
-- öffentlich erreichbare Tabelle ohne Auth-Schranke.
-- ============================================================

create table technique_glossary (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  category text, -- z.B. 'rhetorisch', 'sozial', 'algorithmisch'
  description text not null,
  example text, -- kurzes, generisches Beispiel (keine echten Zitate/Personen)
  status content_status not null default 'draft',
  created_at timestamptz not null default now()
);

alter table technique_glossary enable row level security;

create policy "public read live glossary entries"
  on technique_glossary for select
  using (status = 'live');

create policy "staff manage glossary"
  on technique_glossary for all
  using (is_platform_staff());
