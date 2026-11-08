# DR1FT Performance-Audit: Teacher und Player

**Stand:** 8. November 2026  
**Repository:** `grospitz-wreck-it/dr1ft`  
**Geprüfter Commit:** `2ef249247cd10eaa4de38ad1c3dd54cecedea44a` (`main`)  
**Vorgehen:** Code-Review und Auswertung der zuvor erhobenen Supabase-Statistiken. Keine Änderungen an Datenbank oder Anwendung im Rahmen des Audits.

## Einordnung und Grenzen

Die vorherige Messung bezog sich teilweise auf einen älteren Stand. Seitdem wurde der Player-Feed wiederhergestellt und die Feed-Seite bereits teilweise parallelisiert. Deshalb sind ältere Aussagen über einen fehlenden Teacher-Module-Feed und rund 19 vollständig serielle Abfragen nicht mehr unverändert auf den aktuellen Stand übertragbar.

Die folgenden Netzwerkzeiten sind Schätzungen aus Roundtrips, keine gemessenen Browser- oder Vercel-Laufzeiten. Die früher ausgewerteten Supabase-Statistiken zeigten bei der damaligen Datenmenge überwiegend kurze Abfragen (ca. 2–48 ms) mit einzelnen Spitzen bis ca. 340 ms. Datenbasis damals: 143 Inhalte (98 live), 65 Interaktionen und 5 Klassen. Diese Werte sind Momentaufnahmen und sollten vor größeren Skalierungsentscheidungen neu erhoben werden.

## Zusammenfassung

- Der größte kurzfristige Hebel liegt weiterhin im Player bei wiederholtem clientseitigem Polling zusätzlich zu Realtime.
- Die Player-Feed-Seite auf dem geprüften Stand enthält den Teacher-Module-Feed wieder und bündelt bereits mehrere unabhängige Abfragen in `Promise.all`.
- Im Feed verbleiben serielle Abfrageblöcke, die voneinander unabhängig sein könnten, sowie redundante Creator-Abfragen und breite Selects.
- Teacher-Dashboard und Klassenseite wurden durch Commit `4038869` bereits teilweise parallelisiert. Die Teacher-Navigation führt weiterhin eigene Profil-/Klassenabfragen aus.
- RLS- und Index-Hinweise aus Supabase sind relevant für Wachstum, aber sicherheits- bzw. migrationssensitiv. Sie werden nicht ohne separate Freigabe und Rechte-Tests geändert.

## Teacher

Bereits umgesetzt:
- Commit `4038869` parallelisiert unabhängige Dashboard- und Klassenseiten-Abfragen.
- Navigation lädt den Account-Kontext nicht mehr bei jedem Pfadwechsel vollständig neu.

Weiter prüfen:
- Teacher-Navigation lädt weiterhin Profil-/Klassenkontext clientseitig und kann Daten doppelt zu den Server-Seiten abrufen.
- Eingeklappte Panels erhalten ihre Daten weiterhin über Props und laden diese somit bereits beim Rendern.
- Szenario-Abfragen sollten auf benötigte Spalten und sinnvolle Mengenbegrenzungen geprüft werden.
- `router.refresh()` kann größere Bereiche neu rendern; gezieltere Aktualisierung wäre gegebenenfalls möglich.
- Auth-Prüfungen in Middleware und Seite sind getrennte Sicherheitsgrenzen. Sie dürfen nicht durch unsichere Session-Abkürzungen ersetzt werden.

## Player

### Feed-Serverseite

Auf `main` (Commit `2ef2492`) sind bereits parallelisiert:
- Teacher-Modul- und Szenario-Zuordnungen laufen parallel.
- Modul-Metadaten und Modul-Beiträge laufen parallel und überlappen mit den unabhängigen Feed-Abfragen.
- Szenarien, Missionsliste, Kompetenzfortschritt, Kompetenzen, Profil, Ambient-Katalog, Präferenzen, Interaktionen und Content-Pool werden gemeinsam abgefragt.
- Likes, NPC-Likes, Kommentare und Creator-Metadaten werden in einem weiteren Parallelblock geladen.

Verbleibende Ansatzpunkte:
- `user_mission_progress` wird nach dem Missionslisten-Block separat geladen.
- Creator werden in `content_items` eingebettet und danach anhand der Creator-IDs nochmals separat abgefragt. Prüfen, ob die eingebetteten Daten alle benötigten Felder abdecken und die zweite Abfrage entfallen kann.
- `user_competency_progress` verwendet derzeit `select("*")`; auf tatsächlich verwendete Felder begrenzen.
- Der Live-Content-Pool ist nicht begrenzt. Bei wachsendem Bestand kann Payload und Serverarbeit linear anwachsen. Eine Begrenzung muss Feed-Mix, Szenario-Priorisierung und Vollständigkeit berücksichtigen.
- Der Lernschritt-Pfad (Designs → Steps → Links → Views) ist abhängig und bleibt deshalb teilweise sequenziell. Innerhalb der Abhängigkeiten prüfen, ob unabhängige Reads parallelisiert werden können.
- Keine Umstellung auf eine neue Feed-RPC ohne separaten Rechte- und Verhaltenstest.

### Client-Polling

