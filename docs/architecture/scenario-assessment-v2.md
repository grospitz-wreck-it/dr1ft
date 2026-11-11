# DR1FT Scenario Assessment v2

Status: verbindlicher fachlicher Integrationsvertrag auf Branch `fix/scenario-assessment-v2`.
Stand: 10.11.2026. Dieses Dokument führt Learning Design, Editorial-Konfiguration, Player-Ereignisse und Kompetenzbewertung zusammen. Es beschreibt den Zielvertrag; funktionale Änderungen und Supabase-Schreiboperationen sind davon getrennt.

## 1. Verbindliche pädagogische Entscheidungen

### 1.1 Vier Kompetenzstufen

Jede im Szenario tatsächlich beurteilbare Zielkompetenz erhält genau eine qualitative Stufe:

| Stufe | Bedeutung |
|---|---|
| Emerging | Erste Ansätze erkennbar, aber noch keine verlässliche Anwendung |
| Developing | Grundverständnis vorhanden, Anwendung noch nicht stabil |
| Secure | Selbstständige, nachvollziehbare Anwendung |
| Advanced | Auch bei komplexen oder neuen Situationen sicher und differenziert |

Die vier Stufen beschreiben die im Szenario beobachtete Kompetenzleistung. Sie sind weder Schulnoten noch Prozentbänder. Sie dürfen nicht durch eine pauschale Umrechnung des Szenario-Erfüllungsprozents erzeugt werden.

### 1.2 Confidence ist unabhängig

| Confidence | Bedeutung |
|---|---|
| Niedrig | Nur wenige oder schwache Nachweise |
| Mittel | Mehrere passende Beobachtungen |
| Hoch | Unterschiedliche, übereinstimmende Nachweise |

Confidence beschreibt die Belastbarkeit der Einstufung, nicht die Leistungshöhe. Wiederholungen derselben Aktion sind keine unterschiedlichen Nachweise. Die konkrete technische Schwellenlogik wird erst nach einem Testdatensatz verbindlich festgelegt; es werden keine unbelegten Zahlenwerte angenommen.

### 1.3 Nicht ausreichend beurteilbar

„Nicht ausreichend beurteilbar“ ist ein eigener Ergebniszustand, keine fünfte Kompetenzstufe. Er wird verwendet, wenn zu einer Zielkompetenz keine oder zu wenige aussagekräftige Nachweise vorliegen. Fehlende oder nicht gespeicherte Daten dürfen nicht als Emerging oder als mangelnde Kompetenz interpretiert werden.

### 1.4 Drei getrennte Ergebnisse

DR1FT darf diese Ergebnisse nicht vermischen:

1. **Anforderungserfüllung im Szenario:** Welche konkret definierten Pflichtanforderungen wurden erfüllt? Hier ist ein Prozentwert zulässig.
2. **Kompetenzprofil des Szenarios:** Welche der vier Stufen ist je Zielkompetenz durch die Nachweise begründet, und wie hoch ist die Confidence?
3. **Langfristige Kompetenzentwicklung:** Welche Entwicklung zeigt sich über mehrere Szenarien, Lerngelegenheiten und Kontexte?

Ein Szenario-Prozentwert ist kein Kompetenzlevel. Ein Szenario-Kompetenzprofil ist noch keine dauerhafte Diagnose.

## 2. Gemeinsamer Datenfluss

Der verbindliche Ablauf lautet:

```
Learning Design
  Lernziel + Zielkompetenz
        |
        v
Editorial Assessment Design
  stabile Anforderungen + Evidence Indicators + Kriterien
        |
        v
Assignment Snapshot
  unveränderliche Bewertungsgrundlage für diese Zuweisung
        |
        v
Player Events / Antworten
  Feed-Aktionen, Lernkarten, Reflexion, Creation, Transfer
        |
        v
Normalisierte Evidence
  Quelle + Requirement/Indicator + Wert + Kontext + Zeitpunkt
        |
        v
Szenario-Auswertung
  Anforderungserfüllung + Kompetenzstufe + Confidence
        |
        +--------------------+
        v                    v
Player Abschluss         Langfristige Entwicklung
Botschaft + Profil       über mehrere Szenarien
```

Jede Bewertung muss vom Ergebnis bis zum konkreten Lernziel, Indikator und gespeicherten Nachweis zurückverfolgbar sein.

