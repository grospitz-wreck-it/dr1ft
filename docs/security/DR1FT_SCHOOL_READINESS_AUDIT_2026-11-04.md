# DR1FT – technisches Datenschutz- und Schulreife-Audit

**Stand:** 04.11.2026  
**Repository-Basis:** `main`, Commit `00e8b77c0027846602bac2ebf1aae064f177c5e6`  
**Arbeitszweig:** `audit/school-readiness-2026-11`  
**Status:** Zwischenstand – gezielte Codeprüfung, noch kein vollständiger Penetrations-, Deployment- oder Datenbankaudit.

## 1. Verbindliche Produktentscheidung: keine vollständigen Schülernamen

DR1FT erhebt und speichert für Schüler:innen keine vollständigen Vor- und Nachnamen. Eine schulisch ausreichende Bezeichnung wie „Max M.“ oder „Max“ genügt.

- Kein Feld für Vorname + Nachname.
- Keine private Schüler-E-Mail-Adresse als Voraussetzung.
- Klassen- und Lernzuordnung ausschließlich über interne UUIDs.
- Anzeigename ist nur ein Label und darf nicht als technischer Schlüssel dienen.
- Schülernamen/Anzeigenamen dürfen nicht an externe KI-Anbieter übermittelt werden.
- Lehrkräfte benötigen keine vollständigen Namen.
- Auch „Max M.“ kann im schulischen Kontext personenbezogen sein und bleibt daher geschützt.

Die aktuelle technische Struktur enthält bereits kein separates Nachnamenfeld in der untersuchten Schüleranlage. Die Eingabefelder `display_name` und `username` sind jedoch noch nicht ausreichend eingeschränkt. Für den nächsten Produktivschritt ist deshalb eine klare pseudonyme Namenskonvention festzulegen; es gibt keine belastbare automatische Erkennung vollständiger Klarnamen anhand des Textfelds allein.

## 2. Geprüfte Implementierung

### Schüleranlage
Dateien:
- `apps/teacher/app/classes/[classId]/AddStudentForm.tsx`
- `apps/teacher/app/classes/[classId]/StudentRoster.tsx`
- `supabase/functions/create-student-account/index.ts`

Feststellungen:
- Die Lehrkraft gibt `displayName` und `username` ein.
- Die Edge Function begrenzt `display_name` nur auf 80 Zeichen; sie verhindert keinen vollständigen Namen.
- Der Account erhält eine synthetische interne Login-Adresse nach dem Muster `<username>.<classcode>@dr1ft.local`. Das ist keine private Schüler-Mail-Adresse.
- `display_name` wird sowohl in `auth.users.user_metadata` als auch in `user_profiles` gespeichert.
- Die Klassenmitgliedschaft wird mit der UUID in `class_instance_memberships` angelegt.

### Bearbeitung und Entfernung
Dateien:
- `apps/teacher/app/classes/[classId]/StudentRoster.tsx`
- `supabase/functions/manage-student-account/index.ts`

Feststellungen:
- Auch beim Ändern des Anzeigenamens akzeptiert die Edge Function beliebigen Text bis 80 Zeichen.
- Die Funktion `remove` setzt nur `left_at` an der Klassenmitgliedschaft. Sie löscht weder den Auth-Account noch automatisch die Profil-, Lern- oder Interaktionsdaten.
- Die Rollenprüfung in dieser Funktion akzeptiert aktuell `teacher` und `school_admin`, aber nicht `school_lead`. Das ist mit der an anderer Stelle vorhandenen Rolle `school_lead` abzugleichen.

### Schülerprofil
Datei:
- `apps/player/app/profile/page.tsx`

Feststellungen:
- Schüler:innen können `display_name` selbst bearbeiten und direkt in `user_profiles` speichern.
- Die Oberfläche erlaubt bis zu 40 Zeichen, prüft aber nicht auf eine pseudonyme Kurzbezeichnung.
- Deshalb muss die Regel nicht nur in der Lehrkraft-Oberfläche, sondern auch server-/datenbankseitig bzw. in allen Schreibpfaden durchgesetzt werden.
- Die öffentliche Profil-/Social-Funktion macht diese Prüfung besonders wichtig.