Im Player-Shell-Code bestehen weiterhin mehrere wiederkehrende Abfragen:
- Klassenaktivität: alle 5 Sekunden; zusätzlich Realtime auf `content_items` und `user_interactions`.
- Ungelesene Nachrichten: alle 15 Sekunden; inklusive Auth-, Klassen-, Delivery-/Read- und Direktnachrichtenabfragen.
- Aktivitätszeit: alle 15 Sekunden; Aktivitätszeit wird über eine RPC persistiert.
- Die Kommentar-Aktualisierung im Feed-Client muss separat anhand des aktuellen vollständigen Effekts bewertet werden.

Die Polls sollten nicht pauschal entfernt werden: Realtime-Verbindungsabbrüche und Zustandsänderungen brauchen einen verlässlichen Fallback. Sicherer erster Schritt ist, Polling bei verborgenem Tab auszusetzen und Realtime-Verfügbarkeit bzw. Fehlerzustand für den Fallback zu nutzen. Für jede Polling-Schleife muss sichergestellt werden, dass keine überlappenden Requests entstehen.

### Klassen-ID und Auth

`get_current_class_instance_id` wird an mehreren Stellen unabhängig aufgerufen (Feed, Aktivitätszeit, Unread-Prüfung, Live-Aktivität). Eine einmalige Übergabe kann Roundtrips sparen, ist aber nur dann sinnvoll, wenn Auth-Wechsel, Klassenwechsel und Navigation korrekt behandelt werden. Die Middleware-Authentifizierung bleibt bestehen; `getSession()` ist kein Ersatz für serverseitige Auth-Prüfung.

## Datenbank-Hinweise aus der früheren Supabase-Auswertung

| Kategorie | Anzahl | Einordnung |
|---|---:|---|
| `multiple_permissive_policies` | 183 | Mehrere permissive RLS-Policies für dieselbe Tabelle/Aktion |
| `unindexed_foreign_keys` | 77 | Fremdschlüssel ohne passenden Index |
| `auth_rls_initplan` | 47 | `auth.uid()`-Aufrufe ohne InitPlan-optimierten Wrapper |
| `unused_index` | 95 | Auf der kleinen Datenbasis bislang nicht genutzte Indizes |

Diese Zählungen sind zeitgebundene Advisor-Ergebnisse, keine Aussage, dass alle Einträge gleichermaßen problematisch sind. Änderungen an Policies, Indizes oder RPCs erfolgen nur separat, nach aktueller Prüfung und mit expliziten Tests für Schüler-, Lehrer- und Admin-Rechte.

## Maßnahmenplan

| Prio | Bereich | Maßnahme | Risiko | Status |
|---|---|---|---|---|
| 1 | Player | Polling nur bei sichtbarem Tab; Fallback bei nicht verbundenem Realtime bzw. Fehlern; überlappende Requests verhindern | niedrig–mittel | als erster Schritt vorgesehen |
| 2 | Player | Klassen-ID pro geeigneter Shell-/Seiten-Lebensdauer teilen statt mehrfach abzufragen | mittel | separat prüfen |
| 3 | Player-Feed | Unabhängige Abfragen weiter bündeln, insbesondere Missionsfortschritt mit dem ersten Parallelblock | niedrig–mittel | vorgesehen |
| 4 | Player-Feed | Creator-Doppelabfrage und `select("*")` beseitigen, nachdem Feldbedarf geprüft wurde | niedrig | vorgesehen |
| 5 | Teacher | Navigation-/Serverdatenübergabe prüfen; unnötige doppelte Requests reduzieren | niedrig–mittel | später |
| 6 | Teacher | Eingeklappte Panels ggf. lazy laden/streamen | mittel (UX) | später |
| 7 | Alle | Temporäre Performance-Marker (p50/p95) ergänzen, ohne personenbezogene Daten zu loggen | niedrig | empfohlen |
| 8 | Datenbank | RLS-Policies und fehlende FK-Indizes priorisiert prüfen | mittel–hoch | nur nach Freigabe |
| 9 | Architektur | Feed-RPC, gebündelte Capability-RPC und Lehrermodul-Zuordnung vereinheitlichen | hoch | zurückstellen |

## Empfohlene Umsetzung

1. Zuerst Polling-Verhalten im Player robust reduzieren: nur im sichtbaren Tab pollen, Realtime als Primärweg nutzen und bei Verbindungsproblemen einen begrenzten Fallback behalten.
2. Danach wiederholte Klassen-ID-Abfragen adressieren, ohne Auth- oder Klassenwechsel zu übersehen.
3. Anschließend Feed-Abfragen in kleinen, überprüfbaren Änderungen bündeln und unnötige Felder/Creator-Abfragen entfernen.
4. Nach jedem Schritt Build, Typecheck und gezielte Funktionsprüfung durchführen; Feed-Mix, Kommentare, Likes, Teacher-Module, Nachrichtenstatus und Aktivitätszeiterfassung müssen unverändert funktionieren.
5. Nach den Änderungen erneut messen. Erst dann Datenbank- oder Architekturmaßnahmen entscheiden.

**Sicherheitsgrenze:** Keine Änderungen an Supabase-Schema, RLS-Policies, Funktionen, Auth-Verhalten oder produktiven Daten ohne separate Freigabe.
