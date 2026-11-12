# DR1FT Learning Results — Datenmodell v1

Status: Datenvertrag; diskrete In-Feed-Bewertung und klassenbezogene Evidenz-Reports sind teilweise implementiert. Kompetenzaggregation und umfassende Ergebnisprojektionen bleiben offen.

## Ziel

Eine zentrale, nachvollziehbare Ergebnisgrundlage für Content-Fortschritt, Missionsfortschritt, Insights und individuelle Lernreports. Auswertungen dürfen ihre eigene Bewertungslogik nicht separat implementieren.

## Bereits vorhandene Bausteine

- `content_items.extra` speichert flexible Content-Metadaten; die Learning-Task-Konfiguration und die ausgewählten Interaktionen liegen dort bereits.
- `user_interactions` protokolliert ausgeführte Aktionen mit `user_id`, `content_item_id`, `interaction_type`, `class_instance_id`, `metadata` und Zeitstempel.
- `missions` verbindet derzeit eine Szenario-Mission mit einer triggerbasierten Abschlussbedingung.
- `user_mission_progress` speichert einen groben Status (`started` / `completed`), aber noch keine anteiligen Content-Ergebnisse.
- `user_competency_progress` speichert Kompetenz-Evidenz, ist aber nicht mit einer formal berechneten Content-/Mission-Prozentwertung gleichzusetzen.

## Begriffe

1. **Interaktionsereignis** — beobachtete Handlung eines Lernenden, z. B. `inspect_source`.
2. **Erkenntnis-Evidenz** — eine durch diese Handlung belegte Erkenntnis, mit stabiler ID und Bezug zum Content.
3. **Interaktionsanforderung** — eine für den Content konfigurierte, erforderliche Aktion bzw. ein nachweisbares Ergebnis.
4. **Content-Ergebnis** — Erfüllungsgrad der erforderlichen Interaktionsanforderungen für einen Content.
5. **Missionsergebnis** — aggregierter Fortschritt über alle für diese Mission konfigurierten Contents.
6. **Kompetenz-Evidenz** — Zuordnung eines nachgewiesenen Ergebnisses zu einem definierten Kompetenzbereich. Ein einzelner Erfolg ist Evidenz, aber kein automatischer Beweis dauerhafter Kompetenz.

## Vorgeschlagenes logisches Modell

### A. `learning_result_events` — append-only Evidenz

Ein kanonischer, unveränderlicher Nachweis, dass eine Interaktion oder Erkenntnis stattgefunden hat.

| Feld | Zweck |
|---|---|
| `id` UUID | Primärschlüssel |
| `user_id` UUID | Lernender |
| `class_instance_id` UUID | Klassen-/Lernkontext; erforderlich für Scoping |
| `scenario_id` UUID | Szenario-Kontext |
| `content_item_id` UUID | Auslösender Content |
| `interaction_type` TEXT | Ausgeführte Aktion |
| `event_kind` TEXT | z. B. `interaction_performed`, `discovery_confirmed`, `requirement_satisfied` |
| `evidence_key` TEXT | Stabile, redaktionell definierte Kennung für die Erkenntnis/Anforderung |
| `outcome` TEXT | `success`, `partial`, `not_yet`, `not_assessable` |
| `metadata` JSONB | Begründung, Feedback-Referenz und strukturierte Details; keine unnötigen personenbezogenen Freitexte |
| `occurred_at` TIMESTAMPTZ | Zeitpunkt |

Ereignisse werden nicht überschrieben. Korrekturen oder erneute Versuche erzeugen neue Ereignisse. Die Ergebnisberechnung entscheidet anhand einer dokumentierten Regel, welche Evidenz für den aktuellen Stand zählt. Wiederholte Klicks dürfen den Prozentwert nicht künstlich erhöhen.

### B. Anforderungen und Gewichtung — zunächst aus Content-Konfiguration ableiten

