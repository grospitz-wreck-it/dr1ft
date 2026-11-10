# DR1FT Scenario Assessment v2

Status: fachlicher und technischer Berechnungsvertrag auf Branch `fix/scenario-assessment-v2`. Dieser Stand beschreibt die Berechnungsgrundlage; es wurden keine funktionalen Änderungen und keine Supabase-Schreiboperationen vorgenommen.

## 1. Verbindliche Grundlagen und Abgrenzung

Dieses Dokument konkretisiert die vorhandene DR1FT-Basis:

- `DR1FT_Learning_Design_Assessment_Framework_v1.0.md`
- `DR1FT_Tracking_und_Auswertungsstruktur_v0.1.md`
- vorhandene Learning-Design- und Assessment-Strukturen in Editorial, Player und Supabase.

Die pädagogischen Grundsätze bleiben maßgeblich:

- Learning Evidence ist multidimensional: Behaviour, Reasoning, Reflection, Creation und Transfer.
- Ein Klick, eine Sichtung, ein Like, ein Report oder ein Missionsabschluss ist für sich allein kein Kompetenznachweis.
- Ein einzelnes Szenario ist ein Messpunkt, keine endgültige Kompetenzdiagnose.
- Evidenzsicherheit (Confidence) und Kompetenzstand sind getrennt zu behandeln.
- Fehlende Daten bedeuten zunächst „nicht beobachtet/nicht gespeichert“, nicht automatisch „nicht gekonnt“.

**Wichtige Abgrenzung:** Das Szenario-Abschlussergebnis ist eine Bewertung der im konkreten Szenario nachgewiesenen, redaktionell festgelegten Anforderungen. Es ist weder Schulnote noch Kompetenzlevel und darf nicht direkt in `user_competency_progress` geschrieben werden.

## 2. Was zählt als Berechnungseinheit?

Nicht Lernabschnitte, Posts oder Klicks pauschal zählen. Bewertet werden nur explizit konfigurierte, einzeln identifizierbare **Szenario-Anforderungen**.

Eine Anforderung ist eine pädagogisch begründete, beobachtbare Leistung, die einem Lernziel zugeordnet und durch einen zulässigen Nachweis erfüllt werden kann.

### 2.1 Scorebare Anforderungstypen im aktuellen System

**A. Szenario-Lernkarten**

- Eine Lernkarte kann eine Anforderung bilden, wenn sie scorebar und verpflichtend konfiguriert ist.
- Die vorhandenen Antwortausgänge sind `success`, `partial` und `not_yet`.
- Die vorhandene Player-Rückmeldung und die Datenbank-RPC kennen diese drei Ausgänge.
- Die vorhandene semantische Punktzuordnung ist: `success = 1.0`, `partial = 0.5`, `not_yet = 0.0`.
- Reflexionskarten sind laut bestehender RPC keine scorebare Kompetenz-Evidenz.
- `required = false` darf nicht in den Nenner eingehen.
- Bei Bestandskarten mit `required = null` ist die frühere Absicht nicht eindeutig nachgewiesen. Sie dürfen nicht stillschweigend als verpflichtend oder optional interpretiert werden. Vor einer produktiven Bewertung braucht es eine explizite Legacy-Regel oder redaktionelle Klärung.

**B. Bewertete Feed-Aktionen**

- Die vorhandene Konfiguration `content_items.extra.learningTask.assessment` mit `assessedActions` und `acceptableActions` definiert einen bewerteten Aktionsbereich.
- Die bestehende RPC leitet das Ergebnis serverseitig ab: akzeptierte Aktion = `success`, andere konfigurierte Aktion = `not_yet`.
- Bei Legacy-Konfigurationen bilden `assessedActions` und `acceptableActions` zusammen zunächst **eine** Anforderung mit mehreren möglichen Aktionen. Die einzelnen Alternativen dürfen nicht als mehrere Anforderungen gezählt werden.
- Der aktuelle Fallback `evidenceKey = 'in_feed_decision'` kann verschiedene Aktionen zusammenfallen lassen. Für neue Konfigurationen braucht jede unabhängige Anforderung eine stabile, eigene ID.
- Die Client-Anfrage darf niemals selbst das Ergebnis oder die Punktzahl bestimmen.

### 2.2 Daten, die allein keine scorebare Anforderung bilden

Diese Daten bleiben pädagogisch und analytisch wichtig, werden aber nicht automatisch in den Szenario-Prozentwert eingerechnet:

- Learning Step / Lernabschnitt: strukturiert den Lernweg, ist aber nicht selbst der Nachweis.
- `learning_step_content.required`: sagt aus, dass Content zum Lernschritt gehört; es beweist nicht, dass ein Lernziel erreicht wurde.
- `learning_steps.required`: strukturelle Pflichtangabe, keine Schülerleistung.
- Views, Likes, Kommentare, Reports und Prüf-Klicks: beobachtbare Rohhandlungen; ohne zugeordnetes und fachlich geprüftes Erfolgskriterium keine Punkte.
- Mission-Abschluss: belegt zunächst den Aufgabenabschluss, nicht automatisch die Erreichung aller zugeordneten Lernziele.
- Bloom-Level, Lernphase, pädagogische Funktion und geschätzte Dauer: Design-Metadaten, keine Leistungswerte.

Diese Trennung verhindert, dass DR1FT Aktivität mit Lernerfolg verwechselt.

## 3. Evidence Indicators: wichtige Grundlage, aber noch keine fertige Punkteskala

Die Tabelle `evidence_indicators` enthält unter anderem:

- `learning_step_id`, `objective_id`, `competency_id`
- `positive_signal`, `negative_signal`
- `evidence_type`, `dimension`
- `confidence_weight`
- `required`

Diese Indikatoren sind die fachlich richtige Verbindung zwischen Lernschritt, Lernziel und beobachtbarem Nachweis. Die vorhandenen JSON-Signale beschreiben jedoch noch keine vollständig standardisierte numerische Bewertungsfunktion.

**Insbesondere ist `confidence_weight` nicht automatisch das Gewicht einer Szenario-Punktzahl.** Es beschreibt die Bedeutung bzw. Sicherheit eines Evidenzindikators für die Interpretation. Es darf nicht ungeprüft als Multiplikator im Szenario-Prozentwert verwendet werden.

Bevor Evidence Indicators numerisch in die Szenarioberechnung eingehen, müssen je Indikator bzw. Indikatortyp festgelegt sein:

1. welches gespeicherte Ereignis als Quelle gilt;
2. wie das Ereignis eindeutig diesem Indikator zugeordnet wird;
3. welche beobachtbaren Bedingungen ein positives, negatives oder uneindeutiges Signal ergeben;
4. ob die Bewertung binär oder abgestuft ist;
5. ob der Indikator verpflichtend ist;
6. ob mehrere Ereignisse Wiederholungen desselben Nachweises oder unabhängige Nachweise darstellen.

Bis diese Regeln implementiert und getestet sind, werden Evidence Indicators im Assessment-Katalog geführt, aber nicht durch heuristische Interpretation in Punkte umgerechnet.

Das pädagogische Framework kennt außerdem die qualitative Evidence-Quality-Skala `Emerging`, `Developing`, `Secure`, `Advanced` und nennt optional interne Modellwerte von 0.00–1.00 (0.00–0.24 / 0.25–0.49 / 0.50–0.74 / 0.75–1.00). Diese Skala beschreibt die Qualität bzw. Einordnung von Evidenz. Sie ist ausdrücklich keine Schulnote und darf nicht automatisch mit dem Szenario-Abschluss-Prozentwert gleichgesetzt werden. Ebenso bleibt Confidence eine separate Größe.

## 4. Berechnungsmodell für den Szenario-Abschluss

### 4.1 Anforderungspunkte

Jede scorebare Anforderung erhält einen erreichten Wert (p_i) zwischen 0 und 1:

| Nachweisstatus | Wert |
|---|---:|
| Vollständig erfüllt | 1.0 |
| Teilweise erfüllt | 0.5 |
| Explizit nicht erfüllt | 0.0 |
| Noch kein Nachweis / nicht bearbeitet | 0.0 für den Szenario-Abschlusswert |

Die letzte Zeile gilt ausdrücklich für den **Abschlusswert**, nicht als Kompetenzdiagnose. In Berichten muss „kein Nachweis vorhanden“ von „negativer Nachweis“ unterscheidbar bleiben.

Für bestehende Lernkarten sind die drei Werte durch die gespeicherten Outcomes bereits belegt. Für andere Anforderungstypen darf die Skala erst nach Definition der fachlichen Bewertungsregel verwendet werden.

### 4.2 Gewichtung

Jede verpflichtende Anforderung erhält ein positives Gewicht (w_i).

- Wenn keine redaktionelle Gewichtung definiert ist, gilt zunächst Gewicht 1 für jede verpflichtende, scorebare Anforderung.
- Unterschiedliche Gewichte dürfen erst verwendet werden, wenn Editorial sie ausdrücklich und nachvollziehbar konfigurieren kann.
- `confidence_weight` aus `evidence_indicators` ist dafür nicht der Ersatz.
- Optionale Anforderungen tragen weder zum Zähler noch zum Nenner bei.

