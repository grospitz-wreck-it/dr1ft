alter table public.class_instances
  add column if not exists class_visual_id text;

alter table public.class_instances
  drop constraint if exists class_instances_class_visual_id_check;

alter table public.class_instances
  add constraint class_instances_class_visual_id_check
  check (class_visual_id is null or class_visual_id in (
    'aurora', 'nebula', 'ocean', 'sunrise',
    'forest', 'cosmos', 'spectrum', 'glacier'
  ));