## 3. Was ist eine Anforderung und was ist ein Nachweis?

Eine **Anforderung** ist eine einzeln identifizierbare, beobachtbare Schülerleistung. Sie wird einem Lernziel und mindestens einer Zielkompetenz zugeordnet.

Ein **Evidence Indicator** beschreibt, woran die relevante Leistung erkannt wird. Er verbindet Lernschritt, Lernziel, Kompetenz, Evidenzdimension und beobachtbare Kriterien.

Ein **Rohereignis** ist zunächst nur eine gespeicherte Aktion oder Antwort. Es wird erst dann zu bewertbarer Evidence, wenn eine redaktionell definierte Regel es einem Indikator zuordnet und die Kriterien erfüllt sind.

### 3.1 Mehrere erwartete Handlungen müssen getrennte Anforderungen sein

Wenn ein Beitrag zwei unterschiedliche Handlungen fördern soll und beide erwartet werden, sind es zwei Requirement-IDs.

Beispiel:
- Requirement A: Quelle prüfen.
- Requirement B: Kontext prüfen.

Erfüllt der Schüler nur A, ist die Anforderungserfüllung bei gleicher Gewichtung 1 von 2 = 50 %. Der Beitrag darf nicht als vollständig erfüllt gelten.

**Wichtig: Alternativen sind etwas anderes als mehrere Pflichtanforderungen.**
- Mehrere Handlungen, die alle erforderlich sind: mehrere Requirement-IDs.
- Mehrere mögliche Handlungen, von denen eine genügt: eine Requirement-ID mit mehreren akzeptierten Alternativen.

Die Editorial-Oberfläche bietet jetzt `requirementMode`:
- `any`: Eine akzeptierte Aktion genügt. Das bleibt der Standard für Bestandsinhalte.
- `all_acceptable`: Jede als passend markierte Aktion ist eine eigene Pflichtanforderung. Werden zwei passende Aktionen erwartet und nur eine ausgeführt, ist eine von zwei Anforderungen erfüllt.

Im Modus `all_acceptable` schreibt die neue RPC-Migration für jede Aktion einen stabil getrennten Evidence-Key. Akzeptierte Aktionen werden als Requirement-Erfüllung gespeichert; nicht akzeptierte Aktionen bleiben Interaktionssignale und werden nicht als fehlgeschlagene Pflichtanforderung gezählt. Der Server leitet das Outcome weiterhin aus der gespeicherten Editorial-Konfiguration ab.

### 3.2 Pflicht, optional und nicht beobachtet

- Pflichtanforderungen zählen in Zähler und Nenner der Szenario-Anforderungserfüllung.
- Optionale Anforderungen zählen weder in Zähler noch Nenner.
- Eine nicht ausgeführte Pflichtanforderung erhält im Szenario-Erfüllungswert 0 Punkte.
- Im Kompetenzprofil bleibt „nicht beobachtet“ von „beobachtet und nicht erfüllt“ unterscheidbar.
- Wenn es keine Pflichtanforderungen gibt, lautet der Erfüllungswert „nicht bewertbar“ und nicht 0 % oder 100 %.

## 4. Bewertungsregeln für die Anforderungserfüllung

### 4.1 Werte

| Status | Wert |
|---|---:|
| Vollständig erfüllt | 1.0 |
| Teilweise erfüllt | 0.5 |
| Explizit nicht erfüllt | 0.0 |
| Keine Beobachtung / nicht bearbeitet | 0.0 für Pflichtanforderungen im Szenario-Erfüllungswert |

Die Werte 1.0 / 0.5 / 0.0 sind für bestehende Learning-Card-Outcomes `success`, `partial`, `not_yet` bereits vorhanden. Andere Quelltypen dürfen diese Werte erst verwenden, wenn ihre Bewertungsregel explizit definiert ist.

### 4.2 Formel

```
Anforderungserfüllung (%) =
  100 * SUM(Gewicht_i * erreichte_Punkte_i)
      / SUM(Gewicht_i aller Pflichtanforderungen)
```

- Standardgewicht ist 1.
- Abweichende Gewichte müssen ausdrücklich im Editorial konfiguriert werden.
- `evidence_indicators.confidence_weight` ist kein Ersatz für das Gewicht einer Pflichtanforderung.
- Rundung erfolgt nur bei der Anzeige.

