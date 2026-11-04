# DR1FT – Schuljahre, Klassenfortschreibung und Lehrkräfteverwaltung

Status: Architekturentscheidung / Implementierungsgrundlage  
Branch: `feature/school-year-and-staff-management`

## Verbindliche Produktentscheidungen

1. Nur aktive Mitglieder der jeweiligen Schule mit Schulrolle `school_lead` (Rektor/Schulleitung) oder `school_admin` dürfen Lehrkräfte Klassen zuweisen oder Zuweisungen ändern.
2. Die Zuweisung erfolgt im Bereich **Menschen & Zugänge**, direkt am Datensatz der Lehrkraft. Dort werden eine oder mehrere Klassen ausgewählt.
3. Eine Lehrkraft kann mehreren Klassen zugewiesen sein. Eine Klasse kann mehrere Lehrkräfte haben. Das gilt auch für Doppelspitzen, Vertretungen und Referendare.
4. Eine Schulrolle ist keine Klassenmitgliedschaft. `school_memberships` steuert die Zugehörigkeit und schulweiten Rollen; `class_instance_memberships` steuert die konkrete Klassenmitgliedschaft.
5. Schüler behalten die Regel: höchstens eine aktive Klasseninstanz gleichzeitig.
6. Zusätzliche Lehrkraft-Funktionen werden additiv vergeben. Sie ersetzen nicht die Rolle `teacher` und gewähren nicht automatisch Zugriff auf weitere Klassen.

## Zielmodell Schuljahre

Die bisherige Spalte `class_instances.school_year` ist `text` (z. B. `2026/27`). Künftig wird ein Schuljahr als eigener Datensatz modelliert:

- `school_years.id` (UUID)
- `school_years.school_id` (UUID)
- `school_years.label` (kanonisch, z. B. `2026/2027`)
- `school_years.starts_on` / `ends_on` (Datum)
- `school_years.status` (planned, active, archived)
- `school_years.created_at`

`class_instances` referenziert künftig `school_year_id`. Eine Klasse ist eine konkrete Klasseninstanz in genau einem Schuljahr. Historische Instanzen bleiben erhalten; ein Schuljahreswechsel benennt alte Klassen nicht um.

### Migration und Datenqualität

- Vorhandene Freitextwerte werden inventarisiert und normalisiert.
- Eindeutig erkennbare Jahresangaben werden in kanonische Schuljahresdatensätze überführt.
- Nicht eindeutig parsebare Werte werden nicht stillschweigend geraten oder verworfen, sondern als Migrations-Ausnahmen ausgewiesen.
- Bestehende `school_year`-Werte bleiben während einer Übergangsphase lesbar; erst nach erfolgreicher Prüfung aller Referenzen wird die alte Spalte entfernt.
- Keine Migration wird angewendet, bevor Remote-Migrationshistorie und Live-Schema abgeglichen wurden.

## Klassenfortschreibung

Beim Vorbereiten eines neuen Schuljahres erstellt DR1FT Vorschläge aus den aktiven Klassen des Vorjahres:

- Jahrgangsstufe standardmäßig +1.
- Klassenkennung (z. B. a/b/c) bleibt als Vorschlag erhalten.
- Lehrkraftzuweisungen werden als Vorschlag übernommen und durch Schulleitung/Schuladmin bestätigt oder angepasst.
- Schüler werden nicht automatisch endgültig versetzt. Die verantwortliche Schulverwaltung bestätigt Übernahmen, Wiederholungen, Klassenwechsel, Teilungen und Zusammenlegungen.
- Neue Instanzen erhalten eine neue ID und einen neuen Zugangscode.
- Keine Social-/Runtime-Daten werden in das neue Schuljahr kopiert. Lernhistorie bleibt über die vorhandene User-/Kompetenzhistorie auswertbar, unter Beachtung der Klassen- und Schulberechtigungen.

Die Fortschreibung ist damit automatisierbar, aber bewusst bestätigungspflichtig.

## Additive Funktionen für Lehrkräfte

Zusätzliche Fähigkeiten werden nicht als neue Schul- oder Klassenrollen modelliert. Ziel ist ein Katalog von Berechtigungen mit explizitem Geltungsbereich:

- `permission_key` (stabiler technischer Schlüssel)
- `scope_type` (school oder class_instance)
- `scope_id` (Schule oder konkrete Klasseninstanz)
- `user_id`
- `granted_by`
- `created_at` / optional `revoked_at`

Beispiele für mögliche Fähigkeiten: Lernberichte erstellen, Auswertungen einsehen, Schülerkonten verwalten, Inhalte/Missionen betreuen. Der Katalog ist zentral zu definieren; UI-Labels sind davon getrennt.

Wichtig: Eine Berechtigung auf Klassenebene wirkt nur in dieser Klasse. Schulweite Berechtigungen werden nur durch Schulleitung/Schuladmin vergeben. Jede Server Action, Edge Function und RPC muss den Scope serverseitig prüfen; UI-Ausblendung allein ist kein Zugriffsschutz.

## Umsetzungsreihenfolge

1. Berechtigungsinventar und alle bestehenden Schreib-/Lesepfade prüfen.
2. Teacher-Portal-Zugriff und Klassenabfragen korrekt auf die eigene User-ID und explizite Klassenmitgliedschaften begrenzen.
3. Sichere serverseitige Zuweisungsaktion/RPC ergänzen; nur `school_lead` und `school_admin` derselben Schule dürfen zuweisen.
4. UI im Bereich Menschen & Zugänge: Klassen zuweisen/entfernen und Zusatzfunktionen verwalten.
5. Schuljahres-Entität und sichere Backfill-Migration ergänzen.
6. Vorschau-/Bestätigungsworkflow für Klassenfortschreibung implementieren.
7. Tests für Mehrfachzuweisungen, Doppelspitzen, Vertretungen, Schulgrenzen, Rollenwechsel und Schuljahreswechsel.

## Abnahmekriterien

- Lehrkraft A kann gleichzeitig Klasse 7a und 8b betreuen.
- Zwei Lehrkräfte können gleichzeitig Klasse 7a betreuen.
- Eine Lehrkraft ohne Zuweisung kann weder Klasse noch Daten dieser Klasse öffnen.
- Nur Schulleitung und Schuladmin derselben Schule können Zuweisungen ändern.
- Eine Deaktivierung/Entfernung aus einer Klasse beendet nur diese Zuweisung, nicht andere.
- Schüler können weiterhin nur einer aktiven Klasse angehören.
- Ungültige oder mehrdeutige historische Schuljahreswerte werden vor Migration sichtbar gemacht.
- Fortschreibung überschreibt keine historischen Klassen, Lernstände oder Social-Daten.
- Zusatzfunktionen erweitern nur den explizit vergebenen Scope.