Die bestehenden `content_items.extra.learningTask.interactions` können zunächst die erforderlichen Interaktionen und ihre Feedback-Konfiguration liefern. Für jede Anforderung braucht es eine stabile ID und eine explizite Kennzeichnung, ob sie erforderlich ist. Standardaktionen wie Reagieren/Kommentieren sind nicht automatisch Lernanforderungen.

Für die erste Version gilt:
- Alle erforderlichen Lerninteraktionen sind gleich gewichtet.
- Eine Aktion gilt erst als erfüllt, wenn ein gültiges Erfolgsergebnis/Evidenzkriterium vorliegt; ein Klick allein zählt nicht.
- Eine optionale Interaktion erhöht den Erfüllungsgrad nicht.
- Wenn keine erforderlichen Lerninteraktionen konfiguriert sind, ist der Content-Prozentwert **nicht anwendbar** (`null`), nicht 0 % oder 100 %.
- `not_assessable` wird als nicht bewertbar ausgewiesen und nicht stillschweigend als Erfolg oder Misserfolg gewertet.

### C. Content-Ergebnis — berechnet, nicht separat gepflegt

Logische Ausgabe pro Lernendem, Klasseninstanz und Content:

- `required_count`
- `satisfied_count`
- `completion_ratio` (0–1, UI zeigt Prozent)
- `status`: `not_started`, `in_progress`, `partially_completed`, `completed`, `not_assessable`
- `last_activity_at`

Formel für v1: `100 × erfüllte erforderliche Anforderungen / Anzahl aller erforderlichen Anforderungen`.

Beispiel: 1 von 2 Anforderungen erfüllt = 50 %. 2 von 2 = 100 %. Keine erforderlichen Anforderungen = `null`.

### D. Missionsergebnis — Aggregation der zugeordneten Contents

Logische Ausgabe pro Lernendem, Klasseninstanz und Mission:

- `content_count`, `assessed_content_count`
- `completion_ratio`
- `status`: `not_started`, `in_progress`, `partially_completed`, `completed`, `not_assessable`
- Liste der Content-Ergebnisse als nachvollziehbare Aufschlüsselung.

Für v1 werden die bewertbaren Missions-Contents gleich gewichtet: Mittelwert ihrer Content-Erfüllungsgrade. Contents ohne Lernanforderungen werden nicht als 0 % gewertet, sondern als nicht anwendbar ausgeschlossen. Eine Mission ohne bewertbare Contents hat `null` statt eines erfundenen Prozentwerts. Ob ein Content zu einer Mission gehört, muss explizit und deterministisch festgelegt sein; nicht alle Contents eines Szenarios dürfen automatisch in jede Mission einfließen.

### F. Diskrete In-Feed-Bewertung — implementierter Teilumfang

Für natürlich ausgeführte Feed-Aktionen kann die Redaktion eine gemeinsame Bewertungsregel unter `content_items.extra.learningTask.assessment` speichern:

```json
{
  "assessedActions": ["report", "ignore", "share"],
  "acceptableActions": ["report", "ignore"],
  "evidenceKey": "in_feed_decision"
}
```

- `assessedActions` definiert, welche ausgewählten Interaktionen tatsächlich bewertet werden.
- `acceptableActions` ist eine Teilmenge davon. Mehrere akzeptable Alternativen erfüllen dieselbe Anforderung.
- Aktionen außerhalb des Bewertungsumfangs erzeugen keinen bewerteten Lernnachweis.
- Das Player-Feedback bleibt eine redaktionelle Rückmeldung und ist für sich allein kein Erfolgskriterium.
- Der Player persistiert die Interaktion zuerst in `user_interactions` und ruft danach `record_discrete_action_assessment` auf.
- Die SECURITY DEFINER RPC prüft aktive Schüler-Mitgliedschaft, aktive Klassen-Szenario-Zuordnung, Live-Content, konfigurierte Aktion und das gespeicherte Interaktionsereignis. Sie leitet `success` oder `not_yet` ausschließlich aus der gespeicherten Regel ab.
- Die Legacy-Aktion `fact_check` wird bei der Player-Aktion `inspect_context` als Alias berücksichtigt.
- Wiederholte Versuche können mehrere Rohereignisse erzeugen. Die Teacher-Evidence-Projektion fasst dieselbe Anforderung je Lernendem, Klasseninstanz, Content und `evidence_key` zusammen; ein erfolgreicher Versuch erfüllt sie.

