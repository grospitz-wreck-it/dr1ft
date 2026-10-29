-- DR1FT: Szenario-Cover für das Editorial-Studio
alter table public.scenarios
  add column if not exists cover_image_url text;

comment on column public.scenarios.cover_image_url is
  'KI-generiertes Szenario-Cover aus Szenario-Titel und Briefing; sichtbar in der Szenario-Bibliothek.';
