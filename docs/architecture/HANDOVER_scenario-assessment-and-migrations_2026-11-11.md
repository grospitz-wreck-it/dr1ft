# DR1FT – Übergabe: Migrationen bereinigen und Scenario Assessment abschließen

**Stand:** 11.11.2026  
**Repository:** grospitz-wreck-it/dr1ft  
**Branch:** fix/scenario-assessment-v2  
**Supabase-Projekt:** oegshknzeqmjmkraxozr  
**Status:** Produktions-SQL für Scenario Assessment V2 ist vorhanden; Migration-Ledger noch nicht vollständig bereinigt; Ergebnis-Frontend ist nur in einer ersten, aggregierten Form umgesetzt.

Diese Übergabe ist die Startgrundlage für den Folgechat. Sie trennt nachweislich erledigte Arbeiten, den echten Datenbankzustand und noch offene Entwicklungsarbeit. Nicht aus den offenen Punkten ableiten, dass bereits vorhandene Implementierungen neu geschrieben werden müssen.

## 1. Verbindliche Arbeitsregeln

- Sehr vorsichtig und inkrementell vorgehen. Bestehenden Stand nicht verschlechtern.
- Vor jeder Codeänderung zuerst den aktuellen Branch, HEAD, Git-Status und betroffene Dateien prüfen.
- Nur eng begrenzte Änderungen; keine unnötigen Refactorings.
- Keine Änderung an main, kein Merge und kein Deployment ohne ausdrückliche Freigabe.
- Keine Supabase-Produktionsmigration, kein db push und keine produktiven Datenänderungen ohne ausdrückliche Freigabe.
- Keine bereits ausgeführten SQL-Dateien erneut ausführen.
- Keine direkten INSERT/UPDATE/DELETE auf supabase_migrations.schema_migrations.
- Keine pauschale migration repair für alle lokalen Migrationen.
- Keine rückwirkende Erfindung von Evidenz oder Kompetenzständen.
- Vor Datenbankänderungen zuerst das verbindliche Regelwerk lesen:
  docs/architecture/supabase-migration-rules.md
- Operatives Migrationsregister:
  docs/architecture/supabase-production-migration-status.md

## 2. Git-Stand

Zuletzt bestätigter Branch: fix/scenario-assessment-v2.

Der Branch wurde zuletzt um folgende Dokumentation ergänzt:
- docs/architecture/supabase-migration-rules.md
- docs/architecture/supabase-production-migration-status.md
- docs/architecture/supabase-migration-ledger-reconciliation.md
- docs/architecture/supabase-migration-50-review.md
- docs/architecture/scenario-assessment-v2.md
- dieses Übergabedokument

Vor Arbeitsbeginn HEAD erneut abfragen. main wurde nicht verändert. Es gab kein Merge und kein Produktions-Deployment.

## 3. Supabase-Migrationen – tatsächlicher Stand

### 3.1 Remote-Ledger

- Vor der letzten Reconciliation: 138 Remote-Einträge.
- Die zusätzliche Reconciliation-Migration 20261111184418 wurde regulär angewendet und in der Remote-Historie registriert.
- Zuletzt verifizierter Remote-Stand: 139 Migrationseinträge.
- Die vier Scenario-Assessment-Versionen 20261110100000 bis 20261110130000 fehlen weiterhin im Remote-Ledger.
- Die vier SQL-Dateien wurden vom Nutzer direkt im Supabase SQL Editor ausgeführt. Ihre Datenbankeffekte wurden nachgewiesen.
- Diese vier Dateien dürfen NICHT erneut ausgeführt werden.

### 3.2 Vier manuell ausgeführte Scenario-Assessment-Migrationen

