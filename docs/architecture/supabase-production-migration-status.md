# DR1FT – Production-Migrationsstatus und Abhakliste

Stand: 2026-11-11  
Supabase-Projekt: `oegshknzeqmjmkraxozr`  
Arbeitsbranch: `fix/scenario-assessment-v2`

Dieses Dokument ist das verbindliche Arbeitsregister für die Migrationen, die direkt über den Supabase SQL Editor eingespielt wurden. Es trennt ausdrücklich den tatsächlichen Datenbankzustand von der Supabase-Migrationshistorie.

## Statusdefinitionen

- **Angewendet + registriert:** Änderung ist in der Datenbank vorhanden und die Version steht in `supabase_migrations.schema_migrations`.
- **Angewendet, nicht registriert:** Änderung ist in der Datenbank nachgewiesen, aber ihre ursprüngliche Version fehlt in der Migrationstabelle. Nicht erneut ausführen; nach Abgleich per Supabase CLI als `applied` registrieren.
- **Effekt vorhanden / später ersetzt:** Die frühere Migration ist durch einen späteren Stand repräsentiert oder abgelöst. Nicht erneut ausführen.
- **Teilweise vorhanden:** Einzelne Bestandteile fehlen; gezielte Nachbesserung ist nötig.
- **Ungeklärt:** Der aktuelle Zustand beweist nicht, ob eine historische Datenmigration ausgeführt wurde.
- **Offen:** Änderung fehlt tatsächlich und muss geplant werden.

## Neu erledigte Nachbesserungen (11.11.2026)

Die folgenden drei Korrekturen wurden in einer einzelnen Supabase-Migration ausgeführt und unmittelbar danach read-only verifiziert:

| Punkt | Status | Verifikation |
|---|---|---|
| Realtime-Publikation enthält `public.content_items` | Erledigt | Eintrag in `pg_publication_tables` vorhanden |
| Realtime-Publikation enthält `public.user_interactions` | Erledigt | Eintrag in `pg_publication_tables` vorhanden |
| Index `idx_class_instance_scenario_assignments_active_state` | Erledigt | Index vorhanden |
| Ausführungsrechte der Hilfsfunktion `calculate_scenario_requirement_score_v1(jsonb,jsonb)` | Erledigt | `anon=false`, `authenticated=false`, Eigentümer kann ausführen |

Die SQL-Quelle liegt unter:
`supabase/migrations/20261111184418_reconcile_player_realtime_assignment_index_and_scoring_privileges.sql`

Die Migration wurde über Supabase angewendet und ist in der Remote-Migrationsliste als `20261111184418` registriert.

## Scenario Assessment V2 – SQL-Editor-Ausführung

Die vier folgenden Migrationen wurden zuvor direkt über den SQL Editor eingespielt. Die jeweiligen Datenbankobjekte und sicherheitsrelevanten Eigenschaften sind vorhanden. Die vier ursprünglichen Versionsnummern fehlen aber noch in der Remote-Migrationshistorie.

| Version | Datei | Datenbankstatus | Ledgerstatus |
|---|---|---|---|
| 20261110100000 | `20261110100000_scenario_assessment_calculation_v1.sql` | Bewertungsfunktion vorhanden; Smoke-Test ergab korrekt 50 % bei 1 von 2 Anforderungen | Registrierung ausstehend |
| 20261110110000 | `20261110110000_discrete_action_requirement_modes.sql` | Feed-RPC vorhanden; authenticated execute ja, anon execute nein | Registrierung ausstehend |
| 20261110120000 | `20261110120000_scenario_assessment_snapshots_and_results.sql` | Snapshot-/Ergebnistabellen, RLS und Trigger vorhanden | Registrierung ausstehend |
| 20261110130000 | `20261110130000_teacher_controlled_student_scenario_reports.sql` | `student_reports_enabled` vorhanden, Standardwert false; Ergebniszugriff für Lehrkräfte policy-gesteuert | Registrierung ausstehend |

**Wichtig:** Diese vier SQL-Dateien nicht erneut ausführen. Nach Sicherung und Abgleich der Dateien müssen ausschließlich die vier Versionen in der Supabase-Migrationshistorie als bereits angewendet registriert werden. Dafür ist `supabase migration repair <version> --status applied` vorgesehen. Die Reparatur darf erst erfolgen, wenn die vier lokalen Dateien im exakt passenden Repository-Stand vorhanden sind und die Versionsnummern remote noch fehlen. Keine direkten INSERTs in `supabase_migrations.schema_migrations`.

