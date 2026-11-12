-- ============================================================
-- DR1FT — Session Duration Engine foundation
--
-- Ziel: Szenario-Dauer beschreibt eine erwartete Nutzungssession,
-- nicht lediglich eine Anzahl von Content-Items.
-- ============================================================

alter table scenarios
  add column if not exists target_duration_minutes smallint
    not null default 25
    check (target_duration_minutes between 5 and 90);

comment on column scenarios.target_duration_minutes is
  'Zielgröße für die erwartete Sessiondauer. Wird durch die Session Duration Engine gegen Content- und Interaktionszeiten geprüft.';

alter table content_items
  add column if not exists engagement_profile jsonb
    not null default '{}';

comment on column content_items.engagement_profile is
  'Erwartetes Nutzungsverhalten für die Session Duration Engine: readSeconds, interactionSeconds, scrollProbability, repeatProbability.';

create index if not exists idx_scenarios_target_duration
  on scenarios(target_duration_minutes);