### 4.3 Formel

```
Szenario-Ergebnis (%) =
  100 * SUM(Gewicht_i * erreichte_Punkte_i)
      / SUM(Gewicht_i aller verpflichtenden scorebaren Anforderungen)
```

Der Wert wird intern mit ausreichender Präzision gespeichert. Rundung erfolgt nur für die Anzeige. Ergebnisstufen werden anhand des ungerundeten Wertes ausgewählt.

Wenn keine verpflichtenden scorebaren Anforderungen existieren, ist das Ergebnis `null` bzw. „nicht bewertbar“ – niemals automatisch 0 % oder 100 %.

### 4.4 Wiederholte Versuche

Alle Versuche bleiben als unveränderliche Rohereignisse erhalten.

Für die Szenario-Abschlussberechnung wird pro Anforderung nur ein Ergebnis berücksichtigt; mehrere Versuche dürfen Zähler oder Nenner nicht künstlich vervielfachen. Als Arbeitsregel wird der beste nachweislich erreichte Wert pro Anforderung vorgeschlagen. Das muss gegen die vorhandenen Lernkarten- und Feedbackabläufe getestet werden, damit Wiederholungen nicht durch bloßes Raten zu einer Kompetenzdiagnose führen.

Die Auswertung muss zusätzlich Anzahl und Verlauf der Versuche getrennt ausweisen können. Ein hoher Szenario-Abschlusswert allein ist keine Aussage über stabile, kontextübergreifende Kompetenz.

## 5. Früher Abschluss und fehlende Nachweise

- Lernende dürfen ein Szenario jederzeit ausdrücklich beenden.
- Vor dem Beenden kann der Player auf noch offene Anforderungen bzw. Aufgaben hinweisen und eine Abbruchbestätigung anbieten.
- Wird vorzeitig beendet, bleiben alle nicht nachgewiesenen verpflichtenden Anforderungen im Nenner und erhalten für den Szenario-Abschlusswert 0 Punkte.
- Nicht bearbeitete optionale Anforderungen bleiben ausgeschlossen.
- Der Abschluss ist ein gültiger Zustand, auch wenn Anforderungen offenbleiben.
- Abbrechen der Bestätigung verändert den Zustand nicht.
- Die finale Berechnung erfolgt serverseitig aus gespeicherten Nachweisen und einer unveränderlichen Bewertungsgrundlage; ein Client-Flag in `sessionStorage` ist kein Abschlussnachweis.

## 6. Drei pädagogische Abschlussrückmeldungen

Der Nutzer erinnert drei unterschiedliche Rückmeldungen abhängig davon, wie viele Anforderungen erfüllt wurden. Die genaue historische Formulierung und die damaligen Schwellenwerte sind bisher nicht zweifelsfrei im aktuellen Player-Code oder in den geprüften Datenbankobjekten nachgewiesen.

Daher gilt:

- Es werden keine Texte erfunden oder durch die drei Learning-Card-Einzelrückmeldungen ersetzt.
- Es werden keine Schwellenwerte wie 50/70/90 % oder andere Prozentgrenzen als bestehende DR1FT-Regel ausgegeben.
- Die drei Stufen bleiben als redaktionell konfigurierbare Ergebnisbänder vorgesehen.
- Schwellenwerte müssen lückenlos, überschneidungsfrei und vollständig sein.
- Die Auswahl nutzt den ungerundeten Szenario-Wert.
- Wenn die historische Logik nicht wiedergefunden wird, müssen Schwellen und Texte als neue pädagogische Entscheidung ausdrücklich festgelegt werden.

Die bestehenden Learning-Card-Texte `Stark erkannt!`, `Guter Ansatz!` und `Hier steckt eine Lernchance.` sind Antworten auf einzelne Karten. Sie sind nicht automatisch die drei Szenario-Abschlussrückmeldungen.

## 7. Einheitliche Datenbasis und Snapshot

Die Bewertungsgrundlage muss für alle Lernenden einer konkreten Klassen-Szenario-Zuweisung identisch sein.

Vorgesehen ist ein unveränderlicher Snapshot pro `class_instance_scenario_assignments.id`, der mindestens enthält:

- Scoring-Version;
- Szenario- und Zuweisungs-ID;
- alle verpflichtenden und optionalen scorebaren Anforderungen;
- stabile Requirement-IDs und Quellreferenzen;
- Lernzielbezug;
- Punkteskala und Gewicht;
- die zum Zeitpunkt der Zuweisung gültigen Ergebnisbänder und Texte, sobald diese fachlich geklärt sind.