### 4.3 Wiederholungen

- Alle Versuche bleiben als Rohereignisse nachvollziehbar.
- Pro Requirement wird für den Szenario-Abschluss der **letzte gültige Versuch** berücksichtigt. Das entspricht dem bestehenden Learning-Card-Reporting, das die letzte Antwort pro Schüler und Karte auswählt.
- Mehrere Versuche erzeugen keine zusätzlichen Requirements und erhöhen nicht automatisch die Confidence.
- Eine spätere Änderung dieser Regel braucht eine bewusste pädagogische Entscheidung und Tests gegen die Feedback- und Retry-Interaktion.

## 5. Kompetenzstufe aus Evidence ableiten

Die Kompetenzstufe wird pro Zielkompetenz aus den zugeordneten Evidence Indicators und deren qualitativen Kriterien abgeleitet – nicht aus dem Szenario-Prozentwert.

### 5.1 Evidence-Dimensionen

Das DR1FT-Framework unterscheidet:
- Behaviour: Was hat die Person getan?
- Reasoning: Wie wurde eine Entscheidung begründet?
- Reflection: Was erkennt die Person über ihr Verhalten?
- Creation: Was hat sie erstellt?
- Transfer: Kann sie eine Erkenntnis in einer neuen Situation anwenden?

Nicht jedes Szenario muss alle fünf Dimensionen abdecken. Die ausgewählten Dimensionen müssen zum Lernziel passen.

### 5.2 Mindestanforderungen an einen Indikator

Jeder bewertete Indikator muss festlegen:
1. zugehöriges Lernziel und Kompetenz;
2. Evidenzdimension und Evidenztyp;
3. zulässige Ereignisquelle(n);
4. eindeutige Requirement-/Indicator-ID;
5. positive, teilweise, negative und uneindeutige Beobachtungskriterien;
6. ob der Indikator verpflichtend oder ergänzend ist;
7. wie Wiederholungen und unabhängige Beobachtungen unterschieden werden;
8. welche qualitative Beschreibung die vier Stufen in diesem Kontext konkret belegt.

Ein einzelner Klick oder eine einzelne Feed-Aktion kann einen eng begrenzten Behaviour-Nachweis liefern. Sie belegt für sich allein keine differenzierte Begründung, Reflexionsfähigkeit oder Transferkompetenz.

### 5.3 Stufenzuordnung

Die Stufenbeschreibungen aus Abschnitt 1.1 sind die gemeinsame Sprache. Für jede Zielkompetenz müssen die konkreten Indikatoren und Rubrikbeschreibungen diese Stufen operationalisieren.

- **Emerging:** erste passende Ansätze sind tatsächlich beobachtet.
- **Developing:** Grundverständnis ist durch passende Nachweise erkennbar, Anwendung bleibt instabil.
- **Secure:** selbstständige und nachvollziehbare Anwendung ist durch ausreichende Nachweise belegt.
- **Advanced:** sichere, differenzierte Anwendung ist auch bei komplexen oder neuen Situationen belegt.
- **Nicht ausreichend beurteilbar:** die Datenbasis trägt keine faire Stufenzuordnung.

Eine Prozentgrenze für die vier Stufen wird nicht aus dem Szenario-Erfüllungswert abgeleitet. Die Framework-internen optionalen Modellwerte 0.00–1.00 sind nicht automatisch eine verbindliche DR1FT-Szenario-Punkteskala.

## 6. Confidence bestimmen

Confidence wird separat pro Kompetenzbewertung ermittelt. Maßgeblich sind:
- Anzahl eigenständiger, relevanter Nachweise;
- Qualität und Eindeutigkeit der Nachweise;
- Vielfalt der Quellen, Aufgaben oder Evidenzdimensionen;
- Übereinstimmung bzw. Widerspruch zwischen den Nachweisen;
- Kontextnähe zum Lernziel.

Mehrere Events derselben Handlung oder mehrere Retries derselben Karte sind keine unabhängigen Nachweise. Die exakten technischen Grenzwerte werden anhand realer bzw. synthetischer Testfälle kalibriert und dokumentiert, bevor sie produktiv eingesetzt werden.

## 7. Datenquellen und derzeitige Trennung

Die aktuelle Implementierung besitzt mehrere getrennte Quellen:

