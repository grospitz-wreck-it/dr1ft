-- ============================================================
-- DR1FT — Ambient Interest Catalog / Player Preferences
--
-- Interest selection is a feed-personalisation input only.
-- It is NOT a learning, competency or performance profile.
-- ============================================================

create table if not exists public.ambient_interests (
  key text primary key,
  label text not null,
  emoji text,
  category text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0
);

create index if not exists idx_ambient_interests_active_order
  on public.ambient_interests (is_active, sort_order);

create table if not exists public.user_ambient_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  interest_keys text[] not null default '{}',
  onboarding_completed boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint user_ambient_preferences_max_three
    check (coalesce(cardinality(interest_keys), 0) <= 3)
);

alter table public.ambient_interests enable row level security;
alter table public.user_ambient_preferences enable row level security;

drop policy if exists "public read active ambient interests" on public.ambient_interests;
create policy "public read active ambient interests"
  on public.ambient_interests for select
  using (is_active = true);

drop policy if exists "users manage own ambient preferences" on public.user_ambient_preferences;
create policy "users manage own ambient preferences"
  on public.user_ambient_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into public.ambient_interests (key, label, emoji, category, sort_order) values
  ('gaming', 'Gaming', '🎮', 'Games & Digitales', 10),
  ('minecraft', 'Minecraft', '⛏️', 'Games & Digitales', 11),
  ('fortnite', 'Fortnite', '🚌', 'Games & Digitales', 12),
  ('roblox', 'Roblox', '🧱', 'Games & Digitales', 13),
  ('esports', 'E-Sport', '🏆', 'Games & Digitales', 14),
  ('indie-games', 'Indie Games', '🕹️', 'Games & Digitales', 15),
  ('gaming-news', 'Gaming-News', '📰', 'Games & Digitales', 16),
  ('game-design', 'Game Design', '🎲', 'Games & Digitales', 17),
  ('streaming', 'Streaming', '📺', 'Games & Digitales', 18),
  ('memes', 'Memes', '😂', 'Internet & Kultur', 20),
  ('internet-culture', 'Internetkultur', '🌐', 'Internet & Kultur', 21),
  ('social-media', 'Social Media', '📱', 'Internet & Kultur', 22),
  ('creators', 'Creator & Influencer', '✨', 'Internet & Kultur', 23),
  ('podcasts', 'Podcasts', '🎙️', 'Internet & Kultur', 24),
  ('anime', 'Anime', '🌸', 'Film & Entertainment', 30),
  ('manga', 'Manga', '📚', 'Film & Entertainment', 31),
  ('movies', 'Filme', '🎬', 'Film & Entertainment', 32),
  ('series', 'Serien', '🍿', 'Film & Entertainment', 33),
  ('comedy', 'Comedy', '🤣', 'Film & Entertainment', 34),
  ('horror', 'Horror', '👻', 'Film & Entertainment', 35),
  ('scifi', 'Sci-Fi', '🚀', 'Film & Entertainment', 36),
  ('fantasy', 'Fantasy', '🐉', 'Film & Entertainment', 37),
  ('music', 'Musik', '🎵', 'Musik', 40),
  ('pop', 'Pop', '🎤', 'Musik', 41),
  ('hip-hop', 'Hip-Hop & Rap', '🎧', 'Musik', 42),
  ('rock', 'Rock', '🎸', 'Musik', 43),
  ('electronic', 'Elektronische Musik', '🔊', 'Musik', 44),
  ('indie-music', 'Indie', '🎶', 'Musik', 45),
  ('classical-music', 'Klassische Musik', '🎻', 'Musik', 46),
  ('concerts', 'Konzerte & Festivals', '🎟️', 'Musik', 47),
  ('sports', 'Sport', '🏃', 'Sport', 50),
  ('football', 'Fußball', '⚽', 'Sport', 51),
  ('basketball', 'Basketball', '🏀', 'Sport', 52),
  ('handball', 'Handball', '🤾', 'Sport', 53),
  ('volleyball', 'Volleyball', '🏐', 'Sport', 54),
  ('tennis', 'Tennis', '🎾', 'Sport', 55),
  ('skateboarding', 'Skateboarding', '🛹', 'Sport', 56),
  ('cycling', 'Radfahren', '🚲', 'Sport', 57),
  ('running', 'Laufen', '🏃‍♀️', 'Sport', 58),
  ('fitness', 'Fitness', '💪', 'Sport', 59),
  ('motorsport', 'Motorsport', '🏎️', 'Sport', 60),
  ('dance', 'Tanzen', '💃', 'Kreativ', 70),
  ('drawing', 'Zeichnen', '✏️', 'Kreativ', 71),
  ('painting', 'Malen', '🎨', 'Kreativ', 72),
  ('photography', 'Fotografie', '📷', 'Kreativ', 73),
  ('video', 'Videos drehen', '🎥', 'Kreativ', 74),
  ('writing', 'Schreiben', '✍️', 'Kreativ', 75),
  ('fashion', 'Mode', '👟', 'Kreativ', 76),
  ('design', 'Design', '🖌️', 'Kreativ', 77),
  ('crafts', 'Basteln & DIY', '🧵', 'Kreativ', 78),
  ('technology', 'Technik', '⚙️', 'Technik & Wissen', 80),
  ('programming', 'Programmieren', '💻', 'Technik & Wissen', 81),
  ('ai', 'KI & Künstliche Intelligenz', '🤖', 'Technik & Wissen', 82),
  ('space', 'Weltraum', '🪐', 'Technik & Wissen', 83),
  ('science', 'Wissenschaft', '🔬', 'Technik & Wissen', 84),
  ('psychology', 'Psychologie', '🧠', 'Technik & Wissen', 85),
  ('history', 'Geschichte', '🏛️', 'Technik & Wissen', 86),
  ('geography', 'Geografie', '🗺️', 'Technik & Wissen', 87),
  ('inventions', 'Erfindungen', '💡', 'Technik & Wissen', 88),
  ('nature', 'Natur', '🌿', 'Natur & Draußen', 90),
  ('animals', 'Tiere', '🐾', 'Natur & Draußen', 91),
  ('dogs', 'Hunde', '🐶', 'Natur & Draußen', 92),
  ('cats', 'Katzen', '🐱', 'Natur & Draußen', 93),
  ('wildlife', 'Wildtiere', '🦊', 'Natur & Draußen', 94),
  ('oceans', 'Meere & Ozeane', '🌊', 'Natur & Draußen', 95),
  ('hiking', 'Wandern', '🥾', 'Natur & Draußen', 96),
  ('camping', 'Camping', '⛺', 'Natur & Draußen', 97),
  ('climate', 'Klima & Umwelt', '🌍', 'Natur & Draußen', 98),
  ('food', 'Essen', '🍜', 'Lifestyle', 100),
  ('cooking', 'Kochen', '🍳', 'Lifestyle', 101),
  ('baking', 'Backen', '🧁', 'Lifestyle', 102),
  ('street-food', 'Street Food', '🌮', 'Lifestyle', 103),
  ('travel', 'Reisen', '✈️', 'Lifestyle', 104),
  ('cities', 'Städte', '🏙️', 'Lifestyle', 105),
  ('cars', 'Autos', '🚗', 'Lifestyle', 106),
  ('architecture', 'Architektur', '🏠', 'Lifestyle', 107),
  ('books', 'Bücher', '📖', 'Kultur', 110),
  ('comics', 'Comics', '💥', 'Kultur', 111),
  ('art', 'Kunst', '🖼️', 'Kultur', 112),
  ('theatre', 'Theater', '🎭', 'Kultur', 113),
  ('language', 'Sprachen', '🗣️', 'Kultur', 114),
  ('culture', 'Kultur', '🌎', 'Kultur', 115),
  ('news', 'News & Aktuelles', '🗞️', 'Welt & Gesellschaft', 120),
  ('politics', 'Politik', '🏛️', 'Welt & Gesellschaft', 121),
  ('society', 'Gesellschaft', '👥', 'Welt & Gesellschaft', 122),
  ('justice', 'Gerechtigkeit', '⚖️', 'Welt & Gesellschaft', 123),
  ('human-rights', 'Menschenrechte', '🫶', 'Welt & Gesellschaft', 124),
  ('future', 'Zukunft', '🔮', 'Welt & Gesellschaft', 125),
  ('school-life', 'Schulleben', '🏫', 'Alltag', 130),
  ('friends', 'Freundschaft', '🫂', 'Alltag', 131),
  ('relationships', 'Beziehungen', '💬', 'Alltag', 132),
  ('humor', 'Humor', '😎', 'Alltag', 133),
  ('self-expression', 'Selbstausdruck', '🪩', 'Alltag', 134),
  ('mental-wellbeing', 'Wohlbefinden', '🌱', 'Alltag', 135)
on conflict (key) do update set
  label = excluded.label,
  emoji = excluded.emoji,
  category = excluded.category,
  is_active = true,
  sort_order = excluded.sort_order;