| Version | Datei | Nachgewiesener Zustand |
|---|---|---|
| 20261110100000 | supabase/migrations/20261110100000_scenario_assessment_calculation_v1.sql | Reine Scoring-Funktion vorhanden; Smoke-Test für 1 von 2 Pflichtanforderungen ergab 50 % |
| 20261110110000 | supabase/migrations/20261110110000_discrete_action_requirement_modes.sql | record_discrete_action_assessment vorhanden; authenticated darf ausführen, anon nicht |
| 20261110120000 | supabase/migrations/20261110120000_scenario_assessment_snapshots_and_results.sql | Snapshot-/Ergebnistabellen, RLS, Trigger und Finalizer vorhanden |
| 20261110130000 | supabase/migrations/20261110130000_teacher_controlled_student_scenario_reports.sql | student_reports_enabled vorhanden, Default false; Student-RPC liefert Details nur nach Lehrerfreigabe |

**Noch auszuführen – ausschließlich Migration-History-Reparatur, kein SQL-Replay:**

Voraussetzung: Branch lokal aktualisieren, Supabase CLI anmelden/verlinken, vier Dateien gegen den bestätigten Branch prüfen und vor jedem Befehl Remote-Version auf Abwesenheit prüfen.

~~~bash
npx supabase migration list

npx supabase migration repair 20261110100000 --status applied
npx supabase migration repair 20261110110000 --status applied
npx supabase migration repair 20261110120000 --status applied
npx supabase migration repair 20261110130000 --status applied

npx supabase migration list
~~~

Die CLI-Befehle registrieren nur die Versionsnummern; sie führen kein SQL aus. Falls eine Version bereits vorhanden ist, den zugehörigen repair-Befehl überspringen. Keine direkten SQL-Manipulationen am Ledger.

**Wichtig:** Auch nach diesen vier Reparaturen ist die gesamte Migration-Historie noch nicht automatisch sauber. Es gibt weiterhin die historisch untersuchten 50 Repository-only-Dateien. Die vier neuen Versionen sind nur ein klar identifizierter, exakt zuordenbarer Teil davon.

### 3.3 Historische 50 Repository-only-Migrationen

Die Einzelprüfung liegt in docs/architecture/supabase-migration-50-review.md.

Nach den letzten Korrekturen:

| Kategorie | Anzahl |
|---|---:|
| Effekte in Produktion nachgewiesen (einschließlich Realtime und Index) | 36 |
| Durch spätere Architektur/Migration ersetzt | 9 |
| Historischer Backfill ohne aktuell beobachtbare Quell-/Zielzeilen; Ausführung nicht beweisbar | 1 |
| Scenario Assessment V2: SQL-Effekt vorhanden, Ledgerregistrierung offen | 4 |
| **Gesamt** | **50** |

Zusätzlich:
- 21 fehlende Remote-Quellmigrationen wurden aus den gespeicherten Remote-Statements rekonstruiert und exakt verglichen.
- Drei Remote-Ledger-Einträge sind inhaltlich durch anders benannte Repository-Dateien abgedeckt.
- Es gibt manuell reconciliierte Remote-Versionen und historische Namensabweichungen.
- Die 50 Dateien sind keine pauschale Push-Warteschlange.
- Alte Ein-Aktiv-Modul-Logik nicht wieder einspielen.
- Backfills und historische DELETE-Statements nicht blind replayen.

Nächster Schritt nach den vier bekannten repair-Befehlen:
1. lokale und Remote-Migrationslisten neu exportieren;
2. jede verbleibende Abweichung einzeln gegen Remote-Statements und Live-Schema abgleichen;
3. pro Datei festlegen: exakt angewendet, durch andere Version abgedeckt, ersetzt, teilweise, offen oder ungeklärt;
4. nur exakte und belegte Fälle registrieren;
5. teilweise fehlende Effekte ausschließlich durch neue Forward Migrationen ergänzen;
6. erst danach Dry Run prüfen. Bis dahin bleibt db push gesperrt.

### 3.4 Bereits erledigte Produktionskorrekturen

Migration 20261111184418_reconcile_player_realtime_assignment_index_and_scoring_privileges.sql wurde angewendet und registriert.

