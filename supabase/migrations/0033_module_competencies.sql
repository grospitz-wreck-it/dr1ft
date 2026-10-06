-- ============================================================
-- DR1FT — Fixed module learning competencies
--
-- A module/scenario may target exactly one primary competency and
-- up to two secondary competencies. Existing modules remain valid
-- with NULL assignments and can be migrated gradually.
-- ============================================================

alter table public.competencies
  add column if not exists category text;

-- Stable UUIDs are intentionally explicit. The slug is the human-
-- readable stable identifier used by the application/catalog.
insert into public.competencies (id, slug, title, description, category)
values
  ('10000000-0000-4000-8000-000000000001', 'kritisches_denken', 'Kritisches Denken', 'Behauptungen hinterfragen und logisch prüfen.', 'Denken'),
  ('10000000-0000-4000-8000-000000000002', 'quellencheck', 'Quellencheck', 'Informationen und Quellen auf Glaubwürdigkeit prüfen.', 'Denken'),
  ('10000000-0000-4000-8000-000000000003', 'problemloesen', 'Problemlösen', 'Lösungen entwickeln und vergleichen.', 'Denken'),
  ('10000000-0000-4000-8000-000000000004', 'entscheidungen', 'Entscheidungen treffen', 'Vor- und Nachteile abwägen.', 'Denken'),
  ('10000000-0000-4000-8000-000000000005', 'unsicherheit', 'Mit Unsicherheit umgehen', 'Nicht alles sofort glauben oder wissen müssen.', 'Denken'),
  ('10000000-0000-4000-8000-000000000006', 'selbstreflexion', 'Selbstreflexion', 'Eigene Gefühle und Handlungen erkennen.', 'Ich'),
  ('10000000-0000-4000-8000-000000000007', 'selbststeuerung', 'Selbststeuerung', 'Impulse kontrollieren und bewusst handeln.', 'Ich'),
  ('10000000-0000-4000-8000-000000000008', 'resilienz', 'Resilienz', 'Mit Druck, Fehlern und Rückschlägen umgehen.', 'Ich'),
  ('10000000-0000-4000-8000-000000000009', 'selbstbehauptung', 'Selbstbehauptung', 'Gruppendruck erkennen und Nein sagen können.', 'Andere'),
  ('10000000-0000-4000-8000-000000000010', 'empathie', 'Empathie', 'Andere Perspektiven verstehen.', 'Andere'),
  ('10000000-0000-4000-8000-000000000011', 'kommunikation', 'Kommunikation', 'Respektvoll sprechen, zuhören und Konflikte lösen.', 'Andere'),
  ('10000000-0000-4000-8000-000000000012', 'manipulation', 'Manipulation erkennen', 'Werbung, Influencer und psychologische Tricks durchschauen.', 'Einfluss'),
  ('10000000-0000-4000-8000-000000000013', 'verantwortung', 'Verantwortung übernehmen', 'Folgen des eigenen Handelns im Netz verstehen.', 'Verantwortung')
on conflict (slug) do update
set title = excluded.title,
    description = excluded.description,
    category = excluded.category;

alter table public.scenarios
  add column if not exists primary_competency_id uuid references public.competencies(id) on delete set null,
  add column if not exists secondary_competency_ids uuid[] not null default '{}';

alter table public.scenarios
  drop constraint if exists scenarios_max_secondary_competencies;

alter table public.scenarios
  add constraint scenarios_max_secondary_competencies
  check (coalesce(array_length(secondary_competency_ids, 1), 0) <= 2);

alter table public.scenarios
  drop constraint if exists scenarios_primary_not_secondary;

alter table public.scenarios
  add constraint scenarios_primary_not_secondary
  check (
    primary_competency_id is null
    or not (primary_competency_id = any(secondary_competency_ids))
  );

create index if not exists idx_scenarios_primary_competency
  on public.scenarios(primary_competency_id);

create index if not exists idx_scenarios_secondary_competencies
  on public.scenarios using gin(secondary_competency_ids);

comment on column public.scenarios.primary_competency_id is
  'Primary learning competency for this module/scenario.';

comment on column public.scenarios.secondary_competency_ids is
  'Zero to two secondary learning competencies for this module/scenario.';
