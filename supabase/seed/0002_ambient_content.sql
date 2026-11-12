-- ============================================================
-- DR1FT — Ambient-Content-Pool (szenario-unabhängig)
--
-- Harmloses Füllmaterial, das in JEDEM Feed erscheinen kann, unabhängig
-- davon, welche Szenarien einer Klasse zugewiesen sind. scenario_id ist
-- bewusst NULL. Dient dazu, dass nicht jeder Feed-Post automatisch
-- "verdächtig" wirkt (siehe 0012_ambient_content.sql, Feed Engine
-- interleaveByRatio()).
-- ============================================================

insert into creators (id, kind, display_name, handle, creator_role, persona, scenario_id) values
  ('33333333-3333-3333-3333-333333333310', 'npc', 'Lena kocht', '@lena_kocht', 'ambient',
   '{"styleNotes": "entspannt, Alltagsposts, Rezepte", "bio": "Kochen für eine Person, ohne Stress 🍳", "followerCount": 412}', null),
  ('33333333-3333-3333-3333-333333333311', 'npc', 'Basketball Update', '@hoops_update', 'ambient',
   '{"styleNotes": "Sport-Ergebnisse, kurz, sachlich", "bio": "Regionale Basketball-Ergebnisse & News.", "followerCount": 1204}', null)
on conflict (id) do nothing;

insert into content_items (
  id, type, scenario_id, creator_id, body,
  manipulation_techniques, difficulty, age_rating, status
) values
  ('44444444-4444-4444-4444-444444444410', 'post', null, '33333333-3333-3333-3333-333333333310',
   'Heute gab''s bei mir Pasta mit selbstgemachter Tomatensauce 🍝 Rezept gibt''s auf Nachfrage!',
   '{}', 1, 'all_ages', 'live'),

  ('44444444-4444-4444-4444-444444444411', 'post', null, '33333333-3333-3333-3333-333333333310',
   'Wochenend-Vibes: Serie geguckt, nichts getan, war herrlich 😴',
   '{}', 1, 'all_ages', 'live'),

  ('44444444-4444-4444-4444-444444444412', 'post', null, '33333333-3333-3333-3333-333333333311',
   'Starkes Spiel gestern Abend — knapper 89:87-Sieg in der Verlängerung 🏀',
   '{}', 1, 'all_ages', 'live'),

  ('44444444-4444-4444-4444-444444444413', 'post', null, '33333333-3333-3333-3333-333333333311',
   'Trainingslager beginnt nächste Woche. Kader wird noch bekanntgegeben.',
   '{}', 1, 'all_ages', 'live'),

  ('44444444-4444-4444-4444-444444444414', 'post', null, '33333333-3333-3333-3333-333333333310',
   'Frage an alle: Ananas auf Pizza — ja oder nein? 🍍🍕',
   '{}', 1, 'all_ages', 'live'),

  ('44444444-4444-4444-4444-444444444415', 'post', null, '33333333-3333-3333-3333-333333333311',
   'Neuer Trainingsplan ab Montag, Details folgen im Klassenchat.',
   '{}', 1, 'all_ages', 'live')
on conflict (id) do nothing;

-- Ein paar vorautorierte Kommentare, damit die aufklappbare
-- Kommentarliste im Feed nicht leer wirkt (siehe PostCard.tsx).
insert into content_items (
  id, type, scenario_id, parent_id, creator_id, body,
  manipulation_techniques, age_rating, status
) values
  ('44444444-4444-4444-4444-444444444420', 'comment', null,
   '44444444-4444-4444-4444-444444444410', '33333333-3333-3333-3333-333333333311',
   'sieht lecker aus 😍', '{}', 'all_ages', 'live'),
  ('44444444-4444-4444-4444-444444444421', 'comment', null,
   '44444444-4444-4444-4444-444444444412', '33333333-3333-3333-3333-333333333310',
   'war ein krasses Spiel!', '{}', 'all_ages', 'live')
on conflict (id) do nothing;
