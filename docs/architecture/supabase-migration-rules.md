# DR1FT – Verbindliches Supabase-Migrationsregelwerk

**Dokumenttyp:** Verbindlicher Engineering- und Repository-Standard  
**Geltungsbereich:** Alle DR1FT-Apps, Supabase-Projekte, Datenbankschemata und KI-/Entwicklungsagenten  
**Status:** Verbindlich  
**Operatives Register:** [supabase-production-migration-status.md](./supabase-production-migration-status.md)  
**Reconciliation-Historie:** [supabase-migration-ledger-reconciliation.md](./supabase-migration-ledger-reconciliation.md)

Dieses Dokument ergänzt und präzisiert die bisherigen DR1FT-Migrationsregeln. Bei Widersprüchen gelten die hier beschriebenen Sicherheitsregeln für den Umgang mit Remote-Datenbanken und Migration-History.

---

## 1. Grundprinzipien

1. Eine Migration ist Teil der unveränderlichen technischen Geschichte von DR1FT.
2. Eine einmal auf Remote angewendete Migration wird inhaltlich nicht mehr geändert.
3. Eine Versionsnummer wird niemals für eine andere Migration wiederverwendet.
4. Jede produktive Schemaänderung muss als SQL-Quelle im Git-Repository nachvollziehbar sein.
5. Datenbankzustand und Migration-Ledger sind zwei unterschiedliche Nachweise. Beide müssen kontrolliert werden.
6. Ein fehlender Ledger-Eintrag beweist nicht, dass SQL nicht ausgeführt wurde.
7. Ein vorhandenes Datenbankobjekt beweist nicht automatisch, welche historische Migration es erzeugt hat.
8. Bei unklarer Historie gilt STOP. Kein erzwungener Push und kein blindes Replay.

## 2. Verbindliche Zustandsbegriffe

Jede Migration erhält bei einem Abgleich genau einen nachvollziehbaren Status:

| Status | Bedeutung | Zulässige nächste Aktion |
|---|---|---|
| **Angewendet + registriert** | SQL-Effekt ist vorhanden und Versionsnummer steht im Remote-Ledger | Normaler Betrieb; Quelle unverändert lassen |
| **Angewendet, nicht registriert** | SQL-Effekt ist nachgewiesen, Versionsnummer fehlt im Ledger | Quelle prüfen, dann gezielte CLI-Reparatur |
| **Effekt durch andere Migration abgedeckt** | Der Remote-Zustand ist durch eine andere, belegte Migration entstanden | Mapping dokumentieren; keine zweite Registrierung ohne exakten Versionsnachweis |
| **Superseded / ersetzt** | Spätere Architektur hat die frühere Änderung abgelöst | Historisch dokumentieren; niemals erneut ausführen |
| **Teilweise angewendet** | Nur ein Teil der erwarteten Effekte ist vorhanden | Fehlende Wirkung isolieren und als neue Forward Migration ergänzen |
| **Offen / nicht angewendet** | Erwartete Wirkung fehlt und ist nicht anderweitig abgedeckt | Neue, geprüfte Migration planen |
| **Ungeklärt** | Ausführung oder Wirkung kann nicht belastbar nachgewiesen werden | Nicht ausführen und nicht als applied registrieren; weiter untersuchen |

**Wichtig:** „Effekt vorhanden“ und „Migration angewendet“ dürfen nicht synonym verwendet werden. Bei mehreren möglichen historischen Ursachen muss die genaue Herkunft offen bleiben.

## 3. Normalfall: Migration vor der Datenbankänderung

Der verbindliche Standardablauf lautet:

1. Remote- und lokale Migrationshistorie prüfen.
2. Höchste belegte Versionsnummer und Namenskonvention prüfen.
3. Neue Migration im aktuellen Feature-Branch erstellen.
4. SQL und Abhängigkeiten prüfen.
5. Migration lokal bzw. auf einer Wegwerf-/Staging-Datenbank testen.
6. Dry Run ausführen.
7. Dry-Run-Ausgabe auf ausschließlich erwartete Migrationen prüfen.
8. Nur nach ausdrücklicher Freigabe produktiv anwenden.
9. Datenbankeffekte und Remote-Ledger read-only verifizieren.
10. Migration und zugehörigen Code gemeinsam committen.

~~~bash
npx supabase migration list
npx supabase db push --dry-run
# Nur nach Prüfung und Freigabe:
npx supabase db push
npx supabase migration list
git status
~~~

Ein Dry Run mit unerwarteten Migrationen ist ein STOP-Signal.

## 4. Ausnahmefall: SQL wurde direkt im Supabase SQL Editor ausgeführt

Direkte SQL-Editor-Eingriffe auf Remote sind eine Ausnahme, kein regulärer Workflow. Wenn sie notwendig waren, gilt zwingend dieser Prozess:

### 4.1 Vor der Ausführung

