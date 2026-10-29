-- Mission thumbnails are authored in Editorial and displayed in teacher/player surfaces.
alter table public.missions
  add column if not exists thumbnail_url text;

comment on column public.missions.thumbnail_url is
  'Optional public image URL used as the mission card thumbnail in DR1FT.';
