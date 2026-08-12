-- ============================================================
-- DR1FT — Mini-Szenario: "Fake News erkennen"
--
-- Zweck: End-to-End-Test der gesamten Kette:
-- Feed -> Interaktion -> Mission Engine -> Analytics Engine
-- -> Narrative Engine (Freischaltung) -> NPC Engine
--
-- Alle IDs sind bewusst feste UUIDs (statt gen_random_uuid()), damit
-- sie sich in diesem Skript gegenseitig referenzieren lassen und das
-- Skript idempotent per ON CONFLICT DO NOTHING erneut laufen kann.
--
-- Ausführen NACH allen Migrationen 0001–0007:
--   supabase db push  (Migrationen)
--   psql < 0001_mini_scenario_fake_news.sql  (dieses Seed-Skript)
-- ============================================================

-- ---------- KOMPETENZEN ----------

insert into competencies (id, slug, title, description) values
  ('11111111-1111-1111-1111-111111111101', 'critical_thinking',
   'Kritisches Denken', 'Informationen hinterfragen statt unreflektiert übernehmen'),
  ('11111111-1111-1111-1111-111111111102', 'source_evaluation',
   'Quellenbewertung', 'Einschätzen, wie glaubwürdig eine Quelle ist')
on conflict (id) do nothing;

-- ---------- SZENARIO ----------

insert into scenarios (id, slug, title, description, age_rating, is_active) values
  ('22222222-2222-2222-2222-222222222201', 'fake-news-erkennen',
   'Fake News erkennen',
   'Mini-Szenario: Sensationslust, Fake-Dringlichkeit und Gruppendruck bei der Verbreitung von Falschinformationen erkennen.',
   '12_plus', true)
on conflict (id) do nothing;

-- ---------- CREATORS ----------

insert into creators (id, kind, display_name, handle, persona, scenario_id) values
  ('33333333-3333-3333-3333-333333333301', 'npc', 'NewsBlitz24', '@newsblitz24',
   '{"styleNotes": "reißerisch, viele Emojis, Großbuchstaben", "rhetoricPatterns": ["false_authority","emotional_urgency"], "credibilityScore": 0.2, "bio": "News, die dir keiner erzählt 🚨 Folge für die Wahrheit.", "followerCount": 84300}',
   '22222222-2222-2222-2222-222222222201'),
  ('33333333-3333-3333-3333-333333333302', 'npc', 'Mia', '@mia_klassenchat',
   '{"styleNotes": "Klassenkameradin, ungefiltert, schnell begeistert", "rhetoricPatterns": ["peer_pressure"], "credibilityScore": 0.6, "bio": "9b 🎒", "followerCount": 63}',
   '22222222-2222-2222-2222-222222222201')
on conflict (id) do nothing;

-- ---------- CONTENT: zwei manipulative Feed-Posts ----------

insert into content_items (
  id, type, scenario_id, creator_id, body,
  manipulation_techniques, target_competencies, difficulty, age_rating,
  source_refs, status
) values
  ('44444444-4444-4444-4444-444444444401', 'post',
   '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333301',
   '🚨 SCHOCK: Wissenschaftler bestätigen geheime Funktion in jedem neuen Smartphone! Über 10.000 Likes in einer Stunde – die Wahrheit, die DIR verschwiegen wird!',
   array['false_authority','emotional_urgency'],
   array['11111111-1111-1111-1111-111111111101']::uuid[],
   1, '12_plus', '[]', 'live'),

  ('44444444-4444-4444-4444-444444444402', 'post',
   '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333301',
   'Insider bricht ihr Schweigen: "Ich hab es selbst erlebt!" Ein Bericht, der alles verändert – TEILEN, bevor er gelöscht wird!',
   array['anecdotal_evidence','urgency_to_share'],
   array['11111111-1111-1111-1111-111111111101']::uuid[],
   1, '12_plus', '[]', 'live')
on conflict (id) do nothing;

-- ---------- CONTENT: Reflexion nach Mission A ----------

insert into content_items (
  id, type, scenario_id, body, target_competencies, age_rating, source_refs, status
) values
  ('44444444-4444-4444-4444-444444444403', 'reflection_prompt',
   '22222222-2222-2222-2222-222222222201',
   'Beide Posts arbeiten mit denselben Tricks: künstliche Dringlichkeit ("bevor er gelöscht wird"), Angst-Appelle und Berufung auf anonyme Autoritäten ("Wissenschaftler bestätigen" — welche? wo veröffentlicht?). Frag dich bei sowas immer: Wer genau sagt das? Woher kommt die Information? Und warum soll ich JETZT sofort handeln?',
   array['11111111-1111-1111-1111-111111111101']::uuid[],
   '12_plus',
   '[{"label": "klicksafe.de – Fake News erkennen", "url": "https://www.klicksafe.de"}]',
   'live')
on conflict (id) do nothing;

-- ---------- CONTENT: NPC-Dialog mit Mia (verzweigt) ----------

-- Endpunkte zuerst anlegen, damit die Startnachricht per replyOptions
-- bereits darauf verweisen kann.

insert into content_items (
  id, type, scenario_id, creator_id, body,
  manipulation_techniques, extra, age_rating, status
) values
  ('44444444-4444-4444-4444-444444444406', 'dm_message',
   '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333302',
   'Mega, ich hab''s auch schon 5 Leuten geschickt! Steht doch überall, muss ja stimmen 😅',
   array['peer_pressure'], '{}', '12_plus', 'live'),

  ('44444444-4444-4444-4444-444444444405', 'dm_message',
   '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333302',
   'Guter Punkt! Ich hab grad nachgeschaut — dazu gibt''s keine seriöse Quelle. Sieht nach Fake News aus.',
   array['source_evaluation'], '{}', '12_plus', 'live')
