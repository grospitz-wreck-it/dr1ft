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


## Schulform, Bundesland und Jahrgangsstruktur

Die Anzahl der Jahrgangsstufen darf nicht als globale Konstante oder starre Obergrenze implementiert werden. Schulformen und Bildungsgänge unterscheiden sich zwischen Bundesländern und teilweise innerhalb einer Schulform (z. B. unterschiedliche Bildungsgangvarianten).

Daher gilt:

- Bundesland und Schulform liefern nur sinnvolle Einrichtungsvorschläge und Standardwerte.
- Die konkrete Jahrgangsstruktur wird pro Schule bzw. Bildungsgang konfigurierbar hinterlegt.
- Jahrgangsstufen werden als geordnete Stufen mit optionaler Folgestufe modelliert; eine lineare Fortschreibung um exakt +1 ist nur der Standardfall.
- Eine Stufe kann einen Abschluss-/Austrittspunkt haben, in einen anderen Bildungsgang übergehen oder in eine andere Klassen-/Kursstruktur münden.
- G8/G9, Grundschulzeit, Förderschulstrukturen, Berufskolleg/Bildungsgänge und schulindividuelle Abweichungen dürfen nicht durch eine einzige Zahl wie `max_grade_level` abgebildet werden.
- Die Schulverwaltung kann Vorschläge anpassen. Die konkrete Schulstruktur der Schule ist maßgeblich.

