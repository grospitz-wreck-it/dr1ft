# DR1FT — Projekt-Grundgerüst

Medienkompetenz-**Lernplattform für Schulen** (kein offener Consumer-App-Store-Vertrieb).
Feed-artige Web-App + Redaktions-Backend + event-basierte Engines.
Siehe `/docs` (Master Context) für die Grundprinzipien.

**Zugang:** Lehrkraft legt eine Klasse an (`classes`), bekommt einen
`access_code`, Schüler:innen treten darüber bei (`class_memberships`).
Kein öffentlicher Self-Signup. Lehrkraft steuert außerdem, welche
Szenarien für ihre Klasse sichtbar sind (`class_scenario_assignments`) —
ohne diese Freigabe wird per Default **nichts** ausgespielt.

**Hosting:** Supabase EU-Region (Frankfurt) für Schuldaten.

**Plattform:** Web-App (Next.js, PWA-fähig) statt native Mobile-App —
Schulgeräte (Chromebooks, verwaltete iPads) erlauben oft keine freie
App-Installation, ein Browser-Zugriff funktioniert überall.

## Struktur

```
apps/player/        Next.js — der Feed, das eigentliche Spiel (Schüler:innen)
apps/teacher bzw. apps/editorial/          Next.js — Lehrer-Dashboard + Redaktions-Backend
packages/shared-types/  TypeScript-Typen, von allen Teilen genutzt
packages/engine-core/   Feed-, Mission-, Analytics-, NPC-, Narrative-Engine (reine Funktionen, testbar)
supabase/migrations/    Datenbank-Schema
supabase/functions/     Edge Functions (Lehrer-Dashboard-Aggregate, Passwort-Reset, KI-Content)
supabase/seed/           Beispiel-Content zum Testen
```

## Nächste Schritte (empfohlene Reihenfolge)

1. **Supabase-Projekt anlegen** auf supabase.com (EU-Region Frankfurt für Schuldaten).
   Migrationen einspielen: `supabase db push` (Anleitung: supabase.com/docs/guides/cli).
   Danach Seed-Dateien aus `supabase/seed/` ausführen.
2. **Beide Apps installieren:** `npm install` in `apps/player` und `apps/teacher bzw. apps/editorial`
   (jeweils eigene `package.json` mit den nötigen Dependencies).
3. In den Supabase-Auth-Einstellungen **"Confirm email" deaktivieren**
   (siehe Abschnitt "Login / Auth-Strategie" unten — notwendig wegen
   der synthetischen Schüler-E-Mails).
4. `ANTHROPIC_API_KEY` und `SUPABASE_SERVICE_ROLE_KEY` als Server-Secrets
   setzen (nie `NEXT_PUBLIC_*`) — werden für Ambient-Content-Generierung
   bzw. Passwort-Reset gebraucht.
4. Danach: Feed-UI bauen, die `selectNextFeedItems()` aus der Feed-Engine nutzt.

## Lehrer-Dashboard

Liegt in `apps/teacher/app/*` — bewusst in derselben Next.js-App wie
die Redaktion, getrennt über Routen/Rollen (`/teacher/*` vs. `/*`),
nicht über eine zweite App.

- `class_competency_overview`, `class_mission_overview`, `class_activity_overview`
  (siehe `0003_teacher_dashboard_views.sql`) liefern **aggregierte** Werte pro
  Klasse — bewusst keine Einzelauswertung einzelner Schüler:innen-Fehler.
- Der Zugriff läuft über die Edge Function `teacher-dashboard`, die serverseitig
  prüft, ob der Aufrufer tatsächlich Lehrkraft dieser Klasse ist
  (`is_teacher_of_class()`), da Postgres-Views selbst kein RLS tragen können.
- Auth läuft jetzt über `@supabase/ssr` (`lib/supabaseServerClient.ts` + `middleware.ts`
  mit Session-Refresh). Vor dem ersten Start: `npm install` in `apps/teacher bzw. apps/editorial`,
  Supabase-Auth (z.B. Magic Link oder Passwort) für Lehrkräfte-Accounts einrichten.
- Server Actions fertig: `createClass` (generiert `access_code`, macht Ersteller
  automatisch zur Lehrkraft) und `toggleScenarioAssignment` (mit serverseitiger
  `is_teacher_of_class()`-Prüfung) in `app/teacher/classes/actions.ts`.
- Offen: Schüler-Beitritt über `access_code` (eigene Action `joinClassByCode`),
  `/*`-Bereich für die Redaktion analog zum Lehrer-Bereich aufbauen.

## Mission Engine

Bewusste Architektur-Entscheidung: Die **Trigger-Auswertung läuft in
Postgres**, nicht in separatem App-Code (siehe `0004_mission_engine.sql`).
Begründung: Die Bedingung braucht ohnehin einen DB-Query (Interaktionen
zählen); ein Roundtrip über eine Edge Function würde nur Latenz und eine
zweite Quelle der Wahrheit für dieselbe Logik bringen.

Ablauf:

1. App ruft `recordInteraction()` (`packages/engine-core`) auf, wenn der
   Nutzer z.B. einen Post ansieht. Das emittiert sofort ein lokales
   `PostViewed`-Event UND schreibt eine Zeile in `user_interactions`.
2. Ein DB-Trigger (`evaluate_missions_after_interaction`) prüft danach
   alle `live`-Missionen des betroffenen Szenarios. Ist eine
   `trigger_condition` erfüllt (z.B. `{"event":"PostViewed","count":3,
   "technique_filter":["false_authority"]}`), wird
   `user_mission_progress` aktualisiert und ein Eintrag in `domain_events`
   geschrieben.
3. `startRealtimeEventBridge()` (`packages/engine-core`) abonniert
   `domain_events` per Supabase Realtime und speist `MissionCompleted`
   in den lokalen `eventBus` ein — Analytics-, NPC-, Narrative-Engine
   (noch zu bauen) können darauf reagieren, ohne SQL zu kennen.

Offen: `trigger_condition` unterstützt aktuell nur `PostViewed` und
`CommentCreated` als Basis-Events (siehe `mission_event_to_interaction_type()`).
Erweiterung um weitere Event-Typen ist eine reine SQL-Änderung.

