# DR1FT — Setup-Anleitung

Diese Anleitung führt einmal komplett von "leeres Supabase-Projekt" bis
"alle vier Apps laufen lokal". Reihenfolge ist wichtig — spätere
Schritte setzen frühere voraus.

---

## 0. Voraussetzungen

- Node.js 20+ und Yarn installiert (`npm install -g yarn`)
- Ein Supabase-Account (supabase.com)
- Supabase CLI installiert (`npm install -g supabase`)
- Ein Anthropic-API-Key (für den Ambient-Content-Generator in der Redaktion)

---

## 1. Supabase-Projekt anlegen

1. Neues Projekt auf supabase.com erstellen.
2. **Region: Frankfurt (EU)** wählen — nicht US-Regionen. Für
   Schuldaten im DSGVO-Kontext ist das keine Option, sondern Pflicht
   (siehe README, Abschnitt "Login / Auth-Strategie").
3. Datenbank-Passwort und Projekt-URL/Keys notieren
   (Project Settings → API): `Project URL`, `anon public` Key,
   `service_role` Key (letzterer ist **geheim**, nie im Frontend).

---

## 2. Supabase CLI verbinden

```bash
supabase login
cd dr1ft
supabase link --project-ref <DEIN-PROJECT-REF>
```

---

## 3. Migrationen einspielen

Alle 19 Migrationen liegen in `supabase/migrations/`, chronologisch
sortiert und aufeinander aufbauend — nicht einzeln, sondern in Reihenfolge:

```bash
supabase db push
```

Das spielt `0001_init_schema.sql` bis `0019_technique_glossary.sql`
in der richtigen Reihenfolge ein. Falls `db push` aus irgendeinem Grund
fehlschlägt: einzeln im Supabase Dashboard → SQL Editor einfügen, in
aufsteigender Dateinamens-Reihenfolge.

**Kurz zur Einordnung, was dabei passiert** (falls du nachvollziehen willst):
Kernschema → Schulen/Klassen → Lehrer-Dashboard → Mission/Analytics/NPC/
Narrative Engine → Redaktions-RLS → Staff-Rollen → Jahrgang → Ambient-
Content → Pacing-Modus → Medien-Storage → Gruppenchats → Konsequenzen →
Korrektur einer Funktionsüberladung (0017) → sichere Dashboard-Funktionen
(0018, ersetzt frühere Views) → öffentliches Technik-Lexikon.

---

## 4. Seed-Daten einspielen

Seeds werden **nicht** automatisch von `supabase db push` mitgenommen.
Im Supabase Dashboard → SQL Editor, in dieser Reihenfolge einfügen und
ausführen:

1. `supabase/seed/0001_mini_scenario_fake_news.sql` — Mini-Testszenario
2. `supabase/seed/0002_ambient_content.sql` — Ambient-Creator/-Posts
3. `supabase/seed/0003_technique_glossary.sql` — öffentliches Lexikon

---

## 5. Supabase-Auth-Einstellungen

Dashboard → Authentication → Providers → Email:

- **"Confirm email" deaktivieren.** Zwingend nötig — Schüler-Accounts
  nutzen synthetische E-Mail-Adressen (`nutzername.zugangscode@dr1ft.local`),
  die nie eine Bestätigungsmail empfangen können. Ohne diesen Schritt
  scheitert der komplette Schüler-Beitritt (`apps/player/app/join`).

---

## 6. Edge Functions deployen

```bash
supabase functions deploy teacher-dashboard
supabase functions deploy reset-student-password
```

`reset-student-password` braucht Zugriff auf den `service_role`-Key.
Supabase stellt `SUPABASE_URL`, `SUPABASE_ANON_KEY` und
`SUPABASE_SERVICE_ROLE_KEY` Edge Functions normalerweise automatisch
zur Verfügung. Zur Kontrolle:

```bash
supabase secrets list
```