Read-only nachgewiesen:
- public.content_items ist in supabase_realtime.
- public.user_interactions ist in supabase_realtime.
- idx_class_instance_scenario_assignments_active_state ist vorhanden.
- calculate_scenario_requirement_score_v1(jsonb,jsonb) ist nicht für anon oder authenticated ausführbar; Eigentümer kann sie weiterhin intern aufrufen.

Diese Korrekturen nicht erneut ausführen.

## 4. Scenario Assessment V2 – was bereits implementiert ist

### 4.1 Editorial – vorhandener Stand

Datei:
apps/editorial/app/scenarios/[scenarioId]/ContentLearningTaskEditor.tsx

Bereits vorhanden:
- Auswahl bewerteter Aktionen (assessedActions).
- Markierung akzeptierter Aktionen (acceptableActions).
- requirementMode:
  - any: Eine akzeptierte Aktion genügt.
  - all_acceptable: Jede akzeptierte Aktion ist eine eigene Pflichtanforderung.
- Legacy-Fallback ohne requirementMode bleibt any.
- Zuordnung von competencyIds aus dem Kompetenzkatalog.
- Redaktionelle discoveryMessage je Interaktion.
- Server Action normalisiert und validiert die Konfiguration in apps/editorial/app/scenarios/learning-content-actions.ts.

Noch NICHT vorhanden:
- vollständiger Szenario-Ergebnis-/Assessment-Editor;
- redaktionelle Zuordnung von Evidence Indicators zu Lernziel und Kompetenz mit konkreten Beobachtungskriterien;
- konfigurierbare Rubrikbeschreibungen für Emerging, Developing, Secure und Advanced je Kompetenz;
- klare redaktionelle Kriterien, welche Evidenz welche Stufe trägt;
- eigenständige Confidence-Regeln und Konfiguration;
- Ergebnisformulierungen und nächste Lernempfehlung je Kompetenz/Stufe;
- Vorschau des vollständigen späteren Schüler-Ergebnisses;
- Gewichte sind im Datenmodell/Scoring vorbereitet, aber nicht als vollständige redaktionelle Gewichtungsoberfläche umgesetzt.

Die Editorial-Erweiterung darf nicht zu einer überladenen Einzelinteraktions-Maske werden. Ziel ist ein schlanker Szenario-Assessment-Bereich: wenige Zielkompetenzen, passende Indikatoren, klare Kriterien, Pflicht/optional, Gewicht, Rubrik und Ergebnistext. Wiederverwendbare Vorlagen sind vorzusehen.

### 4.2 Datenbank und Scoring – vorhandener Stand

Dateien:
- supabase/migrations/20261110100000_scenario_assessment_calculation_v1.sql
- supabase/migrations/20261110110000_discrete_action_requirement_modes.sql
- supabase/migrations/20261110120000_scenario_assessment_snapshots_and_results.sql
- supabase/migrations/20261110130000_teacher_controlled_student_scenario_reports.sql

Vorhanden:
- calculate_scenario_requirement_score_v1(jsonb,jsonb), reine immutable Scoring-Funktion.
- Pflichtanforderungen zählen in Zähler und Nenner.
- Optionale Anforderungen werden ignoriert.
- Fehlende Pflichtanforderung: 0 Punkte im Prozentwert, aber Status unobserved.
- Outcomes: success=1, partial=0.5, not_yet=0.
- Letzter chronologischer Versuch pro Requirement gewinnt.
- Keine Pflichtanforderungen: not_assessable, Prozent null.
- Ergebnis enthält auch requirements-Detaildaten mit requirement_id, required, weight, outcome und points.
- Snapshot friert die Bewertungsgrundlage bei Zuweisung/Neuzuweisung ein.
- Finalizer führt Feed-Ereignisse aus learning_result_events und Lernkartenantworten aus scenario_learning_card_responses zusammen.
- Nur Ereignisse ab Snapshot-Zeitpunkt und mit IDs aus dem Snapshot werden berücksichtigt.
- Ergebnis wird in scenario_assessment_results.requirement_result gespeichert.
- Finalizer aktualisiert keinen langfristigen Kompetenzstand.
- Studentensichtbarkeit wird durch student_reports_enabled gesteuert; Standard false.
- Ergebniszugriff der Lehrkraft erfolgt über RLS. Schüler haben keine direkten Tabellenrechte.

