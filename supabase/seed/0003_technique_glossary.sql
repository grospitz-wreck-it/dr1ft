-- ============================================================
-- DR1FT — Seed: Technik-Lexikon (öffentlich, generisch)
-- ============================================================

insert into technique_glossary (slug, title, category, description, example, status) values
  ('false_authority', 'Berufung auf unbenannte Autorität', 'rhetorisch',
   'Eine Aussage wirkt glaubwürdig, weil sie angeblich von "Expert:innen" oder "Wissenschaftlern" stammt — ohne dass genannt wird, wer genau das ist oder wo die Information veröffentlicht wurde.',
   '"Wissenschaftler bestätigen..." — welche? In welcher Studie?', 'live'),

  ('emotional_urgency', 'Künstliche Dringlichkeit', 'rhetorisch',
   'Ein Text erzeugt das Gefühl, sofort handeln zu müssen ("bevor es gelöscht wird", "jetzt teilen!") — Zeitdruck verhindert, dass man in Ruhe nachdenkt oder nachprüft.',
   '"TEILEN, bevor der Beitrag gelöscht wird!"', 'live'),

  ('anecdotal_evidence', 'Einzelfall als Beleg', 'rhetorisch',
   'Eine einzelne persönliche Geschichte wird so präsentiert, als würde sie eine allgemeine Wahrheit beweisen — auch wenn ein Einzelfall statistisch nichts belegt.',
   '"Ich habe es selbst erlebt!" als "Beweis" für eine allgemeine Behauptung.', 'live'),

  ('urgency_to_share', 'Teilen-Druck', 'sozial',
   'Der Inhalt fordert explizit zum sofortigen Weiterleiten auf, oft kombiniert mit einem schlechten Gewissen ("wenn dir Menschen wichtig sind, teile das").',
   '"Teile das, wenn du ein guter Mensch bist."', 'live'),

  ('peer_pressure', 'Gruppendruck', 'sozial',
   'Andere Personen (Freund:innen, die Klasse) haben einen Inhalt bereits geteilt oder geliked — das erzeugt den Eindruck, man müsse mitziehen, um dazuzugehören.',
   '"Alle in der Klasse haben das schon geteilt."', 'live'),

  ('source_evaluation', 'Quellenprüfung', 'gegenmuster',
   'Kein Manipulationsmuster, sondern die Gegenstrategie: nachschauen, wer eine Information veröffentlicht hat, ob es weitere unabhängige Quellen gibt und wie aktuell die Angabe ist.',
   '"Ich habe nachgeschaut — dafür gibt es keine seriöse Quelle."', 'live')
on conflict (slug) do nothing;