| Quelle | Aktuelle Speicherung | Aktueller Stand |
|---|---|---|
| Bewertete Feed-Aktionen | `learning_result_events` | Server leitet `success` / `not_yet` aus `learningTask.assessment` ab |
| Szenario-Lernkarten | `scenario_learning_card_responses` | Antwort und Outcome werden gespeichert; aktuelle RPC schreibt keine `learning_evidence_events` |
| Learning-Design-Indikatoren | `evidence_indicators` | Struktur vorhanden, aber keine vollständig standardisierte Rubrik- und Quellenzuordnung |
| Normalisierte Lern-Evidence | `learning_evidence_events` | Tabelle vorhanden; muss als gemeinsame Evidenzbasis sauber angebunden werden |
| Kompetenz-Snapshots | `competency_assessments` | Schema vorhanden, derzeit keine Datensätze |
| Legacy-Kompetenzfortschritt | `user_competency_progress` | Altes numerisches Level-Modell; nicht ungeprüft für die vier Stufen weiterverwenden |

Diese Quellen dürfen nicht durch doppelte Inserts künstlich vereinheitlicht werden. Ziel ist ein gemeinsamer serverseitiger Assessment-Read- und Calculation-Pfad, der Quellereignisse normalisiert und ihre Herkunft beibehält.

## 8. Festgestellte Implementierungslücken

1. Legacy-Inhalte ohne `requirementMode` nutzen weiterhin den Fallback `in_feed_decision` und die bisherige „eine passende Alternative genügt“-Semantik. Neue Inhalte können mit `all_acceptable` einzelne Evidence-Keys je erwarteter Aktion erzeugen.
2. Die Editorial-Oberfläche kann jetzt zwischen `any` und `all_acceptable` unterscheiden. Eine weitergehende freie Zuordnung beliebiger Requirement-Gruppen ist noch nicht umgesetzt.
3. `get_class_student_learning_evidence_v1` bleibt unverändert und gruppiert nach User, Content und Evidence-Key mit `bool_or(success)`. Diese ältere Teacher-Auswertung ist nicht die neue Szenario-Abschlussberechnung und wird in diesem Arbeitsschritt nicht verändert.
4. Lernkarten und Feed-Aktionen bleiben in getrennten Rohdatentabellen. Die neue Abschluss-RPC führt sie für einen konkreten Assignment-Snapshot zusammen, ohne Rohereignisse zu verschieben oder doppelt zu schreiben.
5. Die aktuelle `submit_scenario_learning_card`-RPC speichert Antworten in `scenario_learning_card_responses` und gibt `evidence_events_created = 0` zurück. Die neue Auswertung liest diese Antworten direkt; sie schreibt keine zusätzlichen `learning_evidence_events`.
6. Die neue Szenario-Auswertung verwendet den letzten Versuch je Requirement. Die bestehenden Teacher-Insights bleiben unverändert.
7. Der Player zeigt noch ein numerisches Kompetenzlevel 1–5. Ein Missionsabschluss kann über `update_competency_progress_after_mission` den Legacy-Fortschritt erhöhen. Das ist nicht das vereinbarte vierstufige Assessment.
8. `evidence_indicators`, `learning_evidence_events`, `learning_result_events`, `scenario_learning_card_responses` und `competency_assessments` hatten zum Prüfzeitpunkt jeweils 0 Datensätze. Vorhanden sind 2 Learning Designs und 7 Lernziele. Es gibt daher keine vorhandenen Evidence-Daten, aus denen ein belastbarer historischer Kompetenzverlauf rekonstruiert werden könnte.
9. Die Remote-Migrationshistorie enthält keine Ledger-Einträge zu den im Repository vorhandenen Learning-Assessment-Migrationen (u. a. `20261027180000`, `20261031170000`, `20261102090000` bis `20261102130000`), obwohl die zugehörigen Tabellen und Funktionen live vorhanden sind. Das ist ein Quellen-/Ledger-Drift und kein Beleg dafür, dass die Objekte nie angewendet wurden. Vor jedem `db push` oder Migration-Replay ist ein eigener Abgleich zwingend.

## 9. Bereits umgesetzte Bausteine auf dem Arbeitsbranch