Beispiele, die die Konfiguration begründen: Die KMK beschreibt für Berlin und Brandenburg eine sechsjährige Grundschule, während sie in den übrigen Ländern grundsätzlich vier Jahre umfasst. In NRW umfasst die Grundschule die Klassen 1 bis 4; das Gymnasium kann in der Sekundarstufe I bis Klasse 9 oder 10 geführt werden. (Quellen: KMK, Sekundarstufe I: https://www.kmk.org/bildungsministerkonferenz/vertiefende-bildungsinhalte/bildungswege-und-schulabschluesse/sekundarstufe-i.html ; Schulgesetz NRW, §§ 7, 10 und 11: https://recht.nrw.de/lrgv/gesetz/01082025-schulgesetz-fuer-das-land-nordrhein-westfalen-schulgesetz-nrw-schulg/ ; NRW-Äquivalenzliste G8/G9: https://www.schulministerium.nrw/system/files/media/document/file/Anlage1.pdf)

## Verbindlicher Lehrer-Check zum Schuljahreswechsel

Der Schuljahreswechsel erzeugt im Teacher-Dashboard eine sichtbare Aufgabe. Sie wird nicht als flüchtige Info-Meldung umgesetzt, sondern als persistenter Workflow mit Status und Audit-Historie.

### Ablauf

1. Die Schulleitung/der Schuladmin legt das Folge-Schuljahr an und startet die vorbereitete Klassenfortschreibung.
2. DR1FT erstellt neue Klasseninstanzen und schlägt Schüler- und Lehrkraftzuordnungen vor. Die Schule bestätigt die tatsächliche Klassenstruktur und die Schülerübernahmen.
3. Sobald eine Lehrkraft einer aktiven Klasse im neuen Schuljahr zugewiesen ist, erscheint für sie im Teacher-Dashboard die Aufgabe **„Schülerliste für das neue Schuljahr prüfen“**.
4. Die Lehrkraft öffnet die neue Klassenliste, kontrolliert die Schülerzugänge und Klassenzugehörigkeiten und veranlasst notwendige Korrekturen über die dafür vorgesehenen Verwaltungsfunktionen bzw. meldet fehlende Rechte an die Schulverwaltung.
5. Erst danach kann sie für diese Klasse **„Schülerliste geprüft“** bestätigen.
6. Die Bestätigung wird mit User-ID, Klasseninstanz, Schuljahr, Zeitstempel und geprüfter Listen-Version gespeichert.
7. Schulleitung/Schuladmin sieht schulweit, welche Klassen bzw. Lehrkräfte noch offen sind. Offene Aufgaben bleiben im Dashboard sichtbar und können erneut erinnert werden.

### Daten- und Statusmodell

Vorgeschlagene Entität `class_roster_review` (oder gleichwertig):

- `id`
- `school_year_id`
- `class_instance_id`
- `teacher_user_id`
- `status` (pending, confirmed, needs_support)
- `confirmed_at`
- `roster_version` bzw. Fingerprint der relevanten Schülerzuordnungen zum Bestätigungszeitpunkt
- `created_at`, `updated_at`

Mehrere Lehrkräfte in derselben Klasse bestätigen jeweils ihre eigene Prüfung. Eine Lehrkraft mit mehreren Klassen bekommt je Klasse eine eigene Aufgabe. Die Schulverwaltung kann den Gesamtstatus sehen.

### Wichtige Regeln

- Eine Bestätigung ist eine dokumentierte Prüfung durch die Lehrkraft, keine automatische Garantie für die inhaltliche Richtigkeit der Liste.
- Ändert sich die Schülerzuordnung nach der Bestätigung wesentlich, wird die Prüfung für diese Klassenliste erneut erforderlich (Versionsvergleich statt blindem Vertrauen in einen alten Haken).
- Wird eine Lehrkraft aus einer Klasse entfernt, wird ihre offene Aufgabe beendet; andere Lehrkräfte und deren Bestätigungen bleiben unberührt.
- Eine neue oder geänderte Lehrkraftzuweisung erzeugt die passende Prüfaufgabe.
- Lehrkräfte dürfen nur Listen der ihnen zugewiesenen Klassen sehen und bestätigen.
- Nur Schulleitung/Schuladmin darf den schulweiten Schuljahreswechsel vorbereiten und die Klassen-/Schülerübernahmen finalisieren.
- Die Bestätigung darf nicht als Anwesenheits-, Leistungs- oder Aufmerksamkeitsmessung interpretiert werden. Sie ist ausschließlich ein organisatorischer Prüfvermerk.


## Unterrichtsgruppen und Fachunterricht (Ergänzung)

Die organisatorische Klassenmitgliedschaft und die Teilnahme an Unterricht müssen als zwei getrennte Beziehungen modelliert werden. Nicht jede Lehrkraft, die Schüler einer Klasse unterrichtet, ist Klassenleitung oder Mitglied des vollständigen Klassen-Teams.

### Begriffe und Abgrenzung

- **Klasseninstanz (`class_instance`):** organisatorische Zuordnung der Schüler zu einer Klasse in einem konkreten Schuljahr, z. B. 7a.
- **Klassenverantwortung / Klassenteam:** Lehrkräfte mit einer ausdrücklich zugewiesenen organisatorischen Verantwortung für die gesamte Klasse. Diese Zuweisung kann mehrere Lehrkräfte umfassen.
- **Unterrichtsgruppe (`teaching_group`):** fachlich bzw. organisatorisch abgegrenzte Lerngruppe innerhalb eines Schuljahres, z. B. Medienkunde 7a+7b, Wahlpflichtkurs oder Fördergruppe.
- **Unterrichtszuweisung:** Zuordnung einer Lehrkraft zu einer Unterrichtsgruppe mit expliziten Rechten.
- **Teilnahme (`teaching_group_membership`):** Zuordnung eines Schülers zu einer Unterrichtsgruppe. Sie kann aus einer ganzen Klasse abgeleitet oder für Teilgruppen individuell gepflegt werden.

### Typische Fälle

- Eine Klassenleitung ist für die organisatorische Klasse zuständig.
- Eine Fachlehrkraft unterrichtet mehrere vollständige Klassen.
- Eine Unterrichtsgruppe besteht aus Schülern mehrerer Klassen (z. B. Medienkunde 7a und 7b).
- Eine Unterrichtsgruppe enthält nur einen Teil einer Klasse (z. B. Wahlpflicht, Förderangebot oder Projektgruppe).
- Eine Lehrkraft unterrichtet mehrere Unterrichtsgruppen und kann in einer anderen Klasse zusätzlich Klassenleitung sein.
- Mehrere Lehrkräfte können gemeinsam eine Unterrichtsgruppe betreuen.

### Vorgeschlagenes Datenmodell

Die folgenden Namen beschreiben ein Zielmodell; sie sind keine Behauptung, dass diese Tabellen bereits existieren.

**`teaching_groups`**
- `id`
- `school_id`
- `school_year_id`
- `name` (z. B. „Medienkunde 7a/7b“)
- `subject_key` oder `subject_label` (optional, konfigurierbar)
- `group_type` (z. B. class_course, cross_class_course, elective, support, project)
- `status` (planned, active, archived)
- `created_at`, `updated_at`

**`teaching_group_class_sources`** (optional, wenn eine Gruppe ganze Klassen umfasst)
- `teaching_group_id`
- `class_instance_id`
- `participation_mode` (all_students oder selected_students)

**`teaching_group_memberships`**
- `teaching_group_id`
- `student_user_id`
- `source_class_instance_id`
- `joined_at`, optional `left_at`
- eindeutige bzw. zeitlich passende Constraints gegen doppelte aktive Zuordnungen

**`teaching_group_teachers`**
- `teaching_group_id`
- `teacher_user_id`
- `assignment_type` (lead, co_teacher, substitute oder vergleichbar)
- `granted_by`
- `created_at`, optional `revoked_at`

Eine Gruppe kann ganze Klassen referenzieren oder eine explizite Schülerliste enthalten. Bei `all_students` muss die effektive Teilnehmerliste nachvollziehbar aus der Klassenmitgliedschaft und dem Gültigkeitszeitraum abgeleitet werden. Für Teilgruppen werden explizite Schülerzuordnungen gepflegt. Änderungen an Quellklassen dürfen nicht unbemerkt historische Kurszuordnungen verändern.

### Berechtigungsprinzip

Die Zuweisung zu einer Unterrichtsgruppe gewährt **keinen pauschalen Zugriff auf die vollständigen Klassenakten** der beteiligten Klassen.

Eine Fachlehrkraft darf standardmäßig nur:
- die Teilnehmer ihrer zugewiesenen Unterrichtsgruppen sehen,
- die für diese Gruppe erforderlichen Lernaktivitäten durchführen,
- die für diese Gruppe zulässigen Lernstände bzw. Evidenzen einsehen,
- gruppenbezogene Aufgaben und Ergebnisse verwalten, soweit ihr diese Funktion ausdrücklich zugewiesen wurde.

Sie darf nicht allein aufgrund der Unterrichtsgruppe:
- alle Schülerdaten der Quellklassen öffnen,
- schulweite oder klassenweite Verwaltungsaufgaben ausführen,
- Schülerkonten oder Klassenlisten administrieren,
- Berichte außerhalb ihres Unterrichts-Scopes abrufen.

Rechte wie `view_group_progress`, `manage_group_activities` oder `create_group_report` werden als additive Berechtigungen an die konkrete Unterrichtsgruppe gebunden. Erweiterte Einsicht in klassenweite oder schulweite Daten benötigt eine separate, ausdrücklich erteilte Berechtigung.

Alle Prüfungen erfolgen serverseitig und berücksichtigen Schule, Schuljahr, Unterrichtsgruppe, Lehrkraftzuweisung, Schülerteilnahme und Gültigkeitszeitraum. RLS-Policies und Server Actions müssen denselben Scope abbilden.

### Verwaltung und Zuweisung

- Schulleitung und Schuladmin dürfen Unterrichtsgruppen anlegen und Lehrkräfte zuweisen.
- Die konkrete Berechtigung, ob Lehrkräfte selbst Unterrichtsgruppen verwalten dürfen, bleibt eine konfigurierbare additive Funktion und ist standardmäßig nicht vorausgesetzt.
- Zuweisungen werden im Bereich **Menschen & Zugänge** am Lehrkraftprofil sichtbar gemacht; zusätzlich braucht es eine schulische Übersicht für Unterrichtsgruppen.
- Eine Lehrkraft kann in einer Gruppe Hauptverantwortliche, mitunterrichtende oder vertretende Lehrkraft sein.
- Vertretungen erhalten nur befristete Zugriffe; Ende bzw. Widerruf muss technisch wirksam werden.
- Unterrichtsgruppen sind einem Schuljahr zugeordnet. Beim Schuljahreswechsel werden neue Gruppen vorgeschlagen oder angelegt; historische Gruppen bleiben erhalten.

### Abgrenzung zum Klassenlisten-Check

Der bereits definierte verpflichtende Check **„Schülerliste für das neue Schuljahr prüfen“** betrifft die organisatorische Klassenliste und wird von den für die Klasse verantwortlichen Lehrkräften bestätigt.

Fachlehrkräfte müssen nicht automatisch die vollständige Klassenliste bestätigen. Für Unterrichtsgruppen kann ein eigener, engerer Check vorgesehen werden, etwa **„Teilnehmerliste der Unterrichtsgruppe prüfen“**, wenn die Schule dies für den konkreten Kursprozess benötigt.

Bei einer Unterrichtsgruppe mit ganzen Klassen wird die Teilnehmerliste aus den freigegebenen Klassenmitgliedschaften abgeleitet. Bei Teilgruppen oder klassenübergreifenden Gruppen muss die konkrete Teilnehmerliste vor Unterrichtsbeginn bestätigt werden. Die Bestätigung einer Unterrichtsgruppe ersetzt niemals den organisatorischen Klassenlisten-Check.

### Abnahmekriterien

- Eine Fachlehrkraft kann Medienkunde in 7a, 7b und 8a unterrichten, ohne automatisch Klassenmitglied aller drei Klassen zu werden.
- Eine Unterrichtsgruppe kann Schüler aus mehreren Klassen enthalten.
- Eine Unterrichtsgruppe kann auch nur ausgewählte Schüler einer Klasse enthalten.
- Mehrere Lehrkräfte können derselben Unterrichtsgruppe zugewiesen sein.
- Eine Fachlehrkraft sieht standardmäßig nur die Teilnehmer und Lerninformationen ihres Unterrichts-Scopes.
- Die Entfernung aus einer Unterrichtsgruppe entzieht nur diesen Zugriff und lässt andere Zuweisungen unberührt.
- Die Klassenleitung behält ihre organisatorische Verantwortung und den dafür vorgesehenen Zugriff.
- Historische Unterrichtsgruppen und Teilnehmerzuordnungen bleiben nachvollziehbar.
- Der Klassenlisten-Check und ein optionaler Unterrichtsgruppen-Check sind getrennte Workflows.