### Lehrerreports
Dateien:
- `supabase/functions/generate-teacher-report/index.ts`
- `supabase/migrations/0029_school_identity_and_teacher_reports.sql`
- `supabase/migrations/20261102140000_teacher_student_learning_journey.sql`

Feststellungen:
- Reports referenzieren Schüler:innen über `student_user_id` und die UUID.
- Der Snapshot enthält Anzeigename und Username, nicht einen separaten Nachnamen.
- Der Report wird aus Lern-/Kompetenzdaten erstellt und in `teacher_reports.snapshot` gespeichert.
- Die untersuchte Learning-Journey-Funktion prüft Klasseninstanz und aktive Schülerzugehörigkeit. Private Direktnachrichten werden ausdrücklich ausgeschlossen.
- Die aktuelle Report-Edge-Function akzeptiert `teacher`, `school_admin` und `school_lead` nur dann, wenn für die konkrete Klasseninstanz eine aktive Membership besteht. Eine darüber hinausgehende schulweite Sonderbefugnis ist in diesem Pfad nicht belegt.

### Rollen und Berechtigungen
Dateien:
- `supabase/migrations/0029_school_identity_and_teacher_reports.sql`
- `supabase/functions/manage-student-account/index.ts`
- `supabase/functions/generate-teacher-report/index.ts`

Feststellungen:
- Das Schema kennt `teacher`, `school_admin` und `school_lead`.
- `is_school_admin_of(school_id)` umfasst `school_admin` und `school_lead`.
- Die zentrale Funktion `is_teacher_of_class_instance` aus Migration 0023 umfasst nur Klassenmitgliedschaften mit `teacher` oder `school_admin`; `school_lead` ist nicht enthalten.
- Mehrere aktuelle Lern-/Report-RPCs prüfen genau diese Funktion. Eine Schulleitung, die nur als `school_lead` in `school_memberships` geführt wird und keine Klassenmitgliedschaft besitzt, erhält dadurch voraussichtlich keinen Zugriff auf diese Klassenreports – obwohl die Schuladmin-RLS-Policies ihr die schulweite Einsicht in Klassen und Mitgliedschaften erlauben.
- `manage-student-account` akzeptiert `teacher` und `school_admin`, aber nicht `school_lead`. `generate-teacher-report` akzeptiert zwar `school_lead`, verlangt aber weiterhin eine aktive Klassenmitgliedschaft. Das ist eine echte Inkonsistenz zwischen den Rollenpfaden.
- Vor Produktivbetrieb muss jede aktuelle RLS-Policy, RPC und Edge Function gegen eine einheitliche Berechtigungsmatrix getestet werden. Die geprüften Definitionen belegen die Abweichung in den genannten Pfaden; weitere spätere Änderungen sind noch vollständig gegenzuprüfen.

## 3. Priorisierte Maßnahmen

| Priorität | Maßnahme | Status |
|---|---|---|
| P0 | Anzeigenamen verbindlich auf pseudonyme Kurzform begrenzen (z. B. „Max“ oder „Max M.“) – in Lehrkraft-UI, Player-Profil, Edge Functions und Datenbank-Schreibpfaden | Offen |
| P0 | Einheitliche Rollenmatrix für teacher, school_admin und school_lead definieren und alle Edge Functions/RLS/RPCs dagegen prüfen | Offen |
| P1 | Temporäre Schülerpasswörter mit kryptografisch sicherem Zufall erzeugen | Im Arbeitszweig umgesetzt; Tests/Deployment offen |
| P0 | Löschkonzept implementieren: Klasse verlassen, Account deaktivieren/löschen, Lern-/Interaktionsdaten löschen oder rechtssicher anonymisieren, Reports/Snapshots und Backups berücksichtigen | Offen |
| P0 | Schema, RLS und Moderationsablauf für `student_message_reports` klären; im Repository fehlt eine passende Migration, obwohl die Player-API die Tabelle beschreibt | Offen |
| P1 | Vollständige Datenflussinventur aller Player-/Teacher-/Editorial-Routen und Supabase Edge Functions durchführen | In Arbeit |
| P1 | Externe KI-Aufrufe systematisch auf personenbezogene Daten und Prompt-Inhalte prüfen; technische Trennung erzwingen | In Arbeit |
| P1 | Exportprozess für Schule/Betroffene festlegen und technisch testen | Offen |
| P1 | RLS-/Tenant-Isolation mit Negativtests (Schule A darf Schule B nicht lesen) absichern | Offen |
| P2 | Hosting- und Datenstandortentscheidung dokumentieren: IONOS App-Hosting, Supabase zunächst als Managed Backend prüfen | Offen |
| P2 | AVV, TOM, Subprozessorenliste, Datenschutzhinweise, Löschfristen und DSFA-Vorprüfung vervollständigen | Offen |

