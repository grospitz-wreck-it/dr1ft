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

Die aktuelle technische Struktur enthält bereits kein separates Nachnamenfeld in der untersuchten Schüleranlage. Die Eingabefelder `display_name` und `username` sind jedoch noch nicht ausreichend eingeschränkt.

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
- Die in Migration 0029 definierte Hilfsfunktion `is_teacher_or_admin_of_class_instance` umfasst dagegen nur `teacher` und `school_admin`.
- Die Account-Verwaltungsfunktion und die Report-Funktion haben unterschiedliche Rollenlisten.
- Vor Produktivbetrieb muss jede aktuelle RLS-Policy, RPC und Edge Function gegen eine einheitliche Berechtigungsmatrix getestet werden. Die hier geprüften Ausschnitte beweisen nicht, dass spätere Migrationen alle Abweichungen korrigiert haben.

## 3. Priorisierte Maßnahmen

| Priorität | Maßnahme | Status |
|---|---|---|
| P0 | Anzeigenamen verbindlich auf pseudonyme Kurzform begrenzen (z. B. „Max“ oder „Max M.“) – in Lehrkraft-UI, Player-Profil, Edge Functions und Datenbank-Schreibpfaden | Offen |
| P0 | Einheitliche Rollenmatrix für teacher, school_admin und school_lead definieren und alle Edge Functions/RLS/RPCs dagegen prüfen | Offen |
| P0 | Löschkonzept implementieren: Klasse verlassen, Account deaktivieren/löschen, Lern-/Interaktionsdaten löschen oder rechtssicher anonymisieren, Reports/Snapshots und Backups berücksichtigen | Offen |
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
- `cloudflare/ambient-image-worker/src/index.ts`

Feststellungen:
- Der Ambient-Generator ist ein redaktioneller Workflow. Die geprüfte Prompt-Erstellung verwendet Thema, Altersband, Stilparameter, redaktionelles Trend-Briefing, redaktionelle Creator-Persona sowie den Ambient-Interessen-Katalog.
- In diesem geprüften Pfad wird keine Schülerliste, kein Schülerprofil, kein Lernreport und keine individuelle Schülerantwort abgefragt oder in den Prompt eingesetzt.
- Textgenerierung kann über Anthropic oder Gemini erfolgen. Es existiert ein älterer separater Ambient-Generator, der ebenfalls Anthropic verwendet.
- Bildgenerierung erfolgt über Cloudflare Workers AI (FLUX) mit Gemini-Bild-Fallback. Übertragen wird der redaktionell erzeugte Bildprompt. Die Bild-QA nutzt Gemini zur Prüfung eines generierten Bildes.
- Der geprüfte Cloudflare Worker verlangt einen API-Schlüssel und gibt kein persistentes Nutzerprofil aus. Die CORS-Preflight-Antwort erlaubt jedoch `*`; da der Aufruf serverseitig mit Bearer-Key erfolgt, ist dies nicht automatisch eine Offenlegung, sollte aber vor Produktion auf notwendige Origins/Methoden reduziert werden.

Bewertung:
- **Im geprüften Ambient-Content-Pfad ist keine Übermittlung individueller Schülerdaten an Cloudflare, Gemini oder Anthropic erkennbar.**
- Das ist kein Nachweis für sämtliche KI-Funktionen des Produkts. Die vollständige Suche über Player-Dialoge, NPC-/Chat-Funktionen, alle Server Actions und mögliche weitere API-Routen ist noch offen.
- Verbindliche Schutzregel bleibt: Schülerantworten, Lernprofile, Anzeigenamen, User-IDs, Login-Kennungen und Klassenlisten dürfen nicht in externe KI-Prompts gelangen. Wo KI-Funktionen pädagogisches Feedback erzeugen, ist ein gesonderter Datenfluss- und Vertragscheck erforderlich.

## 7. Grenzen dieses Zwischenstands

- Es wurde kein Zugriff auf die produktive Supabase-Datenbank, deren tatsächliche RLS-Policies, Secrets oder Migration-Historie ausgeführt.
- Es wurde kein IONOS- oder Supabase-Deployment geprüft.
- Es wurden keine automatisierten Tests, Builds oder Penetrationstests ausgeführt.
- Eine Prüfung der KI-Pipeline ist noch nicht vollständig abgeschlossen.
- Die bloße Existenz einer Migration im Repository beweist nicht, dass sie remote angewendet wurde.
- Es wurden in diesem Audit-Zwischenstand keine produktiven Daten verändert und keine Migration ausgeführt.

## 8. Verbindliche technische Arbeitsregeln

- Keine bereits angewendeten Migrationen ändern.
- Vor einer neuen Migration zuerst die Remote-Migrationshistorie prüfen.
- Vor jedem Push `supabase db push --dry-run`; bei Abweichungen STOP.
- Keine großen Refactorings; bestehende funktionierende Abläufe erhalten.
- Jede Berechtigungsänderung mit Positiv- und Negativtests absichern.
- Keine Schülernamen, Antworten oder Lernprofile in externe KI-Prompts aufnehmen, sofern dafür nicht eine gesonderte, dokumentierte und rechtlich geprüfte Notwendigkeit besteht.

## 9. Nächster Arbeitsschritt

Als Nächstes wird die vollständige Datenfluss- und Berechtigungsprüfung der restlichen Player-, Teacher-, Editorial- und Supabase-Funktionen abgeschlossen. Danach folgen eng begrenzte Codeänderungen für die Anzeigenamenregel, die Rollenmatrix sowie Export- und Löschprozesse. Erst nach Abgleich mit der Remote-Migrationshistorie werden dafür neue Migrationen vorbereitet.