- `calculate_scenario_requirement_score_v1(jsonb, jsonb)` ist als reine, unveränderliche SQL-Funktion ergänzt. Sie liest und schreibt keine Anwendungstabellen.
- Die Funktion zählt nur explizit verpflichtende Requirements, ignoriert optionale Requirements, behandelt fehlende Pflichtnachweise als 0 Punkte bei gleichzeitigem Status `unobserved` und verwendet den letzten Versuch in der übergebenen chronologischen Reihenfolge.
- Die Migration enthält Regressionstests für 1 von 2 erfüllten Anforderungen = 50 %, Teil-Erfüllung = 50 %, optionale Anforderungen, den letzten Versuch und den Fall ohne Pflichtanforderungen.
- Editorial kann für Feed-Aktionen zwischen einer genügenden Alternative und mehreren einzeln erforderlichen akzeptierten Aktionen unterscheiden.
- Die neue RPC-Migration erhält die bisherige Semantik für Bestandsinhalte ohne `requirementMode` (`any`).
- Neue bzw. ausdrücklich reaktivierte Szenario-Zuweisungen erhalten einen unveränderlichen Requirement-Snapshot. Pflicht-Lernkarten und Feed-Anforderungen werden beim Zuweisungszeitpunkt eingefroren.
- `finalize_scenario_assessment_v1` führt die letzten Feed- und Lernkartenversuche gegen diesen Snapshot zusammen und speichert ein idempotent aktualisierbares Szenario-Ergebnis. Das Ergebnis verändert keinen langfristigen Kompetenzstand.

- Der Player bietet jetzt einen jederzeit erreichbaren Abschluss-Button, bestätigt das Beenden, ruft die Abschluss-RPC für jedes aktive Szenario auf und zeigt Prozentwert sowie vollständig/teilweise/nicht erfüllt/ohne Nachweis an. Das Ergebnis wird nach einem Reload erneut aus der Datenbank geladen.
- Player- und Editorial-Vorschau bauen auf Vercel erfolgreich.

**Noch nicht umgesetzt:** Die vier Kompetenzstufen und Confidence werden noch nicht aus Ereignissen berechnet. Die drei historisch erinnerten Abschlussformulierungen und ihre damaligen Schwellenwerte sind weiterhin nicht zweifelsfrei nachgewiesen und werden deshalb nicht erfunden. Bestehende aktive Zuweisungen erhalten beim Migration-Cutover nur dann einen Snapshot, wenn für diese Klassen-/Szenario-Kombination noch keinerlei bewertete Feed- oder Lernkartenereignisse existieren. Bei vorhandener Bewertungshistorie wird kein Snapshot erfunden; diese Zuweisung bleibt zunächst nicht auswertbar und muss für einen neuen Bewertungsdurchlauf ausdrücklich reaktiviert werden.

**Produktionsstatus (11.11.2026):** Die vier Migrationen `20261110100000` bis `20261110130000` wurden vom Nutzer direkt im Supabase SQL Editor ausgeführt. Die zugehörigen Datenbankobjekte und Berechtigungen wurden read-only nachgewiesen; die Scoring-Funktion besteht einen Smoke-Test (1 von 2 Pflichtanforderungen = 50 %). Die vier Versionsnummern fehlen jedoch noch im Remote-Migrations-Ledger. Die Dateien dürfen nicht erneut ausgeführt werden. Nach exakter Prüfung der lokalen SQL-Quellen sind ausschließlich diese vier Versionsnummern mit `supabase migration repair <version> --status applied` zu registrieren. Die übrigen historischen Migration-Abweichungen bleiben separat zu reconciliieren. Die Realtime-/Index-/Privilege-Nachbesserung `20261111184418` wurde angewendet und ist registriert.

## 10. Zielbild der technischen Zusammenführung

Die Implementierung soll diese Verantwortlichkeiten trennen:

1. **Editorial:** erstellt und validiert Anforderungen, Indikatoren, Rubriken und Ergebnisformulierungen. Wiederverwendbare Vorlagen minimieren den Pflegeaufwand.
2. **Assignment Snapshot:** friert die für eine konkrete Klassen-Szenario-Zuweisung gültige Bewertungsgrundlage ein. Spätere Editorial-Änderungen verändern laufende Bewertungen nicht rückwirkend.
3. **Player:** sendet nur IDs und tatsächlich ausgeführte Aktionen/Antworten. Er bestimmt niemals selbst Outcome, Punktzahl, Kompetenzstufe oder Confidence.
4. **Supabase:** validiert Aktionen und Zuweisung, speichert Rohereignisse append-only und stellt eine gemeinsame serverseitige Auswertung bereit.
5. **Szenario-Ergebnis:** speichert Anforderungserfüllung und je Kompetenz Stufe, Confidence, Begründung und Quellenverweise als nachvollziehbaren Snapshot.
6. **Langfristiger Fortschritt:** aggregiert mehrere Szenario-Snapshots und Kontexte. Ein einzelnes Szenario oder ein Missionsabschluss aktualisiert nicht automatisch einen dauerhaften Kompetenzstand.