## 4. Konkrete Zielregel für Anzeigenamen

Zulässige Beispiele:
- `Max`
- `Max M.`
- `Mia S.`
- `Alex`

Nicht zulässig:
- vollständige Vor- und Nachnamen
- private E-Mail-Adressen
- Telefonnummern oder andere Identifikatoren

Die Prüfung muss auf dem Server erfolgen und darf nicht nur eine Browser-Validierung sein. Bestehende Daten müssen vor einer eventuellen Bereinigung zunächst inventarisiert werden. Keine automatische Kürzung oder Überschreibung produktiver Namen ohne kontrollierte Migration und Freigabe.

## 5. Lösch- und Aufbewahrungslogik: notwendige Unterscheidungen

Die aktuelle Funktion `manage-student-account?action=remove` ist eine Klassenabmeldung, keine vollständige Accountlöschung.

Für eine schulische Lösung sind mindestens getrennte Vorgänge erforderlich:
1. Schüler:in aus einer Klasseninstanz entfernen.
2. Schülerkonto für weitere Anmeldung sperren/deaktivieren.
3. Schülerkonto endgültig löschen.
4. Lernnachweise/Reports nach dokumentierter Frist löschen oder – nur wenn fachlich und rechtlich zulässig – irreversibel anonymisieren.
5. Löschung in abhängigen Tabellen, Storage, Auth-Metadaten, Exporten und Sicherungskonzept berücksichtigen.

Die konkrete Aufbewahrungsdauer muss mit Schule/Schulträger und Datenschutzverantwortlichen abgestimmt werden; sie wird hier nicht erfunden oder vorweggenommen.

## 6. KI- und Drittanbieter-Datenfluss: bisher geprüft

Geprüfte Dateien:
- `apps/editorial/app/(protected)/ambient-content/actions.ts`
- `apps/editorial/app/ambient-content/actions.ts`
- `apps/editorial/app/npc-dialogs/actions.ts`
- `apps/editorial/app/scenarios/actions.ts`
- `cloudflare/ambient-image-worker/src/index.ts`

Feststellungen:
- Die untersuchten KI-Funktionen liegen im Editorial-Bereich und generieren redaktionelle Ambient-Beiträge, NPC-Personas, Szenarioentwürfe und Bildmaterial.
- Die geprüften Prompts verwenden redaktionelle Parameter, Themen, Creator-Personas, Altersbänder, Interessen-Kataloge und Szenario-/Lerninhaltsentwürfe.
- In den untersuchten Pfaden wird keine Schülerliste, kein Schülerprofil, keine Schüler-UUID, kein privater Nachrichteninhalt und kein individueller Lernreport abgefragt oder in den Prompt eingesetzt.
- Textgenerierung erfolgt über Gemini oder Anthropic. Bildgenerierung erfolgt über Cloudflare Workers AI (FLUX), mit Gemini-Bild-Fallback; Gemini wird auch für Bild-QA eingesetzt.
- Der Cloudflare-Worker verlangt einen API-Key. Seine OPTIONS-Antwort erlaubt derzeit CORS-Origin `*`; die tatsächliche Nutzung erfolgt im geprüften Aufruf serverseitig mit Bearer-Key.

Bewertung:
- Im geprüften redaktionellen KI-Pfad ist keine Übermittlung individueller Schülerdaten an die externen KI-Anbieter erkennbar.
- Das ist kein Beweis für alle möglichen KI-Funktionen. Player-Runtime, weitere API-Routen, mögliche spätere Chat-/Feedback-Funktionen und alle Datenbank-/Storage-Trigger müssen noch vollständig inventarisiert werden.
- Schülerantworten, Lernprofile, Anzeigenamen, User-IDs, Login-Kennungen und Klassenlisten bleiben von externen KI-Prompts ausgeschlossen, sofern keine gesonderte, dokumentierte und rechtlich geprüfte Freigabe besteht.