Noch nicht vorhanden:
- Berechnung der vier Kompetenzstufen.
- Confidence-Berechnung.
- Kompetenzbezogene Evidence-/Rubrik-Auswertung.
- Ergebnisempfehlungen.
- Langfristige Kompetenzaggregation über mehrere Szenarien.

Die aktuelle Ergebnisfunktion ist daher eine **Anforderungserfüllung**, noch keine vollständige Kompetenzdiagnostik.

### 4.3 Bestehender Datenfluss

- Bewertete Feed-Aktionen: learning_result_events.
- Szenario-Lernkarten: scenario_learning_card_responses.
- Die Lernkarten-RPC schreibt derzeit keine learning_evidence_events; die neue Szenario-Auswertung liest die Antworten direkt.
- learning_evidence_events und competency_assessments sind als Architekturbausteine vorhanden, aber nicht als vollständiger gemeinsamer Ergebnisfluss angebunden.
- Keine doppelten Evidenz-Inserts erzeugen, nur um Tabellen künstlich zu vereinheitlichen.
- Der aktuelle Finalizer nutzt beide Quelltabellen direkt und behält die Herkunft im Requirement-Modell.

## 5. Ergebnis-Frontend – tatsächlicher Stand und offene Arbeit

### 5.1 Player

Dateien:
- apps/player/app/feed/FeedClient.tsx
- apps/player/app/feed/scenario-assessment-actions.ts

Bereits umgesetzt:
- Schüler können ein Szenario/einen Lernlauf explizit beenden.
- Abschlussdialog weist auf nicht bearbeitete Pflichtanforderungen hin.
- Server Action ruft finalize_scenario_assessment_v1 auf.
- Ergebnis wird gespeichert.
- Bei Lehrerfreigabe zeigt der Player Prozentwert und Anzahl vollständig/teilweise/nicht erfüllt/ohne Nachweis.
- Bei fehlender Freigabe erscheint ein verständlicher Hidden-Hinweis.
- Ergebnisstatus snapshot_missing/not_assessable wird behandelt.
- Ergebnis wird nach Reload erneut geladen.
- UI erklärt, dass Prozentwert keine Schulnote und kein langfristiger Kompetenzstand ist.

Noch offen:
- Die Player-Typdefinition ScenarioAssessmentResult bildet aktuell nur Status, Prozent, Zähler und Metadaten ab; das requirements-Detailarray muss ergänzt werden.
- Die vorhandenen requirement-Details aus der DB werden in der Ergebnisoberfläche noch nicht aufgeschlüsselt.
- Keine Kompetenzkarten je Zielkompetenz mit Stufe, Confidence, Erklärung und Evidenzbezug.
- Keine redaktionell definierten „Das kannst du schon“-/„Das kannst du als Nächstes üben“-Texte.
- Kein verständlicher Umgang mit fehlender Confidence bzw. „nicht ausreichend beurteilbar“ pro Kompetenz.
- Noch keine klare, didaktisch gute Darstellung bei mehreren Szenarien im Lernlauf.
- Mobile Darstellung, Barrierefreiheit und Texte für die verschiedenen Ergebniszustände testen.

