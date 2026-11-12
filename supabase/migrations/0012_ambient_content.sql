-- ============================================================
-- DR1FT — Ambient-Content-Unterscheidung
--
-- Bisher bestand jeder Feed-Pool nur aus szenario-gebundenem,
-- technik-behaftetem Content — jeder Post war dadurch implizit
-- "verdächtig". Das ist didaktisch kontraproduktiv (zu leicht zu
-- erraten) und wirkt nicht wie ein echter Feed.
--
-- creator_role trennt harmlose "Ambient"-Accounts (Füllmaterial, wird
-- nicht redaktionell auf Manipulationstechniken geprüft, da keine
-- vorhanden) von "antagonist" (treibt manipulativen Content) und
-- "ally" (treibt unterstützende NPC-Dialoge, z.B. Mia).
-- ============================================================

alter table creators
  add column creator_role text not null default 'ambient'
  check (creator_role in ('ambient', 'antagonist', 'ally', 'system'));

-- Bestehende Mini-Szenario-Creator nachträglich einordnen
update creators set creator_role = 'antagonist' where handle = '@newsblitz24';
update creators set creator_role = 'ally' where handle = '@mia_klassenchat';

comment on column content_items.scenario_id is
  'NULL erlaubt: szenario-unabhängiger Ambient-Content, der in JEDEM '
  'Feed auftauchen kann (wiederverwendbar über Szenarien hinweg), statt '
  'für jedes Szenario eigenes Füllmaterial schreiben zu müssen.';