## 7. Vertiefte Prüfung: Lernverlauf, Nutzungszeit und Nachrichten

### Lernverlauf und Schülerreport

Geprüfte Dateien:
- `supabase/migrations/20261102140000_teacher_student_learning_journey.sql`
- `supabase/migrations/20261102160000_teacher_student_scenario_report_detail.sql`
- `supabase/functions/generate-teacher-report/index.ts`
- `apps/teacher/app/classes/[classId]/reports/[studentId]/page.tsx`

Feststellungen:
- Der Lernverlauf ist ausdrücklich auf eine aktive Schülerzugehörigkeit in einer konkreten Klasseninstanz begrenzt.
- Er enthält öffentliche Feed-Interaktionen, Lernkartenantworten, validierte Assessment-Ereignisse und abgeschlossene Missionen.
- Bei `learning_task_response` wird der gespeicherte Antworttext bis zu 280 Zeichen in der Beschreibung des Lernverlaufs ausgegeben. Das ist keine bloße Statistik, sondern kann freie Schüleräußerungen enthalten.
- Die Detailansicht für Lernkarten zeigt die gewählte Antwort und redaktionell hinterlegtes Feedback.
- Der Lehrerreport speichert einen Snapshot mit Schüler-UUID, Anzeigename, Username, Lernfortschritt und Kompetenzständen.
- Private Direktnachrichteninhalte werden in der Learning-Journey-Funktion ausdrücklich nicht ausgegeben.
- Die gesonderte Social-Pulse-Funktion zählt jedoch Likes, Kommentare, Shares und gesendete Direktnachrichten pro Woche. Sie liefert keine DM-Texte oder Empfänger-/Konversationsinhalte.

Bewertung:
- Die Datenverarbeitung ist im Kern klassen- und zweckbezogen, aber die Detailtiefe ist erheblich. Für Schulen muss klar beschrieben sein, dass Lehrkräfte Lernantworten, Lernfortschritt und bestimmte Interaktions-/Nutzungsmetriken einsehen können.
- Die Anzeige von Antworttexten sollte auf pädagogisch erforderliche Aufgaben begrenzt bleiben. Freitext sollte nicht pauschal in Reports erscheinen, wenn eine Ergebnis-/Statusanzeige ausreicht.
- Die Report-Snapshots brauchen eine definierte Aufbewahrungs- und Löschregel. Das Löschen des Accounts allein ist nicht als vollständiger Löschprozess nachgewiesen.

### Aktive Nutzungszeit

Geprüfte Datei:
- `supabase/migrations/20261102180000_student_active_time_tracking.sql`

Feststellungen:
- DR1FT speichert aktive Zeitabschnitte von 1 bis 60 Sekunden, jeweils mit Schüler-UUID, Klasseninstanz, optionalem Szenario und Aktivitätstyp (`feed`, `other`, `learning_cards`).
- Es werden laut Tabellenkommentar keine Seiteninhalte oder Nachrichtentexte gespeichert.
- Lehrkräfte können Summen nach Aktivitätstyp und Szenario für einen Schüler abrufen.
- Die Funktion prüft die aktive Schülerzugehörigkeit und die Berechtigung der Lehrkraft über `is_teacher_of_class_instance`.

Bewertung:
- Auch aggregierte Nutzungszeit ist personenbezogen, wenn sie einem Schülerkonto zugeordnet bleibt.
- Die Erfassung muss in Datenschutzhinweisen und schulischer Information verständlich erklärt werden. Sie darf nicht als lückenlose Anwesenheits- oder Aufmerksamkeitserfassung dargestellt werden.
- Fachlich muss geklärt werden, ob die Metrik für den pädagogischen Zweck wirklich benötigt wird und ob die Aufbewahrung begrenzt werden kann.

### Schüler-Direktnachrichten

Geprüfte Dateien:
- `apps/player/app/api/messages/direct/route.ts`
- `supabase/migrations/20261015091500_secure_student_direct_messages.sql`
- `supabase/migrations/20261028120000_repair_student_direct_message_security.sql`
- `supabase/migrations/20261102170000_teacher_student_social_pulse.sql`