Die Supabase CLI-Dokumentation beschreibt `migration repair` ausdrücklich zum Abgleich einer auseinander gelaufenen lokalen und Remote-Migrationshistorie: https://supabase.com/docs/reference/cli/supabase-migration-repair

## Abgleich der 50 Repository-only-Migrationen

Die frühere Einzelprüfung ist in [supabase-migration-50-review.md](./supabase-migration-50-review.md) dokumentiert. Nach den Nachbesserungen vom 11.11.2026 ergibt sich folgender Arbeitsstand:

| Kategorie | Anzahl | Behandlung |
|---|---:|---|
| Effekte in Produktion vorhanden (einschließlich jetzt ergänzter Realtime- und Index-Effekte) | 36 | Nicht erneut ausführen |
| Durch spätere Architektur/Migration ersetzt | 9 | Historisch belassen, nicht erneut ausführen |
| Historischer Daten-Backfill ohne aktuell beobachtbare Quell-/Zielzeilen | 1 | Ausführung nicht beweisbar; nicht blind wiederholen |
| Scenario Assessment V2: SQL-Effekt vorhanden, Ledgerregistrierung ausstehend | 4 | Nur Migration-Historie nach Abgleich reparieren |
| **Summe** | **50** | |

Die drei Remote-Ledger-Einträge, die bereits durch anders benannte Repository-Dateien abgedeckt sind, bleiben als Inhalts-Matches dokumentiert; keine Duplikate anlegen.

## Remote-Ledger – Kontrollpunkte

- Vor der Reconciliation: 138 Remote-Einträge.
- Neu angewendete Reconciliation-Migration: `20261111184418`.
- Erwarteter Remote-Stand danach: 139 Einträge.
- Die vier Scenario Assessment Versionen `20261110100000` bis `20261110130000` sind noch nicht registriert.
- Der historische Bestand enthält manuell reconciliierte Versionsnummern und Namensabweichungen. Deshalb darf die Liste der Repository-Dateien ohne gleichnamigen Ledger-Eintrag niemals als Push-Warteschlange interpretiert werden.

## Verbindlicher Ablauf für künftige SQL-Editor-Änderungen

Vor jeder Änderung direkt in Produktion:

1. Zuerst eine Migration-Datei im Branch anlegen.
2. SQL aus dieser Datei im SQL Editor ausführen, falls die Änderung ausnahmsweise manuell erfolgen muss.
3. Direkt danach den tatsächlichen Effekt read-only prüfen (Objekte, Definitionen, Policies, Grants, Trigger, Indizes oder Daten – je nach Änderung).
4. Version als **angewendet, nicht registriert** in diesem Register erfassen.
5. Nach Prüfung die Migration mit Supabase CLI als `applied` registrieren.
6. Danach `supabase migration list` prüfen und den Status auf **angewendet + registriert** setzen.
7. Erst wenn lokaler und Remote-Stand abgeglichen sind, darf `supabase db push` wieder erwogen werden.

**Nicht erlaubt:** pauschales `db push`, blindes erneutes Ausführen historischer SQL-Dateien, manuelle INSERTs in die Migrationstabelle oder `migration repair` ohne objektbezogenen Nachweis.

## Noch offen

- [ ] Die vier Scenario Assessment Versionen nach Abgleich der lokalen Dateien mit `supabase migration repair <version> --status applied` registrieren.
- [ ] Anschließend Remote-Ledger und lokale Migrationen erneut vollständig vergleichen.
- [ ] Einen echten Scenario-Assessment-Test mit mindestens einer expliziten Pflichtanforderung durchführen. Der derzeit vorhandene Test-Snapshot für „Fake News erkennen (Stufe 1)“ ist `not_assessable`, weil aktuell keine Pflicht-Lernkarten und keine bewertbaren Feed-Aktionen im Szenario vorhanden sind.
- [ ] Danach abschließenden Security-/Performance-Advisor-Check dokumentieren.

## Nachweisgrenzen

Die Datenbankprüfung beweist den aktuellen Zustand der Objekte. Sie beweist nicht rückwirkend, an welchem Tag oder über welchen Weg jede frühere SQL-Anweisung ausgeführt wurde. Wo nur der Effekt vorhanden ist, wird deshalb nicht behauptet, die exakte historische Migration sei sicher ausgeführt worden.
