-- DR1FT: curated, opt-in interest extensions.
-- Additive seed: existing stable keys are not renamed or removed.
-- Parents use the shared DR1FT interest tree; the legacy category field is
-- retained for compatibility with current Player profile grouping.

insert into public.ambient_interests (key, label, emoji, category, sort_order, parent_key)
values
  ('k-pop', 'K-Pop', '🎤', 'Musik', 42, 'music'),
  ('rnb-soul', 'R&B & Soul', '🎧', 'Musik', 43, 'music'),
  ('music-discovery', 'Neue Musik entdecken', '🎶', 'Musik', 48, 'music'),
  ('beauty', 'Beauty & Pflege', '🧴', 'Kreativ', 79, 'fashion'),
  ('skin-care', 'Hautpflege', '🫧', 'Kreativ', 80, 'beauty'),
  ('hair-care', 'Haarpflege & Frisuren', '💇', 'Kreativ', 81, 'beauty'),
  ('nail-art', 'Nail Art', '💅', 'Kreativ', 82, 'beauty'),
  ('makeup', 'Make-up', '💄', 'Kreativ', 83, 'beauty'),
  ('sewing', 'Nähen & Textil', '🪡', 'Kreativ', 84, 'crafts'),
  ('jewelry-making', 'Schmuck gestalten', '📿', 'Kreativ', 85, 'crafts'),
  ('books-fantasy', 'Fantasy-Bücher', '🐉', 'Kultur', 116, 'books'),
  ('books-romance', 'Romance & Liebesromane', '💗', 'Kultur', 117, 'books'),
  ('booktok', 'BookTok & Lesetrends', '📚', 'Kultur', 118, 'books'),
  ('fan-culture', 'Fandoms & Fan-Kultur', '🌟', 'Internet & Kultur', 25, 'internet-culture'),
  ('cosplay', 'Cosplay', '🎭', 'Kreativ', 86, 'anime'),
  ('dance-styles', 'Tanzstile & Choreos', '💃', 'Kreativ', 87, 'dance'),
  ('food-culture', 'Food-Trends & Rezepte', '🍜', 'Lifestyle', 108, 'food'),
  ('friendship-drama', 'Freundschaft & Gruppendynamik', '🫂', 'Alltag', 136, 'friends'),
  ('study-tips', 'Lern- & Study-Tipps', '📝', 'Alltag', 137, 'school-life'),
  ('wellbeing', 'Alltag & Wohlbefinden', '🌱', 'Alltag', 138, 'mental-wellbeing')
on conflict (key) do update
set label = excluded.label,
    emoji = excluded.emoji,
    category = excluded.category,
    sort_order = excluded.sort_order,
    parent_key = excluded.parent_key,
    is_active = true,
    is_selectable = true,
    taxonomy_status = 'active';

-- Curated parent links for existing selectable interests. These links add
-- hierarchy without changing the existing display category used by older UI.
update public.ambient_interests set parent_key = 'gaming' where key in ('minecraft', 'fortnite', 'roblox', 'indie-games', 'gaming-news', 'game-design');
update public.ambient_interests set parent_key = 'sports' where key in ('football', 'basketball', 'handball', 'volleyball', 'tennis', 'skateboarding', 'cycling', 'running', 'fitness', 'motorsport');
update public.ambient_interests set parent_key = 'music' where key in ('pop', 'hip-hop', 'rock', 'electronic', 'indie-music', 'classical-music', 'concerts');
-- Structural grouping node for genres that cut across books, series, games and film.
insert into public.ambient_interests
  (key, label, emoji, category, sort_order, is_selectable, taxonomy_status)
values ('genres', 'Genres', '🎭', 'Film & Entertainment', 29, false, 'hidden')
on conflict (key) do update
set label = excluded.label,
    is_selectable = false,
    taxonomy_status = 'hidden';

update public.ambient_interests set parent_key = 'genres' where key in ('comedy', 'horror', 'scifi', 'fantasy');
update public.ambient_interests set parent_key = null where key = 'series';
update public.ambient_interests set parent_key = 'animals' where key in ('dogs', 'cats', 'wildlife');
update public.ambient_interests set parent_key = 'nature' where key in ('oceans', 'hiking', 'camping', 'climate');
update public.ambient_interests set parent_key = 'food' where key in ('cooking', 'baking', 'street-food');
update public.ambient_interests set parent_key = 'technology' where key in ('programming', 'ai');
update public.ambient_interests set parent_key = 'books' where key = 'comics';
update public.ambient_interests set parent_key = 'art' where key in ('drawing', 'painting', 'photography', 'design');
update public.ambient_interests set parent_key = 'friends' where key = 'relationships';
-- News is a format/topic feed, not a parent category for politics or society.

-- Add IAB mappings for the new DR1FT-only interest extensions.
insert into public.ambient_interest_iab_categories
  (interest_key, iab_taxonomy_version, iab_category_id, mapping_kind, mapping_note)
values
  ('k-pop','3.1','338','extension','DR1FT music subcategory'),
  ('rnb-soul','3.1','338','extension','DR1FT music subcategory'),
  ('music-discovery','3.1','338','extension','Music discovery interest'),
  ('beauty','3.1','553','direct','Beauty'),
  ('skin-care','3.1','559','direct','Skin Care'),
  ('hair-care','3.1','554','direct','Hair Care'),
  ('nail-art','3.1','556','direct','Nail Care'),
  ('makeup','3.1','555','direct','Makeup and Accessories'),
  ('sewing','3.1','248','broad','Arts and Crafts'),
  ('jewelry-making','3.1','252','direct','Jewelry Making'),
  ('books-fantasy','3.1','48','broad','Fiction'),
  ('books-fantasy','3.1','335','broad','Fantasy'),
  ('books-romance','3.1','48','broad','Fiction'),
  ('booktok','3.1','42','broad','Books and Literature; trend/community interest'),
  ('fan-culture','3.1','432','broad','Pop Culture'),
  ('cosplay','3.1','641','broad','Animation & Anime; cosplay spans many fandoms'),
  ('dance-styles','3.1','203','direct','Dance'),
  ('food-culture','3.1','210','broad','Food & Drink'),
  ('friendship-drama','3.1','186','broad','Family and Relationships'),
  ('study-tips','3.1','132','broad','Education'),
  ('wellbeing','3.1','232','broad','Wellness; opt-in interest only')
on conflict (interest_key, iab_taxonomy_version, iab_category_id) do update
set mapping_kind = excluded.mapping_kind,
    mapping_note = excluded.mapping_note;
