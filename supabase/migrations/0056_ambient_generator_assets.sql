-- DR1FT — restore advanced ambient generator data/storage support
-- Safe on databases where the legacy ambient tables already exist.

create table if not exists public.ambient_generation_profiles (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  label text not null,
  description text,
  age_band text not null,
  writing_style text not null,
  typo_level int not null default 0 check (typo_level between 0 and 3),
  slang_level int not null default 0 check (slang_level between 0 and 3),
  emoji_level int not null default 1 check (emoji_level between 0 and 3),
  punctuation_style text not null default 'normal',
  post_length text not null default 'short',
  image_probability int not null default 0 check (image_probability between 0 and 100),
  prompt_rules jsonb not null default '{}',
  is_active boolean not null default true
);

insert into public.ambient_generation_profiles
  (key,label,description,age_band,writing_style,typo_level,slang_level,emoji_level,punctuation_style,post_length,image_probability)
values
  ('young_12_13','12–13 · Early Teen','Locker, Schule, Hobbys, erste Internetkultur','12_13','casual',1,1,2,'normal','short',35),
  ('teen_14_15','14–15 · Teen','Chatty, locker, meme-affin, gelegentliche Tippfehler','14_15','casual',2,2,2,'loose','short',45),
  ('teen_16_17','16–17 · Older Teen','Ironisch, pointierter, stärkerer Slang, variabler Rhythmus','16_17','casual',2,3,2,'loose','mixed',55),
  ('young_18','18+ · Young Adult','Natürlicher Social-Ton, weniger Slang, mehr Varianz','18_plus','natural',1,2,1,'natural','mixed',60),
  ('neutral','Neutral','Altersneutrale, unaufgeregte Ambient-Stimme','all','neutral',0,0,1,'normal','short',20)
on conflict (key) do update set
  label=excluded.label,
  description=excluded.description,
  age_band=excluded.age_band,
  writing_style=excluded.writing_style,
  typo_level=excluded.typo_level,
  slang_level=excluded.slang_level,
  emoji_level=excluded.emoji_level,
  punctuation_style=excluded.punctuation_style,
  post_length=excluded.post_length,
  image_probability=excluded.image_probability,
  is_active=true;

insert into storage.buckets (id, name, public)
values ('ambient-assets', 'ambient-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "public read ambient assets" on storage.objects;
create policy "public read ambient assets"
  on storage.objects for select
  using (bucket_id = 'ambient-assets');

drop policy if exists "staff upload ambient assets" on storage.objects;
create policy "staff upload ambient assets"
  on storage.objects for insert
  with check (bucket_id = 'ambient-assets' and is_platform_staff());

drop policy if exists "staff delete ambient assets" on storage.objects;
create policy "staff delete ambient assets"
  on storage.objects for delete
  using (bucket_id = 'ambient-assets' and is_platform_staff());