- Zuerst eine vollständige Migration-Datei im Feature-Branch anlegen.
- Die SQL-Anweisung im Editor exakt aus dieser Datei übernehmen.
- Datei, Versionsnummer und beabsichtigte Wirkung vor dem Ausführen prüfen.
- Bei destruktiven Statements, Backfills, DELETE/UPDATE oder privilegierten Funktionen gesonderte Freigabe und Datenfolgenprüfung verlangen.

### 4.2 Direkt nach der Ausführung

- Den tatsächlichen Effekt read-only prüfen: Tabellen, Spalten, Indizes, Constraints, Funktionen, Trigger, RLS, Policies, Grants, Realtime-Publikation, Storage oder Daten – je nach Migration.
- Remote-Migrationsliste erneut abrufen.
- Den Zustand im operativen Register als **Angewendet, nicht registriert** erfassen, solange die Version im Ledger fehlt.
- Keine zweite Ausführung derselben SQL-Datei nur deshalb starten, weil der Ledger-Eintrag fehlt.

### 4.3 Migration-History registrieren

Wenn alle folgenden Bedingungen erfüllt sind, darf die Version mit der Supabase CLI als angewendet registriert werden:

- Die lokale Migrationsdatei liegt im Repository und ist die exakte SQL-Quelle, die auf Remote ausgeführt wurde.
- Der vollständige erwartete Effekt ist auf Remote nachgewiesen.
- Die Versionsnummer fehlt tatsächlich in der Remote-Migrationshistorie.
- Es gibt keine widersprüchliche Migration mit derselben Version.
- Die Datei enthält keine zusätzlichen, nie ausgeführten Statements.
- Die Zuordnung ist im operativen Register dokumentiert.

Dann:

~~~bash
npx supabase migration repair <VERSION> --status applied
npx supabase migration list
~~~

**Was migration repair --status applied tut:** Es registriert die angegebene Versionsnummer in der Supabase-Migrationshistorie. Es führt den SQL-Inhalt der Datei nicht aus und repariert keine fehlenden Datenbankobjekte.

Offizielle CLI-Dokumentation: https://supabase.com/docs/reference/cli/supabase-migration-repair

### 4.4 Wann NICHT repariert werden darf

Keine Registrierung als applied, wenn:

- nur ein ähnlicher Effekt sichtbar ist, aber die konkrete Migration nicht nachgewiesen wurde;
- die Datei nachträglich verändert wurde und nicht mehr dem ausgeführten SQL entspricht;
- nur ein Teil der Migration ausgeführt wurde;
- die Migration unter einer anderen Remote-Version oder einem anderen Namen ausgeführt wurde und die Zuordnung nicht exakt belegt ist;
- die Migration Daten-Backfills oder Löschungen enthält, deren Ausführung nicht nachgewiesen ist;
- eine spätere Migration den Effekt ersetzt hat.

In diesen Fällen Mapping, Supersession oder offene Teilwirkung dokumentieren. Fehlende Funktionalität wird – falls nötig – über eine neue Forward Migration ergänzt. Keine historischen Dateien umschreiben, um sie passend zu machen.

## 5. Migration-History-Konflikte: STOP-Regel

Bei Meldungen wie:

- Remote migration versions not found in local migrations directory
- Found local migration files to be inserted before the last migration on remote
- doppelte Versionsnummern
- unbekannte Remote-Migrationen
- unerwartete Migrationen im Dry Run
- lokale und Remote-Historie nicht nachvollziehbar

gilt:

**STOP – kein db push, kein --include-all, kein blindes Replay.**

Stattdessen:

1. Remote-Ledger vollständig auslesen.
2. Lokale Migrationsdateien inventarisieren.
3. Versionsnummern und Dateinamen vergleichen.
4. Remote gespeicherte SQL-Statements mit Repository-Dateien vergleichen, soweit verfügbar.
5. Live-Schema, Funktionen, Trigger, Policies, Grants, Indizes und Datenwirkungen prüfen.
6. Jede Abweichung einer Statuskategorie aus Abschnitt 2 zuordnen.
7. Nur exakte, belegte manuelle Anwendungen mit migration repair registrieren.
8. Fehlende Wirkung ausschließlich über neue Forward Migrationen ergänzen.
9. Erst nach dokumentierter Reconciliation erneut Dry Run ausführen.

## 6. Keine direkten Änderungen am Migration-Ledger

Verboten sind:

- direkte INSERT, UPDATE oder DELETE auf supabase_migrations.schema_migrations;
- manuelle Ledger-Reparaturen über den SQL Editor;
- pauschales Markieren aller lokalen Migrationen als applied;
- pauschales Markieren aller Remote-Einträge als reverted;
- migration repair ohne objektbezogenen Nachweis.

Ausschließlich die Supabase CLI-Reparatur darf für einen belegten Versionsabgleich verwendet werden.

## 7. Unveränderlichkeit, Versionsnummern und Dateinamen