## Analytics Engine

Reagiert bewusst auf **Mission-Abschluss**, nicht auf jede einzelne
Interaktion — sonst würde bloßes Scrollen fälschlich als Kompetenzgewinn
zählen (siehe 03_EDUCATIONAL_PHILOSOPHY: "Evidenz über Zeit, nicht Punkte
für Einzelaktionen").

- Missionen haben jetzt `target_competencies` (siehe `0005_analytics_engine.sql`).
- Ein DB-Trigger auf `user_mission_progress` schreibt bei Abschluss
  Evidenz in `user_competency_progress`, berechnet das neue Level
  (`compute_competency_level()`) und meldet `CompetencyUpdated` über
  `domain_events` — dieselbe Brücke wie bei der Mission Engine.
- `packages/engine-core/src/analyticsEngine.ts` spiegelt dieselbe
  Level-Formel in TypeScript — **nicht** als zweite Laufzeit-Quelle,
  sondern für Vorschau im Admin-Dashboard und Unit-Tests ohne DB.
  Bei Formel-Änderungen: SQL ist die live wirkende Quelle, TS muss
  synchron gehalten werden.
- Das bereits bestehende Lehrer-Dashboard (`class_competency_overview`)
  füllt sich damit jetzt automatisch — keine weiteren Änderungen nötig.

## NPC Engine

Bewusst **kein** Live-Freitext-Chat mit einer KI-Persona. Stattdessen ein
verzweigtes Dialogsystem: jede NPC-Nachricht ist ein vorautorierter,
redaktionell geprüfter `content_item` (type `dm_message`/`comment`) mit
Antwortoptionen in `extra.replyOptions` (siehe `0006_npc_engine.sql`,
Typ `ReplyOption` in shared-types). Der Spieler wählt aus vorgegebenen
Antworten, die Engine navigiert im Baum.

Warum: erfüllt "Human-in-the-Loop" aus 08_AI_FIRST_PHILOSOPHY (kritischer
Bildungsinhalt bleibt redaktionell geprüft, bevor er live geht) und
vermeidet unvorhersehbare KI-Antworten gegenüber Minderjährigen.

- `getReplyOptions()`, `resolveNextMessage()` — reine, testbare Logik.
- `selectNpcReply()` — Adapter: lädt Zielnachricht, speichert Gesprächsstand
  in `user_npc_conversations`, schreibt eine `user_interactions`-Zeile
  (zählt dadurch automatisch für Mission-Trigger mit, z.B. "hat 2x einer
  Anwerbung widersprochen"), emittiert `NpcReplySelected`.
- KI darf laut 08_AI_FIRST_PHILOSOPHY beim **Erstellen** der Dialogbäume
  assistieren (Vorschläge für Verzweigungen) — die Freigabe bleibt aber
  beim bestehenden Redaktions-Workflow (draft → in_review → approved → live).

## Narrative Engine

Verknüpft Mission-, NPC- und Feed-Engine zeitlich über **Story-Arcs**:
eine geordnete Folge von Missionen innerhalb eines Szenarios
(`story_arcs`, `story_arc_steps`, siehe `0007_narrative_engine.sql`).

Wichtig: Missionen **ohne** Arc-Zuordnung bleiben wie bisher frei
verfügbar — Narrative-Gating ist optional, kein Zwang für jede Mission.

Ablauf:

1. Sobald ein Szenario einer Klasse zugewiesen wird (oder ein:e
   Schüler:in später beitritt), startet jede `live`-Arc dieses Szenarios
   automatisch für alle betroffenen Schüler:innen (`start_arc_for_user`,
   per Trigger auf `class_scenario_assignments` bzw. `class_memberships`).
2. Nur der jeweils erste Schritt wird sofort freigeschaltet
   (`user_unlocked_missions`), der Rest bleibt gesperrt.
3. Die bestehende Mission-Trigger-Auswertung (`evaluate_missions_after_interaction`,
   jetzt erweitert) überspringt Arc-gebundene Missionen, solange sie nicht
   freigeschaltet sind.
4. Nach Abschluss einer Arc-Mission (`advance_story_arc_after_mission`)
   wird automatisch der nächste Schritt freigeschaltet und ein
   `MissionStarted`-Event über `domain_events` gemeldet — App-seitig
   z.B. nutzbar für eine "Neue Mission freigeschaltet"-Benachrichtigung.
5. `packages/engine-core/src/narrativeEngine.ts` — reine Vorschau-Logik
   fürs Admin-Dashboard (Arc-Reihenfolge validieren, "was schaltet sich
   als Nächstes frei" simulieren), keine zweite Laufzeit-Quelle.

Damit sind alle sechs Engines aus 09_ARCHITECTURE_PHILOSOPHY als
Grundgerüst vorhanden: Feed, Mission, Analytics, NPC, Narrative, plus
der Event-Bus, der sie verbindet.

## Scenario Editor (Redaktion)

Liegt in `apps/editorial/app/scenarios/*`. Erste Stufe: Szenario-
und Content-Item-CRUD mit Freigabe-Workflow.

- `createScenario`, `toggleScenarioActive` — Szenarien anlegen/aktivieren.
  Neue Szenarien starten inaktiv, damit sie erst geprüft werden, bevor
  Lehrkräfte sie ihrer Klasse zuweisen können.
- `createContentItem` — legt immer als `draft` an, nie direkt live.
- `updateContentItemStatus` — erzwingt serverseitig erlaubte Übergänge
  (`ALLOWED_TRANSITIONS`): kein Sprung von `draft` direkt zu `live`
  ohne `in_review` → `approved` dazwischen.
- **Wichtige Nachrüstung in `0008_editorial_rls.sql`:** `scenarios`,
  `creators`, `missions`, `story_arcs`, `story_arc_steps`, `competencies`
  hatten bisher **kein RLS aktiviert** — das ist jetzt geschlossen
  (Lesen: alle eingeloggten Nutzer; Schreiben: nur `platform_staff`).
  Außerdem fehlte eine Schreib-Policy für `class_scenario_assignments`,
  ohne die `toggleScenarioAssignment()` aus dem Lehrer-Dashboard an RLS
  gescheitert wäre.
- Um selbst als Redakteur:in zu testen: eigene `user_id` manuell in
  `platform_staff` eintragen (`insert into platform_staff (user_id, role)
  values ('<AUTH_ID>', 'editor');`) — ein UI dafür gibt es noch nicht.

Noch offen: NPC-Dialog-Builder (visuelle Verzweigung statt Hand-JSON in
`extra.replyOptions`), Missions-/Arc-Builder mit UI für Trigger-Bedingungen.

## Spieler-Feed-App (das eigentliche Produkt)

Liegt in `apps/player` — die App, die Schüler:innen tatsächlich sehen.
Bisher fehlte sie komplett (nur Lehrer-/Redaktions-Dashboards existierten).

**Design-Entscheidung:** Content-Karten sind bewusst neutral/hell
gehalten (wirken wie "echte" Posts), die App-Chrome drumherum ist ruhig
und dunkel ("Analyse-Modus"). Das Signature-Element ist die
**Reflexions-Ansicht** (`ReflectionOverlay.tsx`): erkannte
Manipulationstechniken werden wie mit einem Textmarker annotiert statt
mit einem Erfolgs-Badge gefeiert — passend zum eigentlichen Lernziel.
Tokens: Tinten-Navy (`#14182B`) für Chrome, Off-White (`#EFEFEA`) für
Karten, Marker-Gelb (`#FFC857`) ausschließlich für Annotationen.
Space Grotesk (Display) + Inter (Fließtext) + JetBrains Mono (Tags).

- `app/feed/page.tsx` — Server Component: lädt Klassen-Freigabe,
  Kompetenz-Fortschritt, zuletzt gesehene Inhalte, ruft
  `selectNextFeedItems()` aus der Feed Engine auf.
- `app/feed/FeedClient.tsx` — Scroll-Erkennung (IntersectionObserver),
  ruft `recordInteraction()` bei jedem gesehenen Post, startet die
  Realtime-Brücke, öffnet `ReflectionOverlay` bei `MissionCompleted`.
- `components/NpcDialog.tsx` — nutzt die bestehende NPC Engine
  (`getReplyOptions`, `selectNpcReply`) für den Dialogbaum.

Noch offen: Login-/Onboarding-Screens, `PostCard` unterstützt bisher
nur `type: post` (Kommentare/DM-Einstiegspunkte im Feed selbst fehlen
noch), keine Bild-/Video-Darstellung (`mediaUrl` wird geladen, aber
nicht gerendert).

### NPC-Dialog-Builder

`apps/editorial/app/npc-dialogs/*` — visuelle Bearbeitung statt
Hand-JSON in `extra.replyOptions`.

- Nachrichten werden zunächst unverknüpft angelegt (`createNpcMessage`),
  dann bei der gewünschten Elternnachricht als Antwortoption verlinkt
  (`ReplyOptionsEditor.tsx`: Dropdown zeigt alle Nachrichten desselben
  NPCs, kein Freitext-JSON mehr nötig).
- Die Baumansicht (`[creatorId]/page.tsx`) rendert rekursiv ab allen
  "Wurzel"-Nachrichten (die, auf die keine andere Nachricht verweist)
  und erkennt Zyklen (falls versehentlich ein Kreis verlinkt wird).
- Jeder Knoten hat direkt den bestehenden `ContentStatusControl` —
  Freigabe-Workflow funktioniert identisch zu normalen Content-Items.
- Offen: NPC-Creator selbst anlegen geht noch nicht per UI, nur direkt
  in der `creators`-Tabelle.

### Missions-/Arc-Builder

`apps/editorial/app/missions/[scenarioId]/*` — Trigger-Bedingungen
werden über strukturierte Formularfelder gebaut (Event-Auswahl, Zähler,
kommagetrennter Technik-Filter), nicht als Hand-JSON.

- `createMission` — setzt `trigger_condition` aus den Formularfeldern
  zusammen, Ziel-Kompetenzen per Checkbox, Reflexion per Dropdown aus
  allen `reflection_prompt`-Items des Szenarios.
- Story-Arcs: Missionen werden per Dropdown "ans Ende angehängt"
  (`addArcStep` berechnet `order_index` automatisch), Umsortieren über
  einfache ↑/↓-Buttons (`swapArcSteps` statt Drag&Drop-Bibliothek).
- Missionen/Arcs haben bewusst nur einen einfachen draft/live-Schalter,
  keinen vollen Freigabe-Workflow wie Content-Items — die eigentliche
  redaktionelle Prüfung passiert am referenzierten Content selbst.

### Staff-Verwaltung

`apps/editorial/app/staff/*` — wer ist Redakteur:in, wer
`platform_admin`. Nur für `platform_admin` sichtbar/bearbeitbar
(`0009_staff_admin_policy.sql`).

**Erstes Staff-Mitglied muss einmalig per SQL eingetragen werden**
(Henne-Ei-Problem: ohne platform_admin kann niemand die Seite nutzen):
```sql
insert into platform_staff (user_id, role)
values ('<DEINE_AUTH_ID>', 'platform_admin');
```
Danach funktioniert die Verwaltung weiterer Mitglieder über die UI.
Hinzufügen läuft aktuell über die Supabase-Auth-User-ID, nicht per
E-Mail-Suche (dafür bräuchte es den Service-Role-Key, bewusst nicht
im Client-Code).

## Login / Auth-Strategie

Hierarchie: **Schule → Jahrgang → Klasse → Schüler:in** (Jahrgang als
`grade_level`-Spalte an `classes`, siehe `0010_grade_and_student_join.sql`
— kein eigener Tabellen-Join für den Normalfall nötig, aber
Jahrgangs-Auswertungen per `group by school_id, grade_level` möglich).

**Lehrkräfte/Redaktion** (`apps/teacher bzw. apps/editorial`): normale E-Mail+Passwort-Anmeldung
(`/login`, `/signup`) — unproblematisch, da Erwachsene.

**Schüler:innen** (`apps/player`): bewusst **kein E-Mail-Feld**.
`/join`: Zugangscode der Klasse + Anzeigename (kein Klarname nötig) +
selbstgewählter Nutzername + Passwort. Daraus wird eine synthetische
E-Mail (`nutzername.zugangscode@dr1ft.local`) gebaut, die nie verschickt
wird, aber Supabase Auth intern als eindeutigen Login-Schlüssel dient —
dadurch funktioniert der normale, robuste Passwort-Login (inkl.
geräteübergreifend), ohne dass eine echte Mail-Adresse gesammelt werden
muss. `join_class_as_student()` (DB-Funktion) verknüpft danach die neue
Auth-Identität mit Klasse + Profil.

**Wichtige Supabase-Auth-Einstellung:** "Confirm email" muss für dieses
Projekt deaktiviert sein (Dashboard → Authentication → Providers → Email),
da die synthetischen Schüler-Adressen keine Bestätigungsmail empfangen
können. Für Lehrkräfte-Signups kann sie an bleiben oder separat über
eine zweite Supabase-Auth-Konfiguration laufen, falls später getrennte
Projekte gewünscht sind.

**Route-Schutz:** `middleware.ts` in beiden Apps leitet nicht
eingeloggte Nutzer zu `/login` um (`apps/player`: schützt `/feed/*`;
`apps/teacher bzw. apps/editorial`: schützt `/teacher/*` und `/*`).

Offen: Jahrgangs-Auswertung im Lehrer-Dashboard (bisher nur pro Klasse).

## Passwort-Reset für Schüler:innen

Da Schüler-Accounts keine echte E-Mail haben, funktioniert der übliche
"Link per Mail"-Reset nicht. Stattdessen:

- Lehrkraft klickt auf der Klassenseite bei einer Schülerin/einem Schüler
  auf "Passwort zurücksetzen" (`ResetPasswordButton.tsx`).
- Ruft die Edge Function `reset-student-password` auf — die prüft
  zweifach: ist der Aufrufer Lehrkraft dieser Klasse (`is_teacher_of_class`),
  UND ist die Zielperson tatsächlich Schülerin/Schüler *dieser* Klasse
  (verhindert klassenübergreifenden Missbrauch).
- Erst danach wird der **Service-Role-Key** verwendet
  (`auth.admin.updateUserById`) — bewusst nur in der Edge Function, nie
  im Browser-Code.
- Neues Temp-Passwort wird einmalig angezeigt; Schüler:in sollte es
  direkt nach dem nächsten Login über `/account` (`apps/player`) selbst
  ändern.

**Setup:** `SUPABASE_SERVICE_ROLE_KEY` muss als Secret für die Edge
Function gesetzt sein (`supabase secrets set`), niemals im Frontend-Code
oder in `NEXT_PUBLIC_*`-Variablen.

## Jahrgangs-Auswertung

Erweiterung der bestehenden Klassen-Aggregate (`0011_grade_overview.sql`):
`grade_competency_overview`, `grade_mission_overview`, `grade_class_overview`
— aggregiert über alle Klassen eines Jahrgangs (`school_id` + `grade_level`).

Zugriff: Lehrkraft muss mindestens **eine** Klasse in genau diesem
Jahrgang unterrichten (`is_teacher_of_grade()`), geprüft in der um einen
`gradeQuery`-Modus erweiterten `teacher-dashboard`-Edge-Function.

`apps/teacher/app/grades/[schoolId]/[gradeLevel]/page.tsx` zeigt
dieselbe Aggregat-Ansicht wie das Klassen-Dashboard, nur jahrgangsweit.
Von der Klassenseite aus verlinkt über `/teacher/grades/lookup?classId=...`
(löst `classId` zu `school_id`+`grade_level` auf, dann Redirect) — so
muss die Klassenseite selbst diese IDs nicht mitführen.

## Ambient-Content (unauffällige Posts/Creator)

Ohne Gegenmaßnahme wäre jeder Feed-Post automatisch "verdächtig", weil
er zwangsläufig zu einem Szenario gehört — didaktisch zu leicht zu
erraten und wirkt nicht wie ein echter Feed.

- **`creators.creator_role`** (`0012_ambient_content.sql`): `ambient`
  (harmloses Füllmaterial), `antagonist` (treibt manipulativen Content),
  `ally` (unterstützende NPC-Dialoge wie Mia), `system`.
- **`content_items.scenario_id` darf NULL sein** — Ambient-Content ist
  bewusst szenario-unabhängig und damit über alle Szenarien hinweg
  wiederverwendbar, statt dass Redaktion pro Szenario eigenes
  Füllmaterial schreiben muss.
- **Durchmischung in der Feed Engine** (`interleaveByRatio()`): nie zwei
  Signal-Posts (mit Manipulationstechnik) direkt hintereinander, Ziel-
  Quote mit Zufallsstreuung statt starrem Takt (ein fester Rhythmus wäre
  selbst ein erkennbares Muster).
- **Adaptive Quote** (`computeAdaptiveSignalRatio()`): wer noch wenig
  Kompetenz-Fortschritt hat, sieht anteilig mehr Ambient-Content
  (leichterer Einstieg), die Quote steigt mit dem Kompetenz-Level.
- Redaktion kann Ambient-Content direkt im Scenario Editor anlegen
  (Checkbox "Ambient-Content — kein Szenario-Bezug" beim Anlegen eines
  Content-Items).
- Erstes Füllmaterial in `supabase/seed/0002_ambient_content.sql`.

Offen: Der Ambient-Pool wächst aktuell nur durch manuelle Redaktion.
Da diese Inhalte harmlos sind (keine Manipulationstechnik, keine
Persuasionsabsicht), wäre KI-gestützte Massen-Generierung hier deutlich
risikoärmer möglich als bei Signal-Content — bisher aber nicht gebaut.

### KI-gestützte Ambient-Content-Generierung

`apps/editorial/app/ambient-content/*` — löst genau diese Lücke.

- `generateAmbientDrafts()` ruft die Anthropic API mit einem eng
  gefassten System-Prompt auf (keine Persuasionsabsicht, keine echten
  Personen/Marken, keine kontroversen Themen, kein News-Ton — der ist
  bewusst dem manipulativen Content vorbehalten).
- **Landet immer als `status='draft'`** — durchläuft denselben
  Freigabe-Workflow wie jeder andere Content (`ContentStatusControl`,
  `ALLOWED_TRANSITIONS`). Kein KI-generierter Inhalt geht je ohne
  menschliche Prüfung live.
- Jeder generierte Post ist über `extra.generatedBy: "ai"` erkennbar.

**Setup:** `ANTHROPIC_API_KEY` als Server-Umgebungsvariable setzen
(niemals als `NEXT_PUBLIC_*`, sonst wäre der Key im Browser sichtbar).
Modell: `claude-haiku-4-5-20251001` (schnell/günstig, für diese simple
Generierungsaufgabe ausreichend).

Warum das für Ambient-Content vertretbar ist, für Signal-Content
(manipulative Posts, NPC-Antagonisten-Dialoge) aber weiterhin NICHT
automatisiert werden sollte: Ambient-Content hat per Definition keine
Überzeugungsabsicht — das Risikoprofil ist grundlegend anders als bei
Inhalten, die gezielt Manipulationstechniken demonstrieren sollen.

### Interaktionsgefühl: Likes + Kommentare

Ein Feed ohne sichtbare Interaktionsspuren wirkt tot. Gelöst über zwei
bewusst unterschiedliche Mechanismen:

- **Likes** — echte Interaktion: Tippen ruft `recordInteraction()` auf,
  zählt zu `user_interactions` (interaction_type `'like'`), fließt
  dadurch auch potenziell in Mission-Trigger ein. UI zeigt
  `extra.baseEngagement` (redaktionell gesetzte Basis-Anzahl, damit ein
  frischer Post nicht mit 0 Likes leblos wirkt) + eigene Likes addiert.
- **Kommentare** — bewusst **NUR lesbar/vorautoriert**, kein freies
  Eingabefeld für Schüler:innen. Das wäre ein eigenes Moderations-/
  Kinderschutzthema (Cybermobbing-Prävention, Wortfilter, Melde-Workflow)
  und sollte nicht "nebenbei" mit diesem Feature reinrutschen. Redaktion
  legt Kommentare wie jeden anderen Content-Item an, verknüpft sie über
  `parent_id` mit einem Post (Dropdown "Kommentar zu:" im Scenario
  Editor) — `content_items.parent_id` existierte schon seit dem ersten
  Schema, keine neue Tabelle nötig.
- `PostCard.tsx` lädt Kommentare erst beim Aufklappen nach (kein
  unnötiger Query-Overhead für Posts, die niemand aufklappt).
- `extra.baseCommentCount` funktioniert wie `baseEngagement` — rein
  kosmetischer Startwert, beeinflusst keine Engine-Logik.

Falls später doch echte Schüler-Kommentare gewünscht sind: eigenes
Feature mit Moderations-Queue, nicht einfach das bestehende Freitextfeld
öffnen.

## Creator-Profile (Fake-User trennbar navigierbar)

Creators waren im Datenmodell schon immer von Content getrennt
(eigene Tabelle) — bisher aber nirgends navigierbar. Jetzt:

- **`apps/player/app/creator/[creatorId]`** — echte Profilseite: Avatar
  (Initialen, da keine echten Bilder), Name, Handle, Bio
  (`persona.bio`), Fake-Follower-Anzahl (`persona.followerCount`),
  darunter alle `live`-Posts dieses Creators (mit denselben Like-
  /Kommentar-Interaktionen wie im Feed).
- **`AuthorRow`** (`PostCard.tsx`) macht sowohl den Post-Autor als auch
  jeden Kommentar-Autor klickbar → Profil.
- NPC-Dialog-Header (`NpcDialog.tsx`) verlinkt ebenfalls zum Profil der
  schreibenden Person.
- `lib/types.ts` definiert `FeedItem = ContentItem & { creator?: ... }`
  als spieler-app-lokale Erweiterung — der Kern-Typ `ContentItem` in
  `shared-types` bleibt unverändert, da er auch von Engines genutzt
  wird, die keine Creator-Anzeige brauchen.

**Sicherheitsrelevant fürs Lerndesign:** Die Profilseite fragt
`creator_role` (`ambient`/`antagonist`/`ally`) bewusst NICHT ab und
zeigt sie nirgends an — jedes Profil sieht strukturell gleich normal
aus, unabhängig davon, ob dahinter ein harmloser Filler-Account oder
ein Szenario-Antagonist steckt. Das zu verraten würde die Lernübung
sofort durchschaubar machen.

Offen: `persona.bio`/`followerCount` lassen sich bisher nur per SQL
setzen, kein Formularfeld im Scenario Editor dafür.

## Pacing-Modus: eine Schulstunde vs. mehrere Tage

Dieselbe Story-Arc soll sowohl kompakt (eine Unterrichtsstunde) als
auch verteilt (über mehrere Tage, mit Wartezeiten zwischen Schritten)
spielbar sein — Redaktion legt Inhalte nur EINMAL an, die Lehrkraft
entscheidet pro Klassen-Zuweisung, wie es abläuft.

- `story_arc_steps.unlock_delay_hours` (`0013_pacing_mode.sql`) —
  Redaktion hinterlegt beim Anlegen eines Arc-Schritts optional eine
  Verzögerung ("+Std." im Missions-/Arc-Builder).
- `class_scenario_assignments.pacing_mode`: `'compact'` (Default —
  ignoriert alle Verzögerungen, sofortige Freischaltung) oder
  `'as_designed'` (respektiert `unlock_delay_hours`). Lehrkraft wählt
  das beim Freischalten eines Szenarios für ihre Klasse
  (`ScenarioToggle.tsx`), nachträglich änderbar über `updateScenarioPacing()`.
- `user_unlocked_missions.available_at` — Freischaltung kann jetzt in
  der Zukunft liegen. `evaluate_missions_after_interaction()` prüft das
  zusätzlich zur reinen Freischaltung (Mission zählt erst als
  abschließbar, wenn `available_at <= now()`).
- `advance_story_arc_after_mission()` ermittelt den Pacing-Modus über
  die Klasse(n) des Nutzers zum jeweiligen Szenario — bei Mitgliedschaft
  in mehreren Klassen mit unterschiedlichem Pacing wird die erste
  gefundene Zuweisung verwendet (dokumentierte Vereinfachung).

## Multimedialität (Bilder/Videos)

`content_items.media_url`/`media_type` existierten seit dem ersten
Schema-Entwurf, wurden aber nirgends genutzt — reiner Text wirkt auf
Dauer flach (Immersions-Hebel 6 von 6, siehe vorherige Diskussion).

- **Storage:** neuer Supabase-Bucket `content-media`
  (`0014_content_media_storage.sql`) — öffentlich lesbar (Bilder zeigen
  keine sensiblen/personenbezogenen Inhalte, nur fiktive Feed-Posts),
  aber Upload/Löschen nur für `platform_staff` (RLS auf
  `storage.objects`, nicht nur auf die Anwendungsebene beschränkt).
- **Redaktion:** Datei-Upload-Feld im Content-Item-Formular
  (`isAmbient`-Checkbox, Kommentar-Zuordnung und jetzt auch Medien alle
  im selben Formular). `createContentItem()` lädt die Datei serverseitig
  hoch, leitet `media_type` aus dem MIME-Type ab (`image`/`video`).
- **Player:** `PostCard.tsx` rendert Bilder (`<img>`) bzw. Videos
  (`<video controls>`) zwischen Autor-Zeile und Text — bewusst normales
  `<img>` statt `next/image`, um keine Domain-Allowlist-Konfiguration
  für den Supabase-Storage-Host zu brauchen (Trade-off: kein
  automatisches Optimieren/Resizing).

## Dichteres soziales Netz: Gruppenchats

Bisher gab es nur 1:1-DMs mit einem einzelnen NPC — soziale Bewährung
("3 Leute haben schon reagiert") lässt sich damit kaum zeigen.

- `group_chats` (`0015_group_chats_and_consequences.sql`) + neue
  Spalten `content_items.group_chat_id`/`sequence_index`.
- Bewusst **linear, nicht verzweigt** — ein Gruppenchat ist primär
  Stimmungsbild/Gruppendruck, keine individuelle Entscheidungskette
  (die bleibt den 1:1-DMs vorbehalten).
- Redaktion: `/group-chats/[scenarioId]` — Chat anlegen
  (Titel + Teilnehmer:innen), Nachrichten in Sequenz mit Absender +
  optionaler Fake-Reaktionszahl (`extra.reactionCount`) hinzufügen.
- Player: `/group-chat/[id]` (`GroupChatView.tsx`) — Nachrichten
  erscheinen **kaskadierend** (900ms Abstand, "jemand schreibt…"),
  nicht alle auf einmal. Macht Gruppendruck erlebbar statt behauptet.

## Konsequenzen, die nachhallen

Bisher endete jede NPC-Konversation sauber — keine Verbindung zu dem,
was Tage später passiert.

- End-Nachrichten (ohne weitere `replyOptions`) können jetzt
  `extra.consequence = {contentItemId, delayHours}` tragen — Redaktion
  setzt das über `ConsequenceEditor.tsx` im NPC-Dialog-Builder.
- `user_npc_conversations.pending_resume_at`/`pending_resume_content_id`
  speichern die anstehende Folgenachricht.
- `getActiveNpcMessage()` (`packages/engine-core/src/npcEngine.ts`)
  entscheidet beim Öffnen einer Konversation: fällige Konsequenz zeigen
  (und Pending-Status auflösen), sonst zuletzt erreichten Punkt, sonst
  Startnachricht.
- Player-UI zeigt "— {Name} meldet sich wieder —" statt eines flachen
  "Gespräch beendet", solange eine Konsequenz aussteht.

## Fehlenden Einstiegspunkt nachgerüstet: Nachrichten-Posteingang

Bisher existierten NPC-Dialoge nur als Engine — nirgends im Feed
erreichbar. `/messages` (`apps/player`) listet jetzt alle ansprechbaren
NPCs (🔴 "neu" bei fälliger Konsequenz) und aktive Gruppenchats der
freigeschalteten Szenarien; verlinkt vom Feed-Header aus.

## iPad-Optimierung + Kompetenz-Panel

Bisher war die Player-App reines Phone-Portrait-Layout (`max-w-md`,
einspaltig) — auf einem iPad (Schulstandard) wirkte das mit viel
Leerraum links/rechts verloren.

- **Responsives Zwei-Spalten-Layout** ab `md:` (≈iPad-Portrait):
  Feed bleibt in vertrauter Lesebreite, daneben eine feste Sidebar.
  Unter dieser Breite (Phone) bleibt alles einspaltig.
- **`CompetencyPanel.tsx`** — bewusst **keine** Punkte/Badges/Streaks
  (siehe 04_DESIGN_PRINCIPLES: "Reflection over Rewards", Anti-Vision:
  kein Engagement-Reward-System). Stattdessen ruhige Fortschrittsbalken
  pro Kompetenz, die sich **nur bei echten Lernmomenten** aktualisieren
  (Mission-Abschluss über den bestehenden Event-Bus) — kein Live-Ticker
  pro Scroll-Bewegung, das würde vorab verraten, welcher Post gerade
  als "verdächtig" zählte. Auf Phone wandert das Panel in den Feed-Fluss
  statt in eine Sidebar.
- **Touch-Ziele**: Like-/Kommentar-Buttons jetzt auf min. 44×44pt
  (Apple HIG), plus kurzes Tap-Feedback (`.tap-pulse`).
- **Safe-Area-Handling** (`.safe-top`) für Geräte mit Notch/Dynamic Island.

## Echtes Icon-Set + Skeleton-Loading

Emojis als UI-Chrome (♥, 💬, 🔴, 👍, ←) wirken auf Dauer unprofessionell
und sind plattformabhängig unterschiedlich gerendert (iOS/Android/Web
zeigen teils unterschiedliche Emoji-Sets). Ersetzt durch `lucide-react`
(bereits Teil des gängigen React-Stacks): `Heart`, `MessageCircle`,
`Send`, `MessageSquare`, `Circle`, `ThumbsUp`, `ChevronLeft` — konsistent
über alle Seiten. Emojis in tatsächlichem Content (Post-Texte im Seed)
bleiben unangetastet, das ist redaktioneller Content, kein UI-Chrome.

**Skeleton-Loading** statt "Lädt…"-Text oder leerer Seite:

- `components/Skeleton.tsx` — Basis-Baustein (`Skeleton`) + zusammengesetzte
  Varianten, die die Form des tatsächlichen Contents nachbilden
  (`PostCardSkeleton`, `CommentSkeleton`, `ProfileHeaderSkeleton`, `ListRowSkeleton`).
- **Next.js `loading.tsx`-Konvention** genutzt: `app/feed/loading.tsx`,
  `app/creator/[creatorId]/loading.tsx`, `app/messages/loading.tsx`,
  `app/messages/[creatorId]/loading.tsx`, `app/group-chat/[groupChatId]/loading.tsx`
  — Next.js zeigt diese automatisch, solange die jeweilige Server
  Component noch lädt (React Suspense unter der Haube), kein manueller
  Loading-State im Code nötig.
- Komponenten-interne Ladezustände (Kommentare aufklappen, Reflexion
  laden, Gruppenchat-Kaskade) nutzen dieselben Skeleton-Bausteine statt
  eigener Ad-hoc-Lösungen.

## Admin-Design: Content-Bibliothek statt Pro-Szenario-Seiten

**Wichtiger Fund dabei:** Die Admin-App hatte bisher **kein Tailwind-
Setup** (kein `layout.tsx`, `globals.css`, `tailwind.config.ts`) — alle
bisherigen Utility-Klassen wurden nie tatsächlich gerendert. Jetzt
nachgeholt (`apps/teacher bzw. apps/editorial/app/layout.tsx`, `globals.css`,
`tailwind.config.ts`, `postcss.config.mjs`), wovon auch alle
bestehenden Seiten profitieren.

**Design-Ansatz für die Redaktion:** bewusst NICHT wie die Player-App
(Tinten/Marker-Gelb) — hier zählt Scanbarkeit über hunderte Zeilen,
nicht Erleben. Neutrale Grautöne (`canvas`/`panel`/`border`), eine
Akzentfarbe (`accent`) für primäre Aktionen, feste Statusfarben
(`status-draft/review/approved/live/rejected/archived`) — durchgängig
über die ganze Redaktion, damit man Status auf einen Blick erkennt statt
zu lesen.

**Gegen "zu viele Screens" bei 1000+ Content-Items:**

- **Persistente Sidebar** (`app/editorial/layout.tsx`) — bisher gab es
  keine Navigation zwischen den Redaktions-Bereichen, jede Seite war nur
  über eine bekannte URL erreichbar.
- **`/content`** — zentrale Tabelle über *alle* Szenarien
  hinweg (statt der bisherigen Pro-Szenario-Ansicht). Filter (Status,
  Typ, Szenario, Technik-Tag) + Volltextsuche + Pagination laufen
  komplett über URL-Parameter und ein natives `<form method="GET">` —
  kein Client-JS nötig, funktioniert mit Browser-Zurück, Links sind
  kopier-/teilbar.
- **Detail-Drawer** (`ContentDetailDrawer.tsx`) statt Extra-Seite pro
  Item: Klick auf eine Zeile öffnet ein Seitenpanel (`?item=<id>` in der
  URL), die Liste bleibt daneben sichtbar/bedienbar — kein
  "Liste → Detail → zurück, Scroll-Position weg".
- **Mehrfachauswahl + Bulk-Freigabe** (`ContentTable.tsx`,
  `bulkUpdateStatus()`): Checkboxen pro Zeile, Aktionsleiste erscheint
  bei Auswahl. Items mit ungültigem Status-Übergang werden pro Batch
  einfach übersprungen statt den ganzen Vorgang abzubrechen.

**Migration abgeschlossen:** Alle Redaktionsseiten
(`/scenarios`, `/missions`, `/npc-dialogs`,
`/group-chats`, `/ambient-content`, `/staff`)
nutzen jetzt durchgängig dieselben Tokens (`canvas`/`panel`/`border`/
`accent`/`status-*`) und lucide-react-Icons statt Emojis. Nebenbei zwei
weitere Lücken gefunden und geschlossen: `/group-chats` hatte
gar keine Übersichtsseite (nur direkte Szenario-URLs erreichbar), und
die Sidebar verlinkte "Missionen & Arcs" sowie "Gruppenchats" noch nicht.
`/teacher/*` (andere Zielgruppe: Lehrkräfte) bewusst nicht angeglichen —
eigene Optik dort ist inhaltlich gerechtfertigt.

## Lehrer-Bereich erweitert: Module, Notenbuch, Engpass-Analyse

**Wichtiger Sicherheitsfund dabei:** Die bisherigen Klassen-Aggregate
(`class_competency_overview` etc.) waren normale SQL-Views. Da
`user_competency_progress`/`user_interactions` RLS nur `auth.uid() =
user_id` erlauben, war nicht garantiert, dass eine Lehrkraft beim
Abfragen der View tatsächlich Zeilen ihrer Schüler:innen sieht (abhängig
von Postgres/Supabase-RLS-Verhalten bei Views). Um das nicht dem Zufall
zu überlassen: alle klassenübergreifenden Abfragen laufen jetzt über
`SECURITY DEFINER`-Funktionen mit eingebauter Berechtigungsprüfung
(`0018_teacher_dashboard_functions.sql`) — dasselbe bewährte Muster wie
`is_teacher_of_class()`. Die alten Views wurden entfernt.

**Bewusste Grenze bei "welcher Schüler reagiert wie":** Kein "Gotcha"
("Schüler X hat auf Post Y reagiert") — stattdessen ein normales
Notenbuch-Raster (Kompetenz-Level × Schüler:in, Missionen abgeschlossen),
nur für die Lehrkraft sichtbar. Erfüllt den echten Bedarf (wissen, wer
Unterstützung braucht), ohne die Safe-Failure-Prinzipien zu verletzen.

Neu in der Klassenübersicht (`/teacher/classes/[classId]`):

- **Module &amp; Missionen dieser Klasse** — direkter Read auf `missions`
  (kein Edge-Function-Umweg nötig, `missions` hat bereits „authenticated
  read"-RLS), zeigt Trigger-Bedingung als Schwierigkeits-Indikator.
- **Wo gibt es Schwierigkeiten** — `get_class_mission_bottlenecks()`:
  Missionen nach niedrigster Abschlussquote sortiert, farbcodiert
  (rot &lt;40 %, gelb &lt;70 %, grün darüber). Curriculum-Diagnose, keine
  Einzelperson-Bloßstellung.
- **Fortschritt pro Schüler:in** — `get_class_student_competency_progress()`
  + `get_class_student_mission_progress()`, zu einer Tabelle
  zusammengeführt (Kompetenz-Level pro Spalte, Missionen abgeschlossen).

## Marketing-Website (apps/website)

Neue, dritte App — öffentlich, unauthentifiziert, andere Zielgruppe
(Schulleitung/Lehrkräfte vor der Anmeldung, nicht Schüler:innen). Bewusst
getrennt von `apps/player`/`apps/teacher bzw. apps/editorial`.

- **Klassischer SaaS-Aufbau:** Nav mit Login-Button (führt zu
  `apps/teacher bzw. apps/editorial/login`) + "Demo anfragen"-CTA, Hero, Trust-Bar, Feature-
  Grid, "So funktioniert's", Pricing-Teaser, Footer.
- **`/lexikon`** — öffentliches Glossar generischer Manipulationsmuster,
  gespeist aus der neuen Tabelle `technique_glossary`
  (`0019_technique_glossary.sql`). **Wichtige Abgrenzung:** enthält
  bewusst KEINE realen Symbole/Codes aus extremistischen Szenen — das
  wäre eine öffentlich zugängliche, unauthentifizierte kompilierte
  Liste, die genau das Risiko darstellt, das beim Aufbau des
  Redaktionssystems ganz am Anfang bewusst vermieden wurde. Solche
  Inhalte gehören ausschließlich in den geschützten, altersgegateten
  Schüler-Bereich.
- **`/simulation`** — Demo-Feed mit **festen, hartcodierten Beispieldaten**,
  keine Live-Abfrage der Produktions-DB. Eine öffentliche Marketing-Seite
  sollte nie echte Schul-/Klasseninhalte zeigen, auch wenn sie harmlos wären.
- **`/preise`** — Umsetzung des zuvor entwickelten Lizenzmodells
  (Pilot/Schullizenz S/M/L), Preise als Illustration gekennzeichnet.

**Setup:** `NEXT_PUBLIC_ADMIN_URL` als Env-Var setzen (Basis-URL von
`apps/teacher bzw. apps/editorial`, z.B. `https://admin.dr1ft.app`), damit Login-/Signup-Links
korrekt verlinken — die Apps laufen unter unterschiedlichen (Sub-)Domains.

## Vier eigenständige Apps — echte Trennung von Lehrkraft und Redaktion

**Wichtiger Fund:** Lehrkraft und Redaktion liefen bisher in **derselben
App** (`apps/teacher bzw. apps/editorial`) mit demselben Login. Die Trennung existierte nur
über Row-Level-Security beim Schreiben — eine Lehrkraft konnte sich
technisch zu Redaktionsseiten navigieren und dank "authenticated read"-
Policies sogar Inhalte lesen. Keine echte Trennung, nur ein loser Zaun.

Jetzt: **vier komplett eigenständige, unabhängig deploybare Apps**:

```
apps/player/      Schüler:innen-Feed        (Port 3000)
apps/teacher/      Lehrkraft-Dashboard        (Port 3001)
apps/website/      Marketing-Homepage         (Port 3002)
apps/editorial/    Redaktion                  (Port 3003)
```

- **`apps/teacher`** — offener Signup (jede Lehrkraft kann sich
  registrieren), keine besonderen Rechte nötig.
- **`apps/editorial`** — **kein Self-Serve-Signup**. Das Root-Layout
  (`app/layout.tsx`) prüft bei JEDEM Seitenaufruf serverseitig, ob der
  eingeloggte Nutzer in `platform_staff` steht — nicht nur beim
  Schreiben (RLS), sondern schon beim bloßen Betreten. Ohne Eintrag:
  "Kein Zugriff"-Seite statt der Redaktionsoberfläche. Neue
  Redaktionsmitglieder werden ausschließlich von einem
  `platform_admin` über die Staff-Verwaltung hinzugefügt.
- **`apps/website`** verlinkt Login/Signup ausschließlich zur
  Teacher-App (`NEXT_PUBLIC_TEACHER_URL`) — die Redaktion wird von der
  öffentlichen Seite aus nirgends beworben oder verlinkt, rein intern.

**Lokal:**
```
npm run player     # localhost:3000
npm run teacher     # localhost:3001
npm run website     # localhost:3002
npm run editorial   # localhost:3003
```

**Produktion:** vier separate Deployments/Domains, z.B.
`dr1ft.de` (Website), `app.dr1ft.de` (Player), `lehrkraft.dr1ft.de`
(Teacher), `redaktion.dr1ft.de` (Editorial — idealerweise NICHT
öffentlich beworben, ggf. zusätzlich per IP-Allowlist/VPN einschränken,
da hier die eigentliche Content-Erstellung passiert).

`npm install` weiterhin einmalig in jedem `apps/*`-Ordner nötig.
`NEXT_PUBLIC_TEACHER_URL` in `apps/website` auf die produktive
Teacher-Domain setzen (nicht `NEXT_PUBLIC_ADMIN_URL` — umbenannt).

## Arbeiten mit Claude Code

Dieses Repo ist so aufgebaut, dass du einzelne Ordner als abgeschlossene
Aufträge an Claude Code übergeben kannst, z.B.:

> "Baue in apps/player eine neue Route, die ContentItem[] aus @dr1ft/shared-types
> als Story-Karussell rendert (analog zu PostCard.tsx, aber horizontal swipebar)."

> "Baue in apps/teacher bzw. apps/editorial ein Formular, um einen neuen ContentItem-Draft anzulegen,
> inkl. Manipulationstechniken-Tags und Freigabe-Status-Wechsel."

Wichtig: Inhalte, die reale Extremismus-Symbole/-Codes zeigen sollen, immer
über kuratierte externe Quellen (z.B. jugendschutz.net) einspeisen und über
den Redaktions-Workflow (status: in_review) freigeben lassen — nie automatisch
per KI generieren und live schalten.
