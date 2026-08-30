-- ============================================================
-- DR1FT — Ambient AI Profiles & Personalization
-- ============================================================
-- Ambient content is intentionally broad, but generation must be
-- able to target age bands, writing voices, authenticity signals,
-- and later individual interest selections.
-- ============================================================

create table ambient_interests (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  label text not null,
  category text not null,
  emoji text,
  is_active boolean not null default true,
  sort_order int not null default 0
);

insert into ambient_interests (key, label, category, emoji, sort_order) values
  ('music','Musik','Entertainment','🎵',10),
  ('gaming','Gaming','Entertainment','🎮',20),
  ('series_movies','Serien & Filme','Entertainment','🍿',30),
  ('sport','Sport','Lifestyle','⚽',40),
  ('fashion','Mode & Style','Lifestyle','👟',50),
  ('food','Essen & Kochen','Lifestyle','🍕',60),
  ('fitness','Fitness','Lifestyle','🏃',70),
  ('travel','Reisen','Lifestyle','✈️',80),
  ('pets','Tiere','Lifestyle','🐶',90),
  ('tech','Tech','Culture','📱',100),
  ('school','Schule','Everyday','📚',110),
  ('friends','Freunde & Social Life','Everyday','🫶',120),
  ('memes','Memes & Internet','Internet','😂',130),
  ('creativity','Kreativität','Hobbies','🎨',140),
  ('books','Bücher','Culture','📖',150),
  ('nature','Natur','Lifestyle','🌿',160),
  ('science','Wissenschaft','Culture','🔬',170),
  ('local_life','Lokales Leben','Everyday','📍',180);

create table ambient_generation_profiles (
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

insert into ambient_generation_profiles
  (key,label,description,age_band,writing_style,typo_level,slang_level,emoji_level,punctuation_style,post_length,image_probability)
values
  ('young_12_13','12–13 · Early Teen','Locker, Schule, Hobbys, erste Internetkultur','12_13','casual',1,1,2,'normal','short',35),
  ('teen_14_15','14–15 · Teen','Chatty, locker, meme-affin, gelegentliche Tippfehler','14_15','casual',2,2,2,'loose','short',45),
  ('teen_16_17','16–17 · Older Teen','Ironisch, pointierter, stärkerer Slang, variabler Rhythmus','16_17','casual',2,3,2,'loose','mixed',55),
  ('young_18','18+ · Young Adult','Natürlicher Social-Ton, weniger Slang, mehr Varianz','18_plus','natural',1,2,1,'natural','mixed',60),
  ('neutral','Neutral','Altersneutrale, unaufgeregte Ambient-Stimme','all','neutral',0,0,1,'normal','short',20);

create table user_ambient_preferences (
  user_id uuid primary key references user_profiles(id) on delete cascade,
  age_band text,
  interest_keys text[] not null default '{}',
  preferred_style text,
  onboarding_completed boolean not null default false,
  updated_at timestamptz not null default now(),
  check (cardinality(interest_keys) <= 3)
);

alter table ambient_interests enable row level security;
alter table ambient_generation_profiles enable row level security;
alter table user_ambient_preferences enable row level security;

create policy "authenticated read ambient interests"
  on ambient_interests for select using (auth.role() = 'authenticated');
create policy "authenticated read ambient generation profiles"
  on ambient_generation_profiles for select using (auth.role() = 'authenticated');
create policy "users manage own ambient preferences"
  on user_ambient_preferences for all using (auth.uid() = user_id);

-- Generated media lives in a dedicated bucket. Files remain private by default;
-- application code can create signed URLs when needed.
insert into storage.buckets (id, name, public)
values ('ambient-assets', 'ambient-assets', false)
on conflict (id) do nothing;