Ein möglicher Snapshot muss mindestens Scoring-Version, Assignment-ID, Szenario-/Design-Version, Requirement-IDs, Objective-/Competency-Bezug, Pflichtstatus, Gewicht, Quellenreferenzen, Rubrikversion und Ergebnis enthalten.

Die bestehende `competency_assessments`-Tabelle ist zu prüfen, bevor sie für das neue vierstufige Modell verwendet wird. Das Feld `level smallint` und die Legacy-Tabelle `user_competency_progress` dürfen nicht ohne Kompatibilitätsprüfung umgedeutet werden.

## 10. Redaktioneller Aufwand: verbindlicher Minimalansatz

Für ein Szenario soll die Redaktion nicht jede Interaktion einzeln bewerten müssen.

- Pro Szenario werden wenige zentrale Lernziele und Zielkompetenzen ausgewählt.
- Für jede Zielkompetenz werden nur die tatsächlich relevanten Indikatoren aktiviert.
- Ein Indikator kann durch mehrere zulässige Quellen belegt werden, wenn diese dieselbe pädagogische Aussage stützen.
- Pflichtanforderungen und optionale Vertiefungen sind klar getrennt.
- Für strukturierte Antworten erfolgt die Bewertung regelbasiert.
- Freitext, Reflexion und Creation benötigen transparente Rubriken; KI darf unterstützen, aber die Kriterien müssen nachvollziehbar und überprüfbar bleiben.
- Vorlagen für häufige Kompetenzen und Evidence Indicators reduzieren den redaktionellen Aufwand.

## 11. Implementierungsreihenfolge und Änderungsgrenzen

**Aktualisierung 11.11.2026:** Die Anforderungsscore-Funktion, Assignment-Snapshots, Ergebnis-Persistenz, Finalizer, Lehrerfreigabe und erste Player-Abschlussanzeige sind bereits implementiert. Die vier zugehörigen SQL-Migrationen sind technisch in Produktion vorhanden, aber noch nicht im Remote-Ledger registriert. Die folgende Reihenfolge ist deshalb ein Plan für die noch offene Arbeit und kein Statusbericht über noch nicht begonnene Basiskomponenten.

1. Die vier Stufen, Confidence und „nicht ausreichend beurteilbar“ sind fachlich festgelegt.
2. Die bestehende Feed- und Lernkarten-Semantik wird gegen das Requirement-Modell abgeglichen.
3. Die neue Editorial-Konfiguration für unabhängige Requirements und Indicator-Rubriken wird spezifiziert.
4. Eine reine, testbare Berechnungslogik wird mit Testfällen implementiert.
5. Supabase-Migrationsdrift wird abgeglichen; erst danach wird eine additive, versionierte Datenbankänderung vorbereitet.
6. Assignment-Snapshot und serverseitige Auswertung werden implementiert.
7. Player-Abschlussbotschaft und aufklappbares Kompetenzprofil werden angeschlossen.
8. Langfristige Kompetenzentwicklung wird erst nach Validierung der Szenario-Snapshots angebunden.

Änderungsgrenzen:
- Primär `apps/editorial` und `apps/player`; `apps/teacher` nur dort, wo der bestehende Lehrer-Report oder die Freigabesteuerung an denselben Ergebnisvertrag angeschlossen werden muss.
- Keine Änderungen an anderen Apps ohne begründete Abhängigkeit.
- Keine Änderungen an `main`, kein Merge und kein Deployment in Produktion ohne ausdrückliche Freigabe.
- Keine Supabase-Produktionsmigration, kein `db push` und keine produktive Datenänderung ohne ausdrückliche Freigabe und abgeschlossene Migration-Reconciliation.
- Keine rückwirkende Erfindung von Evidenz aus fehlenden historischen Daten.

## 12. Verifikationsfälle

