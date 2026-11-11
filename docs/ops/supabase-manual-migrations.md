# Supabase – manuell ausgeführte Migrationen

Stand: 2026-11-11

## Ausgeführt

Der Projektinhaber hat die folgenden drei SQL-Migrationen am 11.11.2026 manuell im Supabase SQL Editor ausgeführt:

1. `20261111210000_scenario_level_completion_feedback.sql`
2. `20261111213000_scenario_assessment_preview_v1.sql`
3. `20261111220000_snapshot_scenario_completion_feedback.sql`

Supabase-Projekt: `oegshknzeqmjmkraxozr`

Quelle der Ausführung: manuelle Ausführung im Supabase Dashboard → SQL Editor durch den Projektinhaber.

## Technische Read-only-Verifikation am 11.11.2026

Die Remote-Datenbank wurde nach der manuellen Ausführung lesend geprüft. Die erwarteten Schema-Objekte sind vorhanden:

- `public.scenarios.completion_feedback` (jsonb, NOT NULL)
- `public.scenario_assessment_snapshots.completion_feedback` (jsonb, nullable)
- `public.preview_scenario_assessment_v1(uuid, uuid)`
- `public.capture_scenario_completion_feedback_v1()`
- Trigger `trg_capture_scenario_completion_feedback` auf `scenario_assessment_snapshots` (aktiviert)
- Die bestehende Bewertungsfunktion `calculate_scenario_requirement_score_v1(jsonb, jsonb)` ist vorhanden.

**Wichtiges Ledger-Ergebnis:** In `supabase_migrations.schema_migrations` existieren zum Prüfzeitpunkt keine Einträge für die drei Versionsnummern `20261111210000`, `20261111213000` und `20261111220000`. Die SQL-Änderungen sind im Remote-Schema vorhanden, aber diese drei Migrationen sind nicht im Supabase-Migrationsledger registriert.

Daraus folgt ausdrücklich: **Nicht erneut ausführen und nicht blind per `supabase db push` nachholen.** Bei späterer Migrationsplanung müssen Schema-Zustand und Ledger-Zustand getrennt bewertet werden. Eine eventuelle Ledger-Reconciliation darf ausschließlich kontrolliert und ohne erneute Ausführung der bereits vorhandenen DDL erfolgen.

## Aktueller Assessment-Datenstand bei der Prüfung

- Assessment-Snapshots: 1
- Davon `not_assessable`: 1
- Davon `ready`: 0
- Snapshot mit eingefrorener `completion_feedback`-Konfiguration: 0
- Gespeicherte `scenario_assessment_results`: 0
- Der aktive Test-/Zuordnungsfall `Fake News erkennen (Stufe 1)` hat einen Snapshot mit 0 bewertbaren Pflichtanforderungen und Status `not_assessable`.
- Für diese Zuordnung steht `student_reports_enabled = false`.

Damit ist die technische Existenz der drei Migrationsergebnisse bestätigt. Ein erfolgreicher End-to-End-Test der drei Feedback-Schwellen, der Ergebnis-Persistierung und der Schülerfreigabe ist damit **noch nicht** erbracht: Es fehlt aktuell ein zugewiesenes, bewertbares Testszenario mit mindestens einer erforderlichen Abfrage und einem Snapshot-Status `ready`.

## Sicherheits- und Advisor-Hinweise

- Die Preview-Funktion prüft eine authentifizierte aktive Schüler-Mitgliedschaft sowie eine aktive Szenariozuweisung.
- Die Preview-Funktion gibt nur `status` und `completion_message` zurück, keine Prozentwerte oder Reportdetails.
- Die Finalizer-Funktion prüft `student_reports_enabled` nach dem internen Speichern des Ergebnisses und gibt bei deaktivierter Freigabe `status = hidden` sowie keine Prozentzahl zurück.
- Supabase Security Advisors melden unter anderem RLS-aktivierte Tabellen ohne Policies sowie zahlreiche SECURITY DEFINER-Funktionen. Die Preview- und Finalizer-Funktionen sind ebenfalls als SECURITY DEFINER ausführbar für `authenticated`; ihre Funktionskörper müssen bei einer gesonderten Sicherheitsprüfung gezielt auditiert werden. Der Advisor-Hinweis allein belegt keine ausnutzbare Schwachstelle.
- Es wurden bei dieser Prüfung keine Daten oder Schemas verändert.

## Wichtig für spätere Analysen und Migrationsplanung

- Diese drei Migrationen gelten als **bereits auf der Supabase-Datenbank ausgeführt**. Sie dürfen bei späteren Analysen nicht als fehlend oder noch anzuwendend eingeplant werden.
- Vor jeder weiteren Migrationsplanung muss der tatsächliche Remote-Schema-Stand geprüft werden.
- Die manuelle Ausführung im SQL Editor bedeutet nicht automatisch, dass die Einträge im Supabase-Migrationsledger vorhanden sind. Für diese drei Migrationen wurde das Fehlen der Ledger-Einträge am 11.11.2026 konkret bestätigt.
- Bei späteren Vergleichen ausdrücklich zwischen **SQL bereits ausgeführt** und **Migration im Ledger registriert** unterscheiden.
- Nicht erneut blind ausführen und nicht per `supabase db push` nachholen. Zuerst Remote-Schema und Migrationsledger einzeln prüfen; bei Bedarf Ledger kontrolliert abgleichen, ohne die SQL-Änderungen erneut anzuwenden.
- Der bekannte divergente Migrationsstand (lokal und remote unterschiedliche Historien) bleibt davon unberührt. Diese drei manuell ausgeführten Migrationen sind als zusätzliche bestätigte und technisch verifizierte Information zu berücksichtigen.

Diese Notiz dokumentiert die vom Projektinhaber bestätigte Ausführung und die Read-only-Prüfung vom 11.11.2026. Sie ersetzt keine erneute technische Verifikation bei späteren Änderungen.