Zielbild Player:
1. Abschlussübersicht mit Szenario-Anforderungserfüllung.
2. Aufklappbare Liste der Anforderungen: erfüllt, teilweise, nicht erfüllt, nicht beobachtet.
3. Separater Kompetenzbereich je Zielkompetenz: qualitative Stufe, Confidence, kurze Begründung und welche Nachweise dazu geführt haben.
4. Konkrete nächste Übung/Empfehlung, falls redaktionell definiert.
5. Klarer Hinweis, dass Szenarioergebnis und langfristiger Kompetenzstand zwei verschiedene Dinge sind.
6. Keine Kompetenzstufe aus dem Prozentwert ableiten.

### 5.2 Editorial

Der aktuelle ContentLearningTaskEditor ist eine Konfiguration einzelner Feed-Aktionen, kein vollständiger Editor für das Szenario-Abschlussprofil.

Nächste Editorial-Arbeit:
- Assessment-Konfiguration auf Szenarioebene konzipieren.
- Kompetenz(en) und Lernziele verknüpfen.
- Evidence Indicator / beobachtbares Kriterium je Kompetenz definieren.
- Zulässige Quellen/Events zuordnen.
- Pflicht/optional und Gewicht festlegen.
- Vier qualitative Rubrikstufen mit konkreten, kompetenzbezogenen Beschreibungen pflegen.
- Confidence-Kriterien redaktionell nachvollziehbar machen; numerische Grenzwerte erst nach Testkalibrierung festlegen.
- Ergebnis- und Empfehlungstexte definieren.
- Preview mit Beispielergebnissen einbauen.
- Server Actions validieren; Client darf niemals Outcome, Prozent, Kompetenzstufe oder Confidence bestimmen.
- Snapshot muss die zum Assignment-Zeitpunkt gültige Konfiguration vollständig einfrieren.

### 5.3 Teacher-Report

Der bestehende individuelle Teacher-Report unter apps/teacher/app/classes/[classId]/reports/[studentId]/page.tsx zeigt bereits eine gespeicherte Scenario-Assessment-Zusammenfassung mit Prozentwert und Zählerständen.

Noch offen ist die spätere Angleichung an das vollständige Kompetenzprofil, sobald dieses berechnet wird. Die bestehende ältere Learning-Evidence-Auswertung darf nicht unbemerkt mit dem neuen Szenario-Abschlusswert vermischt werden.

## 6. Fachliche Regeln, die nicht verwässert werden dürfen

- Szenario-Anforderungserfüllung, Kompetenzstufe und langfristige Kompetenzentwicklung sind drei getrennte Ergebnisse.
- Prozentwert ist nur die Erfüllung expliziter Pflichtanforderungen.
- Emerging / Developing / Secure / Advanced werden qualitativ und kompetenzbezogen begründet.
- Keine Umrechnung des Szenario-Prozentwertes in eine Kompetenzstufe.
- Confidence ist unabhängig von der Stufe.
- Mehrere Retries derselben Handlung sind keine unabhängigen Evidenzen.
- Ein einzelner Klick, Like oder eine einzelne Feed-Aktion belegt keine stabile Kompetenz.
- „Nicht ausreichend beurteilbar“ ist ein eigener Zustand, keine fünfte Kompetenzstufe.
- Nicht beobachtet ist nicht gleich nicht gekonnt.
- Das Learning-Design-Framework enthält optionale Modellwerte 0.00–1.00 für Evidence Quality. Diese sind keine verbindlichen DR1FT-Szenario-Schwellen und dürfen nicht ungeprüft als Schulnoten oder Kompetenzgrenzen verwendet werden.
- Die vier Stufen und Confidence sind in docs/architecture/scenario-assessment-v2.md beschrieben.
- Das detaillierte Learning-Design-Framework liegt in der Projektquelle DR1FT_Learning_Design_Assessment_Framework_v1.0.md.

## 7. Aktuelle Produktions-Testlage