Fehlt `SUPABASE_SERVICE_ROLE_KEY`, manuell setzen:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<dein-service-role-key>
```

⚠️ Dieser Key darf **niemals** in einer `.env.local` einer der vier
Next.js-Apps landen, schon gar nicht als `NEXT_PUBLIC_*`-Variable —
er gehört ausschließlich hierher.

---

## 7. Storage-Bucket prüfen

`content-media` wurde bereits per Migration 0014 angelegt (öffentlich
lesbar, Schreiben nur für `platform_staff`). Kurz im Dashboard unter
Storage prüfen, ob der Bucket existiert — falls nicht, ist Schritt 3
nicht vollständig durchgelaufen.

---

## 8. Repo-Abhängigkeiten installieren

**Einmal am Repo-Root**, nicht pro App einzeln — die vier Apps nutzen
Yarn Workspaces, das löst `@dr1ft/shared-types` und `@dr1ft/engine-core`
als lokale Pakete korrekt auf:

```bash
cd dr1ft
yarn install
```

---

## 9. Environment-Variablen pro App

Für jede der vier Apps eine `.env.local`-Datei anlegen:

**`apps/player/.env.local`**, **`apps/teacher/.env.local`**,
**`apps/website/.env.local`**, **`apps/editorial/.env.local`** —
jeweils:

```
NEXT_PUBLIC_SUPABASE_URL=https://<dein-projekt>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<dein-anon-key>
```

**Zusätzlich nur in `apps/editorial/.env.local`:**

```
ANTHROPIC_API_KEY=<dein-anthropic-key>
```

(wird für den KI-gestützten Ambient-Content-Generator gebraucht —
Modell `claude-haiku-4-5-20251001`, siehe README-Abschnitt dazu)

**Zusätzlich nur in `apps/website/.env.local`:**

```
NEXT_PUBLIC_TEACHER_URL=http://localhost:3001
```

(lokal dieser Wert; in Produktion die echte Teacher-App-Domain, sonst
verlinkt der Login-Button in Produktion fälschlich auf `localhost:3001`)

---

## 10. Apps lokal starten

Vier separate Terminals, jeweils im Repo-Root:

```bash
yarn player      # → http://localhost:3000  Schüler:innen-Feed
yarn teacher     # → http://localhost:3001  Lehrkraft-Dashboard
yarn website     # → http://localhost:3002  Marketing-Homepage
yarn editorial   # → http://localhost:3003  Redaktion
```

---

## 11. Ersten Redaktions-Account freischalten (Henne-Ei-Problem)

`apps/editorial` hat **keinen Self-Serve-Signup** — aus gutem Grund
(siehe README). Das allererste Mitglied muss einmalig per SQL rein:

1. Auf `http://localhost:3001/signup` (Teacher-App) einen ganz normalen
   Account mit deiner E-Mail anlegen — Auth-User existiert danach in
   Supabase, unabhängig davon, ob du Lehrkraft oder Redakteur:in bist.
2. Im Supabase Dashboard → Authentication → Users die eigene `User UID`
   kopieren.
3. Im SQL Editor:
   ```sql
   insert into platform_staff (user_id, role)
   values ('<DEINE_AUTH_ID>', 'platform_admin');
   ```
4. Jetzt auf `http://localhost:3003/login` mit denselben Zugangsdaten
   einloggen — die Redaktionsoberfläche ist jetzt erreichbar. Weitere
   Redaktionsmitglieder können ab jetzt über `/staff` in der
   Editorial-App hinzugefügt werden, ohne erneutes SQL.

---

## 12. Ersten kompletten Durchlauf testen

1. In der Teacher-App (`localhost:3001`) einloggen, Klasse anlegen
   (erzeugt automatisch einen Zugangscode) — optional Jahrgang angeben.
2. In der Redaktion (`localhost:3003`) unter "Szenarien" das per Seed
   angelegte Szenario "Fake News erkennen" **aktivieren** (Toggle), da
   neue Szenarien standardmäßig inaktiv starten.
3. Zurück in der Teacher-App: Szenario der Klasse zuweisen (Pacing-Modus
   "Kompakt" für den ersten Test), Zugangscode notieren.
4. Player-App (`localhost:3000/join`) öffnen, mit dem Zugangscode +
   selbstgewähltem Nutzernamen/Passwort beitreten.
5. Im Feed durch die zwei NewsBlitz24-Posts scrollen → Mission A sollte
   abschließen, Reflexions-Overlay erscheint, Kompetenz-Fortschritt
   sichtbar.
6. Über "Nachrichten" den Dialog mit Mia öffnen, eine Antwort wählen →
   Mission B sollte abschließen.
7. Zurück in der Teacher-App: Klassenübersicht sollte jetzt Fortschritt,
   Notenbuch-Eintrag und (bei niedriger Quote) einen Engpass-Hinweis zeigen.

Ausführliche SQL-Testschritte (falls du statt der UI direkt in der DB
simulieren willst) stehen als Kommentare am Ende von
`supabase/seed/0001_mini_scenario_fake_news.sql`.

---

## 13. Produktions-Deployment (Kurzfassung)

- Vier separate Deployments (z.B. vier Vercel-Projekte), eigene
  (Sub-)Domains, z.B. `dr1ft.de` (Website), `app.dr1ft.de` (Player),
  `lehrkraft.dr1ft.de` (Teacher), `redaktion.dr1ft.de` (Editorial).