on conflict (id) do nothing;

insert into content_items (
  id, type, scenario_id, creator_id, body, extra, age_rating, status
) values
  ('44444444-4444-4444-4444-444444444404', 'dm_message',
   '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333302',
   'Hey! Hast du den Post von NewsBlitz24 gesehen?? 😱 Das musst du sofort weiterleiten!!',
   '{"replyOptions": [
      {"label": "Klar, sofort weiterleiten!", "nextContentItemId": "44444444-4444-4444-4444-444444444406", "techniqueTag": "peer_pressure"},
      {"label": "Moment, lass mich das erst checken.", "nextContentItemId": "44444444-4444-4444-4444-444444444405", "techniqueTag": "source_evaluation"}
   ]}',
   '12_plus', 'live')
on conflict (id) do nothing;

-- ---------- CONTENT: Reflexion nach Mission B ----------

insert into content_items (
  id, type, scenario_id, body, target_competencies, age_rating, status
) values
  ('44444444-4444-4444-4444-444444444407', 'reflection_prompt',
   '22222222-2222-2222-2222-222222222201',
   'Ob du sofort weitergeleitet oder erst nachgeprüft hast: Genau in diesem Moment verbreiten sich Fake News. Kurz innehalten und fragen "Woher weiß ich das eigentlich?" macht oft schon den Unterschied — auch wenn eine Freundin oder ein Freund gerade Druck macht.',
   array['11111111-1111-1111-1111-111111111102']::uuid[],
   '12_plus', 'live')
on conflict (id) do nothing;

-- ---------- MISSIONEN ----------

insert into missions (
  id, scenario_id, slug, title, description,
  trigger_condition, target_competencies, reflection_content_id, status
) values
  ('55555555-5555-5555-5555-555555555501', '22222222-2222-2222-2222-222222222201',
   'spot-the-fake-news', 'Verdächtige Posts erkennen',
   'Sieh dir beide Posts von NewsBlitz24 an und achte auf die verwendeten Tricks.',
   '{"event": "PostViewed", "count": 2, "technique_filter": ["false_authority","anecdotal_evidence"]}',
   array['11111111-1111-1111-1111-111111111101']::uuid[],
   '44444444-4444-4444-4444-444444444403', 'live'),

  ('55555555-5555-5555-5555-555555555502', '22222222-2222-2222-2222-222222222201',
   'talk-to-mia', 'Mia schreibt dir',
   'Antworte Mia, die dir den Fake-News-Post weiterleiten will.',
   '{"event": "NpcReplySelected", "count": 1}',
   array['11111111-1111-1111-1111-111111111102']::uuid[],
   '44444444-4444-4444-4444-444444444407', 'live')
on conflict (id) do nothing;

-- ---------- STORY ARC: Mission B erst nach Mission A sichtbar ----------

insert into story_arcs (id, scenario_id, slug, title, description, status) values
  ('66666666-6666-6666-6666-666666666601', '22222222-2222-2222-2222-222222222201',
   'fake-news-einstieg', 'Einstieg: Fake News erkennen',
   'Erst die Posts durchschauen, dann zeigt sich, wie es sich anfühlt, wenn eine Freundin Druck macht.',
   'live')
on conflict (id) do nothing;

insert into story_arc_steps (arc_id, order_index, mission_id) values
  ('66666666-6666-6666-6666-666666666601', 0, '55555555-5555-5555-5555-555555555501'),
  ('66666666-6666-6666-6666-666666666601', 1, '55555555-5555-5555-5555-555555555502')
on conflict (arc_id, order_index) do nothing;

-- ============================================================
-- Manuelle Testschritte (nicht Teil des Seeds, da echte Nutzer/Klassen
-- über Supabase Auth + das Lehrer-Dashboard entstehen müssen):
--
-- 1. Über die App/Supabase Auth einen Lehrer-Account + Schüler-Account anlegen.
-- 2. Lehrkraft legt Klasse an (createClass Server Action) -> access_code.
-- 3. Schüler:in tritt bei (noch zu bauen: joinClassByCode, siehe README TODO).
-- 4. Lehrkraft schaltet Szenario frei:
--    insert into class_scenario_assignments (class_id, scenario_id, assigned_by)
--    values ('<CLASS_ID>', '22222222-2222-2222-2222-222222222201', '<TEACHER_AUTH_ID>');
--    -> löst automatisch start_arc_for_user() für alle Schüler:innen aus,
--       Mission A wird sofort freigeschaltet, Mission B ist noch gesperrt.
-- 5. Schüler:in "sieht" beide Posts (in der App via recordInteraction());
--    manuell zum Testen:
--    select recordInteraction-Äquivalent oder direkt:
--    insert into user_interactions (user_id, content_item_id, interaction_type)
--    values ('<STUDENT_ID>', '44444444-4444-4444-4444-444444444401', 'view');
--    insert into user_interactions (user_id, content_item_id, interaction_type)
--    values ('<STUDENT_ID>', '44444444-4444-4444-4444-444444444402', 'view');
--    -> Mission A sollte jetzt in user_mission_progress als 'completed' stehen,
--       Kompetenz "critical_thinking" in user_competency_progress erscheinen,
--       Mission B sollte jetzt in user_unlocked_missions auftauchen.
-- 6. NPC-Dialog: selectNpcReply() aus der App aufrufen (oder die Interaktion
--    manuell simulieren wie oben, content_item_id = 444...406 oder 405,
--    interaction_type = 'comment') -> Mission B sollte abschließen,
--    Kompetenz "source_evaluation" erscheint, Arc-Status wird 'completed'.
-- ============================================================
