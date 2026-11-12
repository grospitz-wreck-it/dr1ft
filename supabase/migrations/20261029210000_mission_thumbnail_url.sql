-- DR1FT: Optionales Cover für einzelne Missionen
alter table public.missions
  add column if not exists thumbnail_url text;

comment on column public.missions.thumbnail_url is
  'Optionales Bild-Cover für Missionskarten im Editorial und Lernreport.';
