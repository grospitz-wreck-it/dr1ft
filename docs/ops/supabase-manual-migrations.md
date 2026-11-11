# Supabase – manuell ausgeführte Migrationen

Stand: 2026-11-11

## Ausgeführt

Der Projektinhaber hat die folgenden drei SQL-Migrationen am 11.11.2026 manuell im Supabase SQL Editor ausgeführt:

1. `20261111210000_scenario_level_completion_feedback.sql`
2. `20261111213000_scenario_assessment_preview_v1.sql`
3. `20261111220000_snapshot_scenario_completion_feedback.sql`

Supabase-Projekt: `oegshknzeqmjmkraxozr`

Quelle der Ausführung: manuelle Ausführung im Supabase Dashboard → SQL Editor durch den Projektinhaber.

## Wichtig für spätere Analysen und Migrationsplanung

- Diese drei Migrationen gelten als **bereits auf der Supabase-Datenbank ausgeführt**. Sie dürfen bei späteren Analysen nicht als fehlend oder noch anzuwendend eingeplant werden.
- Vor jeder weiteren Migrationsplanung muss der tatsächliche Remote-Schema-Stand geprüft werden.
- Die manuelle Ausführung im SQL Editor bedeutet nicht automatisch, dass die Einträge in `supabase_migrations.schema_migrations` bzw. im Supabase-Migrationsledger vorhanden sind.
- Deshalb bei späteren Vergleichen ausdrücklich zwischen **SQL bereits ausgeführt** und **Migration im Ledger registriert** unterscheiden.
- Nicht erneut blind ausführen und nicht per `supabase db push` nachholen. Zuerst Remote-Schema und Migrationsledger einzeln prüfen; bei Bedarf Ledger kontrolliert abgleichen, ohne die SQL-Änderungen erneut anzuwenden.
- Der bekannte divergente Migrationsstand (lokal und remote unterschiedliche Historien) bleibt davon unberührt. Diese drei manuell ausgeführten Migrationen sind als zusätzliche bestätigte Information zu berücksichtigen.

## Änderungsumfang

Die drei Migrationen betreffen:
- Szenario-weite Abschluss-Feedbacktexte und konfigurierbare Schwellenwerte,
- die Vorschau des Abschluss-Feedbacks für Schüler,
- das Einfrieren der Feedback-Konfiguration im Assessment-Snapshot.

Diese Notiz dokumentiert die vom Projektinhaber bestätigte Ausführung. Sie ersetzt keine technische Verifikation des aktuellen Datenbank- oder Ledger-Zustands.