Feststellungen:
- Direktnachrichten werden mit Sender, Empfänger, Klasseninstanz, Text und Zeitstempeln in Supabase gespeichert.
- Lesen und Senden sind auf aktive Schüler:innen derselben Klasseninstanz begrenzt; die RLS-Policies prüfen Sender und Empfänger.
- Die geprüften Lehrer-Lernverlauf- und Social-Pulse-RPCs liefern keine Nachrichtentexte. Die Social-Pulse-Funktion liefert nur Wochenzählungen gesendeter Nachrichten.
- Eine separate Meldungsfunktion versucht, Meldungen in `student_message_reports` zu speichern. In sämtlichen 100+ SQL-Migrationen des aktuellen Repository-Baums wurde jedoch keine Definition dieser Tabelle gefunden. Die Migration `0047_student_comments_and_reports.sql` definiert stattdessen `content_reports` für Feed-Inhalte. Ob `student_message_reports` manuell in der produktiven Datenbank angelegt wurde, ist ohne Remote-DB-Zugriff nicht feststellbar.

Bewertung:
- „Lehrkräfte sehen keine privaten Nachrichten“ ist anhand der geprüften Report-RPCs plausibel, aber noch keine vollständige Aussage über sämtliche Admin-, Moderations-, Support- oder Datenbankzugriffe.
- **P0 vor Schuleinsatz:** Die Schema-Lücke für `student_message_reports` muss geklärt werden. Falls die Tabelle nur remote/manuell existiert, muss sie als versionierte Migration mit RLS, Rollen-/Moderationszugriff, Duplikatregel und Aufbewahrung in das Repository aufgenommen werden. Falls sie nicht existiert, schlägt die Meldung im frischen Setup fehl.
- Zusätzlich braucht es einen dokumentierten Melde- und Schutzprozess für problematische Nachrichten sowie eine eindeutige Regel, wer gemeldete Inhalte sehen darf und wie lange sie aufbewahrt werden.

## 8. Rollenbefund präzisiert

Die Rolle `school_lead` liegt in `school_memberships`, während die zentrale Funktion `is_teacher_of_class_instance` in Migration 0023 ausschließlich eine aktive Klassenmitgliedschaft mit Rolle `teacher` oder `school_admin` verlangt.

Konsequenz:
- Schulweite RLS-Policies erlauben `school_lead` bereits das Lesen von Klassen und Klassenmitgliedschaften der eigenen Schule.
- Lernverlauf-, Lernkarten-, Social-Pulse- und aktive-Zeit-RPCs rufen dagegen `is_teacher_of_class_instance` auf. Eine Person, die nur `school_lead` in `school_memberships` ist, scheitert daher an diesen RPC-Berechtigungen.
- `generate-teacher-report` prüft ebenfalls eine Klassenmitgliedschaft des Aufrufers. Obwohl es `school_lead` in der Rollenliste nennt, hilft das einer rein schulweiten Schulleitungsrolle ohne Klassenmitgliedschaft nicht.
- `manage-student-account` akzeptiert nur `teacher` und `school_admin`.

Das ist nicht nur eine fehlende Rollenfreigabe, sondern ein Architekturthema: Schulweite Sonderbefugnisse müssen bewusst von klassenbezogenen Lehrkraftrechten getrennt werden. Eine Schulleitung darf nicht versehentlich dadurch Zugriff bekommen, dass sie künstlich als Lehrkraft in jede Klasse eingetragen wird. Erforderlich ist ein expliziter, schulgebundener Admin-Pfad, der vor jedem Datenzugriff die Zugehörigkeit zur gleichen Schule und den aktiven Status prüft.

## 9. Grenzen dieses Zwischenstands

- Es wurde kein Zugriff auf die produktive Supabase-Datenbank, deren tatsächliche RLS-Policies, Secrets oder Migration-Historie ausgeführt.
- Es wurde kein IONOS- oder Supabase-Deployment geprüft.
- Es wurden keine automatisierten Tests, Builds oder Penetrationstests ausgeführt.
- Eine Prüfung der KI-Pipeline ist noch nicht vollständig abgeschlossen.
- Die bloße Existenz einer Migration im Repository beweist nicht, dass sie remote angewendet wurde.
- Es wurden in diesem Audit-Zwischenstand keine produktiven Daten verändert und keine Migration ausgeführt.

## 10. Betriebs- und Release-Reife: erste Prüfung