Diese Bewertung erfasst die Angemessenheit einer konkret ausgeführten Social-App-Handlung. Sie ist kein automatischer Kompetenzlevel und ersetzt keine übergreifende Kompetenz-Evidenz über mehrere Situationen.

### E. Kompetenz-Evidenz

Erfolgreiche Anforderungen können optional auf bestehende `competencies` abgebildet werden. Die Ergebnis-Engine speichert den konkreten Nachweis und seine Quelle. Ein Kompetenzniveau wird nicht allein aus dem Missionsprozentsatz abgeleitet. Kompetenztrends sollten mehrere Evidenzen über Zeit und unterschiedliche Aufgaben berücksichtigen.

## Berechnungsregeln und Datenschutz

- Jede Abfrage und Aggregation muss auf `class_instance_id` und den autorisierten Lernenden-/Lehrkraftkontext begrenzt sein.
- Rohereignisse sind die Audit-Grundlage; Prozentwerte sind reproduzierbare Projektionen.
- Idempotenz: derselbe Nachweis darf bei Retries nicht doppelt zählen. Geeignet ist ein eindeutiger Schlüssel aus Lernendem, Klasseninstanz, Content, Requirement-Key und Attempt/Event-ID – die genaue Regel muss bei der Implementierung festgelegt werden.
- Bewertungsregeln werden versioniert (`scoring_version`), damit spätere Regeländerungen historische Reports nicht unbemerkt verändern.
- Insights und Einzelreports lesen dieselben berechneten Resultate. Sie implementieren keine eigene Prozentrechnung.
- Lehrkräfte sehen nur die Klasseninstanzen, für die sie berechtigt sind; Schülerdaten dürfen nicht klassenübergreifend aggregiert offengelegt werden.

## Noch zu entscheiden für die vollständige Ergebnis-Engine

1. **Missions-Content-Zuordnung:** Gibt es bereits eine verlässliche Tabelle/Relation für Mission ↔ Content? Falls nicht, eine explizite Zuordnung ergänzen statt über Szenario-ID zu raten.
2. **Erfolgsnachweis je Interaktion:** Welche Aktionen können deterministisch bewertet werden, und welche benötigen eine Schülerantwort oder eine redaktionell definierte Lösung? Feedback-Text allein ist kein Erfolgsnachweis.
3. **Versuche und Wiederholungen:** Für v1 sollte pro Anforderung der beste gültige Nachweis zählen, nicht die Summe aller Klicks; Wiederholungs-/Retry-Regeln müssen klar definiert werden.
4. **Rollout bestehender Daten:** Alte Interaktionen ohne Ergebnis-Evidenz dürfen nicht rückwirkend als erfolgreich interpretiert werden.
5. **Persistenzform:** Erst nach Prüfung der aktuellen Schema-/RLS-/Trigger-Konventionen entscheiden, ob Resultate als Tabelle + SQL-Funktionen oder als Views/RPCs bereitgestellt werden.

## Umsetzungsreihenfolge nach Freigabe

1. Mission ↔ Content-Zuordnung und Erfolgsnachweis verbindlich klären.
2. Migration(en), RLS und idempotente Event-Erfassung.
3. Zentrale SQL-/Engine-Funktionen für Content- und Missionsergebnis.
4. Tests für 0/1/2 Anforderungen, doppelte Events, Wiederholungen, nicht bewertbare Inhalte und Klassen-Isolation.
5. Insights und Einzelreportings an die zentrale Ausgabe anbinden.

Dieses Dokument beschreibt den Datenvertrag und den aktuell implementierten Teilumfang. Es ist keine vollständige Spezifikation der noch offenen Content-, Missions- und Kompetenzprojektionen.