Read-only geprüft:
- scenario_assessment_snapshots: 1 Datensatz.
- Dieser Snapshot gehört zur Assignment-ID a2ef5b2d-7303-4c2c-91a6-cd0d50d76e3e und Szenario-ID 22222222-2222-2222-2222-222222222201 („Fake News erkennen (Stufe 1)“).
- capture_reason: migration_cutover.
- Snapshot status: not_assessable, requirements [].
- Das Szenario hat aktuell 0 Pflicht-Lernkarten und 0 bewertbare Feed-Assessment-Items.
- scenario_assessment_results: 0 Datensätze.

Das ist kein Beleg für einen defekten Finalizer. Es gibt schlicht keine bewertbaren Pflichtanforderungen im vorhandenen Snapshot.

Für einen echten End-to-End-Test:
1. Bevorzugt eine Test-/Staging-Klasse und ein dediziertes Test-Szenario verwenden.
2. Mindestens eine explizite Pflicht-Lernkarte (required=true, keine Reflection) oder eine gültige Feed-Assessment-Konfiguration mit assessedActions und acceptableActions anlegen.
3. Neue oder ausdrücklich reaktivierte Zuweisung erzeugt den Snapshot.
4. Mit einem Schülerkonto die Aktionen/Antworten ausführen.
5. Szenario beenden.
6. Ergebnis in DB, Player und Teacher-Report vergleichen.
7. Lehrerfreigabe false/true testen.
8. Wiederholung, fehlende Anforderung, optionale Anforderung und Reload testen.

Keine Produktionsinhalte oder Klassen für einen Test verändern, bevor der Nutzer dies ausdrücklich freigibt.

## 8. Empfohlene Reihenfolge für den Folgechat

### Phase A – Migrationen geradeziehen

1. Branch und Dateien prüfen.
2. Vier exakte manuell ausgeführte Scenario-Assessment-Migrationen gezielt mit Supabase CLI als applied registrieren.
3. Remote-Ledger neu abrufen.
4. Restliche 50 Repository-only-Dateien anhand des 50-Review-Dokuments einzeln dispositionieren.
5. Drei Inhalts-Mappings und 21 wiederhergestellte Remote-Quellen beibehalten.
6. Ungeklärte Backfill-/Supersession-Fälle nicht raten.
7. Keine weiteren Produktionsänderungen, bis Reconciliation sauber dokumentiert ist.
8. Dry Run nur dann, wenn alle lokalen und Remote-Abweichungen nachvollziehbar erklärt sind.

### Phase B – Bewertungsmodell fachlich und technisch finalisieren

1. Bestehende Learning-Design- und Assessment-Spezifikation gegen die aktuelle Implementierung prüfen.
2. Editorial-Konfigurationsmodell für Kompetenzindikatoren, Rubriken, Quellen, Pflichtstatus, Gewicht und Ergebnisformulierungen definieren.
3. Datenvertrag für Kompetenzresultat und Confidence festlegen.
4. Prüfen, ob scenario_assessment_snapshots.requirements und scenario_assessment_results.requirement_result erweitert werden oder ein separates competency_result-Feld sinnvoll ist.
5. Bestehende competency_assessments-Struktur prüfen, bevor sie wiederverwendet wird.
6. Snapshot-Versionierung und Scoring-Version berücksichtigen.
7. Erst danach additive Migration entwerfen.

### Phase C – Editorial-Frontend

1. Szenario-Assessment-Editor ergänzen, nicht die bestehende Aktionsmaske unkontrolliert aufblähen.
2. Kompetenz- und Lernzielzuordnung.
3. Evidence Indicators und konkrete Rubrikbeschreibungen.
4. Confidence-Konfiguration ohne erfundene Schwellen.
5. Ergebnis-/Empfehlungstexte.
6. Preview für Lehrkräfte/Redaktion.
7. Servervalidierung und Speichern/Reload testen.

### Phase D – Server-Auswertung und Player