- Dieselben Environment-Variablen wie lokal, aber mit produktiven Werten
  (`NEXT_PUBLIC_TEACHER_URL` auf die echte Teacher-Domain!).
- **Empfehlung:** Editorial-Domain zusätzlich per IP-Allowlist/VPN
  einschränken — dort passiert die eigentliche Content-Erstellung,
  die Login-Prüfung allein ist die Grundsicherung, nicht die einzige
  Schicht, die man in Produktion haben sollte.
- `ANTHROPIC_API_KEY` und `SUPABASE_SERVICE_ROLE_KEY` ausschließlich als
  Server-Secrets im jeweiligen Deployment-Dashboard setzen, nie als
  `NEXT_PUBLIC_*`.

---

## Alternative zu Schritt 8–10: GitHub Codespaces

Statt Node/Yarn lokal zu installieren und `.env.local`-Dateien von Hand
anzulegen, kannst du das ganze Repo in einem **GitHub Codespace** öffnen
— eine vorkonfigurierte Cloud-Entwicklungsumgebung im Browser (oder in
VS Code Desktop verbunden).

**Was der Codespace übernimmt:** Node 20, Yarn, Supabase CLI werden
automatisch installiert (`.devcontainer/devcontainer.json`), `yarn
install` läuft automatisch beim ersten Start, alle vier Ports (3000–3003)
sind vorkonfiguriert mit Labels.

**Was der Codespace NICHT ersetzt:** Die Supabase-Postgres-Datenbank
bleibt ein separater gehosteter Service — Schritte 1–7 (Projekt anlegen,
Migrationen, Seeds, Auth-Einstellungen, Edge Functions) machst du
weiterhin genauso, nur dass die Befehle (`supabase login`,
`supabase link`, `supabase db push`, `supabase functions deploy`) jetzt
im Codespace-Terminal laufen statt lokal — identischer Ablauf, andere
Maschine.

**So gehst du vor:**

1. Repo auf GitHub pushen (Codespaces brauchen ein GitHub-Repo, kein
   lokaler Ordner).
2. Auf GitHub → "Code" → "Codespaces" → "Create codespace on main".
   Läuft automatisch `postCreateCommand` (Yarn Workspaces installieren).
3. Statt `.env.local`-Dateien pro App: Repo (oder Organisation) →
   Settings → Secrets and variables → **Codespaces** → dort
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_TEACHER_URL` als Secrets anlegen —
   werden automatisch als Umgebungsvariablen in jeden neuen Codespace
   injiziert, kein manuelles `.env.local`-Kopieren mehr nötig.
   (Alternativ funktionieren `.env.local`-Dateien auch weiterhin ganz
   normal direkt im Codespace, falls du das lieber pro App getrennt hältst.)
4. Vier Terminal-Tabs im Codespace öffnen, wie lokal:
   ```bash
   yarn player
   yarn teacher
   yarn website
   yarn editorial
   ```
5. VS Code zeigt unten im "Ports"-Tab die weitergeleiteten URLs
   (`https://<codespace-name>-3000.app.github.dev` usw.) — diese sind
   auch mit anderen teilbar (z.B. um der Redaktion einen Blick zu geben,
   ohne dass sie selbst etwas installieren muss). Sichtbarkeit pro Port
   von "Private" auf "Public" stellen, falls das gewünscht ist —
   standardmäßig privat, nur du siehst es.

**Für lokale Supabase-Entwicklung ohne gehostetes Projekt** (optional,
für schnelles Iterieren an Migrationen): `supabase start` läuft dank
Docker-in-Docker auch im Codespace, startet eine lokale Postgres-Instanz
statt gegen das gehostete Projekt zu arbeiten. Für den produktiven
Testdurchlauf (Schritt 12) empfiehlt sich trotzdem das echte gehostete
Projekt, da Auth/Storage/Edge-Functions dort vollständig funktionieren.

---

| Was | Wo |
|---|---|
| DB-Schema | `supabase/migrations/0001`–`0019` |
| Testdaten | `supabase/seed/0001`–`0003` |
| Serverseitige Logik (Mission/Analytics/NPC/Narrative Engine) | `packages/engine-core` |
| Gemeinsame Typen | `packages/shared-types` |
| Schüler-Feed | `apps/player` |
| Lehrkraft-Dashboard | `apps/teacher` |
| Redaktion (nur `platform_staff`) | `apps/editorial` |
| Marketing-Homepage | `apps/website` |