- Ein Beitrag verlangt zwei unabhängige Aktionen; eine ausgeführte Aktion ergibt 1/2 = 50 % Anforderungserfüllung.
- Zwei akzeptierte Alternativen für dieselbe pädagogische Anforderung zählen zusammen maximal einmal.
- Eine Learning Card zählt unabhängig von der Anzahl ihrer Antwortoptionen genau einmal als Requirement.
- Pflichtanforderung ohne Nachweis bleibt im Nenner; optionale Anforderung nicht.
- „Nicht beobachtet“ wird nicht als negative Kompetenzdiagnose interpretiert.
- Ein einzelner Klick oder ein Like erzeugt keine Kompetenzstufe.
- Wiederholte Events derselben Handlung erhöhen nicht automatisch Confidence.
- Eine Kompetenz kann „nicht ausreichend beurteilbar“ sein, obwohl das Szenario abgeschlossen wurde.
- Secure setzt selbstständige, nachvollziehbare Anwendung voraus.
- Advanced setzt Nachweise in komplexen oder neuen Situationen voraus.
- Confidence hoch setzt unterschiedliche, übereinstimmende Nachweise voraus.
- Der Szenario-Prozentwert wird nicht in eine Kompetenzstufe umgerechnet.
- Eine spätere Editorial-Änderung verändert keinen bereits erstellten Assignment-Snapshot.
- Ein Szenario-Snapshot aktualisiert nicht ungeprüft den Legacy-Kompetenzfortschritt.


## Teacher-controlled student result visibility

- Each subscribed scenario assignment has a separate `student_reports_enabled` flag.
- The flag is added by `20261110130000_teacher_controlled_student_scenario_reports.sql` and defaults to `false`, including for existing assignments.
- The Teacher dashboard exposes the setting directly on the assigned scenario card, next to the student and eye icons. It remains available for inactive subscriptions.
- The existing `show_reports_at_end` field is deliberately unchanged; it controls teacher-facing report timing and is not reused for student visibility.
- Student finalization always calculates and persists the result. The public student RPC returns only `status: hidden` until the teacher enables the flag. The internal finalizer is no longer executable by authenticated clients.
- Direct access to the results table is granted only to authenticated users covered by the teacher-scoped RLS policy. Students cannot read it directly.
- The existing individual student report in the Teacher dashboard now includes the persisted scenario requirement result. Teacher access remains independent of the student visibility toggle.
- Changing the flag later affects the next result retrieval; it does not recalculate or mutate stored results.

## 13. Verbindlicher Ablauf des Szenarioabschlusses (Entscheidung 11.11.2026)

Die Kompetenzdiagnose wird **ausschließlich beim endgültigen Szenarioabschluss** berechnet. Während der Bearbeitung sammelt DR1FT relevante Ereignisse und Antworten; es wird keine laufend aktualisierte oder scheinbar endgültige Kompetenzstufe angezeigt.

Der Abschluss hat zwei getrennte Schritte:

1. **Abschlussprüfung vor der Bestätigung:** Der Player ermittelt den aktuellen Bearbeitungsstand aus den zum Assignment-Snapshot gehörenden Pflichtanforderungen und zeigt eine passende, redaktionell gepflegte Abschlussrückmeldung. Diese Rückmeldung ist eine Entscheidungshilfe und noch keine Kompetenzdiagnose.
2. **Endgültiger Abschluss nach Bestätigung:** Erst nach der Bestätigung wird die Szenarioauswertung serverseitig finalisiert und gespeichert. Sie umfasst die Anforderungserfüllung sowie – sobald die Kompetenz-Rubrik implementiert ist – das qualitative Kompetenzprofil mit Confidence und Evidenzbezug.

### 13.1 Drei scenario-level Abschlussrückmeldungen

Die drei Rückmeldungen gehören ausschließlich zur **Szenarioebene**. Sie sind keine Felder eines einzelnen Feed-Posts und verändern nicht dessen bestehende Aktionsbewertung.

- **Wenig Evidenz entdeckt:** sinngemäß „Bist du sicher? Du hast bisher kaum etwas gefunden …“
- **Noch Hinweise offen:** sinngemäß „Willst du DR1FT wirklich schon beenden? Es gibt noch Hinweise zu finden.“
- **Szenario gut erfasst:** sinngemäß „Du hast das Thema bereits gut erfasst …“

