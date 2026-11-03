-- Optional teacher-authored introduction board for custom modules.
alter table public.teacher_modules
  add column if not exists intro_title text,
  add column if not exists intro_text text,
  add column if not exists intro_image_path text;

comment on column public.teacher_modules.intro_title is 'Optional title shown on the module introduction board.';
comment on column public.teacher_modules.intro_text is 'Optional introduction text shown before module posts.';
comment on column public.teacher_modules.intro_image_path is 'Optional private image stored in teacher-module-assets.';