- Eine Versionsnummer darf im aktiven Verzeichnis nur einmal vorkommen.
- Eine angewendete Migration wird niemals inhaltlich geändert oder umbenannt.
- Neue Korrekturen erhalten eine neue, freie Versionsnummer.
- Eine bereits verwendete Versionsnummer wird nie für einen anderen Zweck wiederverwendet.
- Eine historische Migration wird nicht gelöscht, nur weil sie nicht mehr ausgeführt werden darf.
- Archivierte Migrationen müssen eindeutig außerhalb des aktiven Migrationspfades liegen und dürfen nicht versehentlich von der CLI eingelesen werden.

## 8. Idempotenz und Datenmigrationen

Migrationen sollen, wo fachlich sinnvoll, idempotent sein, zum Beispiel mit:

~~~sql
create table if not exists ...
create index if not exists ...
drop policy if exists ...
drop trigger if exists ...
create or replace function ...
~~~

Idempotenz ist kein Freibrief für Wiederholungen. Insbesondere Backfills, DELETE-/UPDATE-Statements, Trigger mit Seiteneffekten und Funktionen mit Datenänderungen müssen vor einem Replay separat geprüft werden.

Datenmigrationen benötigen:
- dokumentierte Quell- und Zielmenge;
- erwartete Anzahl betroffener Zeilen;
- Transaktions- und Rollback-Überlegung;
- Vorher-/Nachher-Prüfung;
- Schutz vor doppelter Ausführung.

## 9. Nach jeder Migration verifizieren

Mindestens prüfen:

- Remote-Migrationsliste;
- betroffene Tabellen und Spalten;
- Constraints und Indizes;
- Funktionssignaturen und Funktionsdefinitionen;
- Trigger;
- RLS-Aktivierung und Policies;
- Tabellen- und Funktionsrechte;
- Storage-Buckets und Storage-Policies;
- Realtime-Publikationsmitgliedschaft;
- relevante Datenwirkungen und Row Counts.

Bei Security-Änderungen zusätzlich Rollenrechte und Zugriffspfade mit anon/authenticated prüfen. Advisor-Warnungen sind im Kontext zu bewerten; erwartete SECURITY DEFINER-RPCs mit serverseitigen Berechtigungsprüfungen dürfen nicht pauschal entfernt werden.

## 10. Git und Produktionsfreigabe

- Migration und zugehöriger Anwendungscode werden im selben Feature-Branch nachvollziehbar gehalten.
- Keine Änderung direkt auf main.
- Kein Merge, kein Produktions-Deployment und keine produktive Datenänderung ohne ausdrückliche Freigabe.
- Kein db push, solange die Reconciliation-Liste offene oder ungeklärte Migrationen enthält.
- Ein Branch-Commit beweist nicht, dass die Migration auf Remote ausgeführt wurde.
- Ein Remote-Ledger-Eintrag beweist nicht, dass die aktuelle lokale Datei inhaltlich unverändert ist; angewendete Dateien müssen deshalb zusätzlich gegen die historische SQL-Quelle geprüft werden.

## 11. DR1FT-Migrationsregister ist Pflicht

Das operative Register ist:

docs/architecture/supabase-production-migration-status.md

Für jede manuell oder automatisiert angewendete Migration werden mindestens erfasst:

- Version und Dateiname;
- Branch/Commit;
- Ausführungsweg (CLI, SQL Editor, sonstiger Weg);
- Datum;
- Datenbankprojekt/Umgebung;
- Verifikation der erwarteten Effekte;
- Ledgerstatus;
- offene Folgearbeiten und Nachweisgrenzen.

Das Register wird nach jeder produktiven Migration aktualisiert. Eintrag erst dann auf **Angewendet + registriert** setzen, wenn Datenbankwirkung und Ledgerstatus beide geprüft wurden.

## 12. Aktueller DR1FT-Sonderfall

Die derzeitige Reconciliation ist im operativen Register dokumentiert. Insbesondere:

- vier Scenario-Assessment-Migrationen wurden direkt im SQL Editor ausgeführt;
- ihre Datenbankeffekte sind vorhanden;
- ihre vier Versionsnummern fehlen noch im Remote-Ledger;
- die vier Dateien dürfen nicht erneut ausgeführt werden;
- nach exakter Quellenprüfung sind ausschließlich die vier Versionen gezielt mit migration repair <version> --status applied zu registrieren;
- die übrigen historischen Abweichungen dürfen nicht pauschal repariert oder erneut ausgeführt werden;
- die Reconciliation-Migration 20261111184418 wurde regulär angewendet und ist registriert.

## DR1FT Golden Rule

> **Erst die Quelle sichern, dann SQL ausführen, dann den Effekt prüfen, dann das Ledger abgleichen.**
>
> **Ein fehlender Ledger-Eintrag ist kein Ausführungsbeweis.**
>
> **Ein vorhandener Datenbankeffekt ist kein Versionsbeweis.**
>
> **Keine manuelle Ledger-Manipulation, kein blindes Replay, kein erzwungener Push.**
>
> **Bei Unsicherheit: STOP, dokumentieren und erst nachweisen.**