Die Texte werden im Editorial auf Szenarioebene gepflegt. Die Zuordnung zu den drei Bearbeitungsständen erfolgt anhand der tatsächlichen Requirement-Ergebnisse des aktuellen Assignment-Snapshots – nicht anhand einer Kompetenzstufe und nicht anhand eines frei erfundenen Prozentbands.

**Noch zu kalibrieren:** Die exakten Auswahlgrenzen zwischen „wenig Evidenz“ und „noch Hinweise offen“ werden vor der Implementierung anhand konkreter Szenario-Testfälle festgelegt. Bis dahin dürfen keine willkürlichen Prozentgrenzen eingeführt werden. Der Zustand „alle Pflichtanforderungen erfüllt“ kann eindeutig der dritten Rückmeldung zugeordnet werden.

### 13.2 Ergebnisdarstellung

Nach dem endgültigen Abschluss erhält der Schüler zuerst eine verständliche Gesamtbotschaft. Darunter liegt ein aufklappbares Kompetenzprofil mit je Kompetenz:

- Stufe: Emerging, Developing, Secure oder Advanced;
- Confidence: niedrig, mittel oder hoch;
- „Nicht ausreichend beurteilbar“ als eigener Zustand;
- kurze Begründung und konkrete zugehörige Nachweise;
- nächster Lernschritt, sofern redaktionell hinterlegt.

Die Detailtiefe darf die verständliche Gesamtbotschaft nicht verdrängen. Die Lehrkraft erhält das vollständige Szenario-Ergebnis unabhängig davon, ob die zusätzliche Schüleransicht über `student_reports_enabled` freigegeben ist.

### 13.3 Mehrere Szenarien in einem Lernlauf

Wenn ein Lernlauf mehrere Szenarien enthält, bleibt die Bewertung je Szenario getrennt. Die Abschlussprüfung muss deshalb die betroffenen Szenarien berücksichtigen; ein gemeinsamer Prozentwert darf unterschiedliche Kompetenzprofile nicht zusammenziehen. Eine übergreifende Lernlauf-Zusammenfassung ist eine zusätzliche Darstellung, kein Ersatz für die einzelnen Szenario-Snapshots.

### 13.4 Redaktionelle Threshold-Konfiguration und Live-Vorschau

- Die drei Abschlussformulierungen werden auf Szenarioebene im Editorial gepflegt.
- Zwei Regler definieren die Grenze zwischen den drei Rückmeldungen. Gespeichert werden Prozentwerte; die Oberfläche rechnet sie unmittelbar anhand der aktuell konfigurierten, auswertbaren Pflichtanforderungen in ungefähre Anzahlen um.
- Der Nenner entspricht der Snapshot-Logik: explizit verpflichtende, bewertbare Lernkarten (keine Reflexionskarten) plus aktive Feed-Anforderungen. Bei `all_acceptable` zählt jede als erforderlich konfigurierte akzeptierte Aktion separat; bei `any` zählt die Aktionseinheit einmal. Optionale und nicht bewertbare Inhalte zählen nicht.
- Die Schwellen beziehen sich auf die Szenario-Anforderungserfüllung. Teilweise erfüllte Anforderungen zählen gemäß Scoring mit 0,5; deshalb sind die angezeigten absoluten Abfragezahlen ausdrücklich Näherungswerte, während die Prozentgrenze maßgeblich bleibt.
- Vor dem endgültigen Abschluss ruft der Player `preview_scenario_assessment_v1` auf. Diese RPC prüft die aktive Schülerzuweisung, liest den unveränderlichen Assignment-Snapshot und die dazugehörigen Ereignisse und berechnet das Ergebnis ohne Schreiboperation. Sie liefert außerdem die drei Texte und Schwellen des Szenarios.
- Erst wenn der Schüler nach Anzeige der passenden Rückmeldung ausdrücklich „Jetzt abschließen“ wählt, wird `finalize_scenario_assessment_v1` aufgerufen und das Ergebnis gespeichert.
- Die neue Preview-RPC und das Szenariofeld werden in separaten, additiven Migrationen angelegt. Sie sind auf dem Arbeitsbranch vorbereitet, aber noch nicht in Supabase-Produktion angewendet. Kein DB-Push und kein Produktionsdeployment erfolgte im Rahmen dieser Änderung.