1. Serverseitige Kompetenzbewertung aus den zulässigen Evidenzquellen ergänzen.
2. Kompetenzstufe und Confidence getrennt berechnen.
3. Keine Ableitung aus Szenario-Prozentwert.
4. Ergebnisdetails und Begründungen in RPC/Server Action bereitstellen.
5. Player-Ergebnisansicht um Requirement-Aufschlüsselung und Kompetenzprofil erweitern.
6. Teacher-Report auf denselben Ergebnisvertrag umstellen, ohne alte Auswertungen zu verfälschen.
7. Sichtbarkeitsschalter weiterhin serverseitig durchsetzen.

### Phase E – Tests und Abschluss

- 1 von 2 Pflichtanforderungen = 50 %.
- Zwei Alternativen für eine Anforderung zählen maximal einmal.
- Zwei unabhängige Pflichtanforderungen zählen getrennt.
- Optionale Anforderungen verändern Prozent nicht.
- Letzter Versuch gewinnt.
- Kein Versuch = unobserved und 0 Punkte im Szenario-Prozentwert.
- Kein Pflicht-Requirement = not_assessable und percentage null.
- Keine Kompetenzstufe aus einem Prozentwert.
- Einzelklick erzeugt keine stabile Kompetenz.
- Confidence niedrig/mittel/hoch mit Testfällen und begründeten Regeln.
- Snapshot bleibt bei späterer Editorial-Änderung unverändert.
- Lehrerfreigabe false/true.
- Schüler kann Ergebnis nicht direkt aus Ergebnistabelle lesen.
- Teacher-Report und Player zeigen dieselbe gespeicherte Ergebnisbasis.
- Reload, mehrere Szenarien und mobile Darstellung.
- Build und relevante Tests für Editorial, Player und Teacher.

## 9. Dateien, die der Folgechat zuerst lesen muss

**Migrationen und Status**
- docs/architecture/supabase-migration-rules.md
- docs/architecture/supabase-production-migration-status.md
- docs/architecture/supabase-migration-ledger-reconciliation.md
- docs/architecture/supabase-migration-50-review.md

**Assessment**
- docs/architecture/scenario-assessment-v2.md
- docs/architecture/learning-results-assessment-inventory-v1.md
- docs/architecture/learning-results-data-model-v1.md
- supabase/migrations/20261110100000_scenario_assessment_calculation_v1.sql
- supabase/migrations/20261110110000_discrete_action_requirement_modes.sql
- supabase/migrations/20261110120000_scenario_assessment_snapshots_and_results.sql
- supabase/migrations/20261110130000_teacher_controlled_student_scenario_reports.sql
- supabase/migrations/20261111184418_reconcile_player_realtime_assignment_index_and_scoring_privileges.sql

**Frontend**
- apps/editorial/app/scenarios/[scenarioId]/ContentLearningTaskEditor.tsx
- apps/editorial/app/scenarios/learning-content-actions.ts
- apps/player/app/feed/FeedClient.tsx
- apps/player/app/feed/scenario-assessment-actions.ts
- apps/teacher/app/classes/[classId]/ScenarioToggle.tsx
- apps/teacher/app/classes/[classId]/actions.ts
- apps/teacher/app/classes/[classId]/reports/[studentId]/page.tsx

**Fachliche Projektquelle**
- DR1FT_Learning_Design_Assessment_Framework_v1.0.md
- DR1FT_Tracking_und_Auswertungsstruktur_v0.1.md

## 10. Startanweisung für den Folgechat

Arbeite zunächst ausschließlich lesend. Prüfe den tatsächlichen Git-HEAD, Branch, Arbeitsbaum, die vier Migrationen und die Remote-Migrationsliste. Bestätige dann den Status der vier repair-Versionen. Führe keine produktive Änderung aus, bevor die exakte Zuordnung und die nächste kleine Aktion mit dem Nutzer abgestimmt sind.

Danach Phase A abschließen. Erst wenn die Migrationshistorie belastbar geordnet ist, Phase B bis E bearbeiten. Der aktuelle Requirement-Scorer und die bereits vorhandene Player-Abschlussanzeige sind Ausgangspunkt – nicht neu bauen.