Geprüfte Dateien und Repository-Struktur:
- Root- und App-`package.json`
- `apps/player/package.json`, `apps/teacher/package.json`, `apps/editorial/package.json`
- `apps/editorial/app/api/schools/[schoolId]/sso/route.ts`
- `supabase/functions/provision-school-user/index.ts`

Feststellungen:
- Im Root-Paket sind nur lokale Dev- und Supabase-DB-Befehle definiert (`db:push`, `db:reset`). Ein zentraler Build-/Test-/Lint-Befehl ist dort nicht vorhanden.
- Player und Teacher definieren `build`, `dev` und `start`, aber keine Test- oder Lint-Skripte.
- Editorial führt beim Build `tsc --noEmit` aus; ein automatisierter Testlauf ist im Paket nicht definiert.
- Im aktuellen Repository-Baum ist keine `supabase/config.toml` sichtbar. Lokale Edge-Function-Konfigurationen und JWT-Ausnahmen sind damit aus dem Repository nicht nachvollziehbar.
- Die SSO-Verschlüsselung nutzt AES-GCM mit 12-Byte-IV und einem 32-Byte-Schlüssel aus `DR1FT_SSO_ENCRYPTION_KEY`. Das Secret wird nicht im Klartext zurückgegeben. Die Fehlermeldung nennt noch Vercel als Ablageort; das muss bei der IONOS-Migration aktualisiert und die Secret-Verwaltung dokumentiert werden.
- Die Schulbenutzer-Provisionierung erlaubt aktiven `school_admin`- und `school_lead`-Mitgliedern, Mitarbeitende einzuladen. Die Rollenvergabe umfasst `teacher`, `school_admin` und `school_lead`; die Berechtigung ist schulgebunden geprüft.

Bewertung:
- Vor Schulbetrieb braucht es automatisierte Buildprüfungen aller Apps, SQL-/RLS-Tests und Edge-Function-Tests als Release-Gates.
- IONOS-Hosting ist noch nicht als deploybare Betriebsarchitektur im Repository nachgewiesen. Supabase- und Vercel-bezogene Umgebungsvariablen sowie Deployment-Abläufe müssen in einem Migrationsplan erfasst werden.
- Die tatsächliche Konfiguration in Cloud-Dashboards ist nicht aus dem Repository ablesbar und muss separat geprüft werden.

## 11. Passworterzeugung: erste Codekorrektur

In diesem Arbeitszweig wurden die Funktionen `create-student-account` und `reset-student-password` geändert:
- Vorher: 10 Zeichen aus dem Passwortalphabet über `Math.random()`.
- Jetzt: 10 Zeichen über `crypto.getRandomValues()`. Das Alphabet hat genau 32 Zeichen; die unteren 5 Bit jedes Zufallsbytes werden gleichverteilt auf ein Zeichen abgebildet.
- Die Änderung betrifft nur die Erzeugung automatisch generierter temporärer Passwörter. Login-Format und Accountstruktur bleiben unverändert.
- Noch offen: Deno-Tests, Review und Deployment der Edge Functions. Die Änderung wirkt erst nach dem Deployment.

## 12. Verbindliche technische Arbeitsregeln

- Keine bereits angewendeten Migrationen ändern.
- Vor einer neuen Migration zuerst die Remote-Migrationshistorie prüfen.
- Vor jedem Push `supabase db push --dry-run`; bei Abweichungen STOP.
- Keine großen Refactorings; bestehende funktionierende Abläufe erhalten.
- Jede Berechtigungsänderung mit Positiv- und Negativtests absichern.
- Keine Schülernamen, Antworten oder Lernprofile in externe KI-Prompts aufnehmen, sofern dafür nicht eine gesonderte, dokumentierte und rechtlich geprüfte Notwendigkeit besteht.

## 13. Nächster Arbeitsschritt

Als Nächstes wird die vollständige Datenfluss- und Berechtigungsprüfung der restlichen Player-, Teacher-, Editorial- und Supabase-Funktionen abgeschlossen. Danach folgen eng begrenzte Codeänderungen für die Anzeigenamenregel, die Rollenmatrix sowie Export- und Löschprozesse. Erst nach Abgleich mit der Remote-Migrationshistorie werden dafür neue Migrationen vorbereitet.