Redaktionelle Änderungen nach Beginn einer Zuweisung dürfen bereits laufende Bewertungen nicht rückwirkend verändern. Eine neue Zuweisung erhält einen neuen Snapshot.

## 8. Bestehende technische Lücken / Risiken

1. `record_discrete_action_assessment` nutzt bei fehlender Konfiguration einen gemeinsamen `evidence_key` (`in_feed_decision`). Dadurch können unabhängige Anforderungen in Aggregationen zusammenfallen.
2. Feed-Aktionsbewertungen (`learning_result_events`) und Lernkartenantworten (`scenario_learning_card_responses`) liegen in getrennten Tabellen und haben bisher keine gemeinsame Szenario-Prozentberechnung.
3. `get_class_student_learning_evidence_v1` aggregiert Ereignisse nach `user_id`, `content_item_id` und `evidence_key`; die aktuelle Gruppierung kann unabhängige Aktionen vermischen.
4. Learning-Card-Insights verwenden den jeweils letzten Versuch, während andere Evidence-Auswertungen teils „irgendein Erfolg“ berücksichtigen. Retry-Semantik ist nicht einheitlich.
5. `learning_evidence_events` ist für explizite lernzielbezogene Evidenz vorgesehen; der bisher untersuchte Player-Pfad schreibt nicht automatisch alle Learning-Card- oder Feed-Aktionsnachweise dorthin.
6. Die Datenbank enthält Bestandskarten mit fehlenden `type`-, `position`- oder `required`-Angaben. Diese Werte brauchen eine definierte Legacy-Behandlung.
7. Die Remote-Migrationshistorie weist Drift gegenüber vorhandenen Learning-Assessment-Objekten auf. Vor jeder Schemaänderung muss diese Abweichung exakt abgeglichen werden.

Bestehende Teacher-Report-RPCs und Teacher-App bleiben außerhalb dieses Vorhabens unverändert.

## 9. Implementierungsreihenfolge

1. Historische Drei-Stufen-Texte und Schwellenwerte in Repository-Historie, Editorial-Konfiguration und Datenbestand weiter suchen.
2. Scorebare Requirement-Typen und Legacy-Regeln finalisieren.
3. Editorial-Konfiguration für stabile IDs, Pflichtstatus und optionale Gewichte definieren.
4. Gemeinsame serverseitige Berechnungsfunktion als reine, testbare Logik spezifizieren.
5. Snapshot- und Ergebnisdatenspeicherung entwerfen; Migration-History-Drift vorher klären.
6. Bestehende RPCs kompatibel anbinden und unabhängige Anforderungen sauber identifizieren.
7. Player-Abschluss und Rückmeldungen erst danach anschließen.

## 10. Verifikationsfälle

- Keine Anforderungen: Ergebnis `null`.
- Eine verpflichtende Anforderung vollständig erfüllt: 100 %.
- Eine verpflichtende Anforderung teilweise erfüllt: 50 %.
- Eine verpflichtende Anforderung ohne Nachweis: 0 %.
- Zwei gleich gewichtete Anforderungen, eine erfüllt: 50 %.
- Eine Lernkartenfrage mit mehreren Antwortoptionen zählt genau einmal.
- Mehrere akzeptierte Feed-Aktionen innerhalb einer Legacy-Anforderung zählen maximal einmal.
- Zwei unabhängige Feed-Anforderungen bleiben getrennt.
- Optionale Anforderungen verändern den Nenner nicht.
- Ein früher Abschluss lässt offene verpflichtende Anforderungen im Nenner.
- Wiederholungen vervielfachen weder Anforderungen noch Punkte.
- Rundung verändert nicht die Ergebnisband-Auswahl.
- Fehlende Daten werden nicht als negative Kompetenzdiagnose ausgegeben.
- Szenario-Ergebnis verändert keine Kompetenzstände.
- Ein Snapshot bleibt nach späteren Editorial-Änderungen unverändert.

## 11. Sicherheits- und Änderungsgrenzen

- Nur `apps/player`, `apps/editorial` und notwendige Supabase-Objekte.
- Keine Änderungen an Teacher oder anderen Apps.
- Keine Änderungen an `main`, kein Merge und kein Deployment ohne ausdrückliche Freigabe.
- Keine Produktionsmigration, kein `db push`, kein `apply_migration`, keine Datenänderung im Rahmen dieser Spezifikation.
- Rohereignisse bleiben erhalten; keine rückwirkende Erfolgsermittlung aus unvollständigen historischen Daten.
