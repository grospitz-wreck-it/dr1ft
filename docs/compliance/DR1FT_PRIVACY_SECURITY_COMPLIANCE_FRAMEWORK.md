# DR1FT – Datenschutz, Informationssicherheit & Compliance

**Dokumenttyp:** Architektur- und Umsetzungsrahmen (Arbeitsdraft)  
**Version:** 0.1  
**Status:** Draft – zur technischen, organisatorischen und rechtlichen Prüfung  
**Geltungsbereich:** DR1FT-Plattform, Schulbetrieb, Entwicklungs- und Betriebsprozesse  
**Zielmarkt:** zunächst Nordrhein-Westfalen, anschließend weitere Bundesländer  
**Branch:** `feature/school-year-and-staff-management`

> **Wichtiger Statushinweis:** Dieses Dokument ist ein Arbeits- und Architekturrahmen. Es ist weder eine rechtliche Freigabe noch ein Nachweis, dass DR1FT bereits DSGVO-konform ist. Aussagen über den Ist-Zustand müssen durch Repository-, Infrastruktur-, Vertrags- und Konfigurationsprüfungen belegt werden. Offene Punkte sind ausdrücklich als offen markiert.

---

## 1. Ziel und Leitbild

DR1FT soll als datenschutzorientierte Lernplattform für Schulen entwickelt und betrieben werden. Datenschutz und Informationssicherheit sind keine nachgelagerten Zusatzfunktionen, sondern verbindliche Architektur- und Produktanforderungen (**Privacy by Design** und **Privacy by Default**).

Der Strang verfolgt fünf Ziele:

1. Personenbezogene Daten auf das für den jeweiligen schulischen Zweck erforderliche Maß begrenzen.
2. Schülerdaten wirksam vor unberechtigtem Zugriff, unnötiger Offenlegung und zweckfremder Nutzung schützen.
3. Datenflüsse innerhalb von DR1FT und zu Dienstleistern transparent und kontrollierbar gestalten.
4. Schulen bei ihren Prüf-, Informations- und Organisationspflichten mit nachvollziehbaren Unterlagen und Funktionen unterstützen.
5. Eine gemeinsame technische Basis schaffen, die landesspezifische schulrechtliche Anforderungen konfigurierbar berücksichtigt.

**Leitprinzip:** DR1FT verarbeitet nicht mehr Daten, als für den konkret festgelegten Lern- und Verwaltungszweck erforderlich sind. Eine technisch mögliche Verarbeitung ist nicht automatisch eine zulässige oder pädagogisch sinnvolle Verarbeitung.

## 2. Geltungsbereich und Abgrenzung

Der Compliance-Strang umfasst:

- Player-App und Schülerkonten
- Teacher-App und schulische Auswertungen
- Editorial-/Admin-Anwendungen, soweit sie Schul- oder Nutzerdaten berühren
- Supabase-Datenbank, Auth, Storage, Realtime und Edge Functions
- Hosting, Deployment, Monitoring, Logging, Backups und Support
- KI- und sonstige externe Dienste
- Schul-Onboarding, Nutzerverwaltung, Klassen- und Schuljahreswechsel
- Datenexport, Aufbewahrung, Löschung und Betroffenenanfragen
- Entwicklungs-, Test- und Qualitätssicherungsprozesse

Nicht Gegenstand einer pauschalen Freigabe durch dieses Dokument sind die konkrete schulische Rechtsgrundlage, die Entscheidung einer einzelnen Schule über den Einsatz, individuelle Informationspflichten oder eine rechtliche Bewertung eines konkreten Verarbeitungsvorgangs. Diese müssen anhand des tatsächlichen Einsatzszenarios geprüft werden.

## 3. Verbindliche Produkt- und Datenschutzprinzipien

### 3.1 Datenminimierung und pseudonyme Schülerkonten

- Schülerkonten sollen grundsätzlich ohne private E-Mail-Adresse und ohne vollständigen Klarnamen funktionieren.
- Als sichtbare Bezeichnung ist ein begrenzter Anzeigename vorgesehen, beispielsweise „Max M.“; vollständige Nachnamen sollen nicht als Standard angezeigt oder verlangt werden.
- Für technische Authentifizierung können systeminterne IDs und erforderliche technische Identifikatoren verwendet werden. Diese sind von sichtbaren Profilangaben zu trennen.
- Synthetische E-Mail-Adressen dürfen nicht dazu führen, dass DR1FT eine nicht existierende oder nicht kontrollierte Kontaktadresse als Kommunikationskanal behandelt.
- Lehrkräfte und berechtigte Schulverwaltung müssen Schüler innerhalb des schulischen Kontexts zuverlässig zuordnen können. Diese Zuordnung ist zugriffsbeschränkt und darf nicht automatisch im Player sichtbar werden.
- In Test-, Demo- und Entwicklungsumgebungen sind grundsätzlich synthetische Datensätze zu verwenden.

Pseudonymisierung reduziert Risiken, macht Daten aber nicht automatisch anonym. Solange eine Zuordnung über Schule, Klasse, interne ID oder andere Merkmale möglich ist, bleiben die Daten personenbezogen.

### 3.2 Zweckbindung

Für jede Datenkategorie sind vor Implementierung festzulegen:

- konkreter Zweck,
- erforderliche Datenfelder,
- zugriffsberechtigte Rollen,
- Empfänger und Dienstleister,
- Aufbewahrungsdauer bzw. Löschereignis,
- mögliche Exporte und Auswertungen.

Daten aus Lerninteraktionen dürfen nicht ohne gesonderte Prüfung für Werbung, Profilbildung außerhalb des Lernzwecks, allgemeine Verhaltensüberwachung oder andere sachfremde Zwecke verwendet werden.

### 3.3 Keine unangemessene automatisierte Schülerbewertung

- Einzelne Klicks, Likes, Reports oder Missionsabschlüsse sind kein hinreichender Beleg für stabile Kompetenzen oder Persönlichkeitsmerkmale.
- Technisch beobachtetes Verhalten, gespeicherte Evidenz und pädagogische Interpretation müssen getrennt bleiben.
- Lernberichte müssen ihre Datengrundlage und Grenzen nachvollziehbar machen.
- Pädagogisch relevante Bewertungen bleiben menschlich überprüfbar.
- DR1FT darf aus einzelnen Verhaltenssignalen keine automatischen Etiketten über Schüler ableiten.

### 3.4 Zugriff nach Erforderlichkeit

- Zugriff wird nach dem Least-Privilege-Prinzip vergeben.
- Schulzugehörigkeit und Klassenmitgliedschaft sind getrennte Berechtigungsdimensionen.
- Lehrkräfte sehen nur Klassen, denen sie ausdrücklich zugewiesen sind.
- Schulweite Verwaltungsrechte erhalten nur dafür vorgesehene Schulrollen.
- Zusätzliche Funktionen für Lehrkräfte erweitern nur den ausdrücklich vergebenen Geltungsbereich.
- Jede sicherheitsrelevante Prüfung erfolgt serverseitig. Das Ausblenden von UI-Elementen ist kein Zugriffsschutz.

## 4. Rollen- und Verantwortlichkeitsmodell

Die konkrete datenschutzrechtliche Rollenverteilung ist je Einsatzmodell vertraglich zu prüfen. Als Arbeitsannahme gilt:

| Beteiligter | Vorgesehene Rolle / Verantwortung | Noch zu klären |
|---|---|---|
| Schule bzw. zuständige öffentliche Stelle | Regelmäßig Verantwortlicher für den schulischen Einsatz und dessen Zwecke | Wer ist im konkreten Schulträger-/Schulmodell Vertragspartner und Verantwortlicher? |
| DR1FT-Betreiber | Voraussichtlich Auftragsverarbeiter, soweit DR1FT ausschließlich nach Weisung der Schule verarbeitet | Betreiber-Rechtsform, Weisungsmodell, eigene Zwecke und mögliche getrennte Verantwortlichkeit |
| Hosting-, Datenbank-, KI- und Supportanbieter | Je nach Dienst Unterauftragsverarbeiter oder eigenständig Verantwortliche | Anbieter, konkrete Dienste, Datenzugriffe, Regionen, Verträge und Unterauftragnehmer |
| Schulleitung / school_lead | Schulweite Steuerung und Freigabe im vereinbarten Funktionsumfang | Abgleich mit landesspezifischem Schulrecht und tatsächlichem Rollenmodell |
| Schuladmin | Schulweite administrative Aufgaben im festgelegten Umfang | Abgrenzung zur Schulleitung und Delegation |
| Lehrkraft | Zugriff auf zugewiesene Klassen und pädagogisch erforderliche Funktionen | konkrete Rechte je Funktion und schulische Vorgaben |
| Schüler | Nutzung der Lernumgebung und Wahrnehmung der einschlägigen Betroffenenrechte | altersgerechte Information und Verfahren mit Schule/Erziehungsberechtigten |

### 4.1 Technische Trennung von Schul- und Klassenrechten

- `school_memberships` bildet die Zugehörigkeit zu einer Schule und die schulweite Rolle ab.
- `class_instance_memberships` bildet die konkrete Mitgliedschaft in einer Klasseninstanz ab.
- Nur `school_lead` und `school_admin` derselben Schule dürfen nach der festgelegten Produktentscheidung Lehrkräfte Klassen zuweisen oder Zuweisungen ändern.
- Lehrkräfte können mehreren Klassen zugeordnet sein; Klassen können mehrere Lehrkräfte haben.
- Schüler behalten die Regel, höchstens einer aktiven Klasseninstanz gleichzeitig anzugehören.
- Schulweite Sonderrechte dürfen nicht dadurch simuliert werden, dass eine Rolle in eine Klassenmitgliedschaft hineingedeutet wird.

Die Berechtigungsprüfung muss in Server Actions, API-Routen, Edge Functions, RPCs und Datenbank-RLS konsistent umgesetzt werden.

## 5. Dateninventar und Klassifizierung

Ein vollständiges Dateninventar ist ein Pflicht-Artefakt dieses Strangs. Die folgende Tabelle ist ein erster Arbeitsstand und kein vollständiger Nachweis des aktuellen Datenbestands.

| Datenkategorie | Beispiele | Vorläufige Schutzstufe | Erforderliche Prüfung |
|---|---|---|---|
| Konto-/Identitätsdaten | interne User-ID, Anzeigename, Auth-Metadaten, synthetische Login-Adresse | hoch | tatsächliche Felder, Zuordnungsmöglichkeit, Auth-Logs |
| Schul-/Organisationsdaten | Schule, Schulrolle, Klasse, Schuljahr, Lehrkraftzuweisung | hoch | Mandantentrennung und Berechtigungspfade |
| Lern- und Interaktionsdaten | Feed-Aktionen, Missionsstatus, Antworten, Lernfortschritt | hoch | Zweck, Granularität, Zugriff, Aufbewahrung |
| Kompetenz-/Berichtsdaten | Kompetenzstände, Evidenz, Teacher Reports | hoch | Interpretationsgrenzen, Empfängerkreis, Export |
| Kommunikationsdaten | Dialoge, Kommentare, Nachrichten oder NPC-Interaktionen | hoch | Inhalt, Moderation, Speicherung, KI-Weitergabe |
| technische Betriebsdaten | IP-Adressen, Geräte-/Browserdaten, Logs, Fehlerberichte | mittel bis hoch | Umfang, Zugriff, Speicherort, Löschfrist |
| Medien/Uploads | Bilder, Anhänge, Profil-/Content-Medien | abhängig vom Inhalt | Metadaten, Malwareprüfung, Zugriff, Löschung |
| Abrechnungs-/Vertragsdaten | Schulvertrag, Ansprechpartner, Rechnungsdaten | separat zu prüfen | Verantwortlichkeit und gesetzliche Aufbewahrung |

Für jede Kategorie werden Datenquelle, Tabellen/Felder, Verarbeitungsschritte, Empfänger, Speicherort, Rechtsgrundlage, Löschregel und verantwortliche Komponente dokumentiert.

## 6. Datenfluss- und Systemübersicht

### 6.1 Bekannte bzw. dokumentierte Architektur

Die Projektunterlagen und bisherigen Entscheidungen nennen derzeit:

- Next.js-Anwendungen für Player, Teacher und Editorial
- Supabase mit PostgreSQL, Auth, Storage, Realtime und Edge Functions
- Cloudflare Workers AI für Bild-/Asset-Erzeugung
- Gemini und Anthropic für redaktionelle bzw. Content-Generierungsprozesse
- IONOS Cloud als erwogene Zielplattform für App-Hosting
- den Wunsch, Supabase möglichst beizubehalten

**Wichtig:** Diese Aufzählung beschreibt den dokumentierten Architekturstand bzw. Planungsstand. Sie bestätigt weder die konkrete produktive Konfiguration noch Datenstandorte, Vertragslage, Unterauftragnehmer oder tatsächliche Datenübermittlungen. Das muss durch eine technische und vertragliche Bestandsaufnahme verifiziert werden.

### 6.2 Grundregeln für Datenflüsse

- Schüleridentitäten und direkt zuordenbare Schülerdaten dürfen nicht ohne dokumentierte Freigabe und Rechtsprüfung an externe KI-Anbieter übertragen werden.
- KI-Workflows für redaktionelle Content-Erstellung sind von produktiven Schülerdaten getrennt zu halten.
- Für KI-Aufgaben sind bevorzugt synthetische, abstrahierte oder anonymisierte Beispieldaten zu verwenden.
- Prompts, Logs, Traces und Fehlerberichte sind ebenfalls auf unbeabsichtigte personenbezogene Daten zu prüfen.
- Datenübermittlungen an Dienstleister werden je Dienst mit Zweck, Datenkategorien, Region, Speicherdauer, Zugriffsmöglichkeiten und Vertragsstatus dokumentiert.
- Ein Anbietername allein genügt nicht: entscheidend sind das konkrete Produkt, der aktivierte Endpunkt, die Konfiguration und die vertraglichen Bedingungen.

### 6.3 Datenflussregister

Für jeden Datenfluss ist ein Registereintrag anzulegen:

| Feld | Inhalt |
|---|---|
| Flow-ID | Eindeutige Kennung |
| Quelle / Ziel | App, Datenbank, Dienst oder Empfänger |
| Datenkategorien | Tatsächlich übertragene Felder/Inhalte |
| Zweck | Fachlicher und technischer Zweck |
| Auslöser | Nutzeraktion, Hintergrundjob, API-Aufruf |
| Rechts-/Vertragsgrundlage | Noch zu dokumentieren |
| Region / Drittland | Tatsächlicher Verarbeitungsort |
| Speicherung | Dauer und Löschmechanismus |
| Zugriff | Rollen und Dienstleister |
| Nachweis | Codepfad, Konfiguration, Vertrag, Test |

## 7. Hosting, Anbieter und Unterauftragnehmer

Vor einem Schul-Pilot müssen mindestens folgende Punkte je Anbieter geklärt und dokumentiert sein:

- vollständige juristische Anbieteridentität,
- konkreter Dienst und aktivierte Funktionen,
- Verarbeitungsstandorte und mögliche Drittlandzugriffe,
- Unterauftragnehmer und deren Leistungen,
- Auftragsverarbeitungsvertrag bzw. passende Vertragsgrundlage,
- technische und organisatorische Maßnahmen,
- Verschlüsselung und Schlüsselverwaltung,
- Backup- und Löschverfahren,
- Supportzugriffe und administrative Zugriffswege,
- Incident- und Benachrichtigungsprozesse,
- Export- und Exit-Möglichkeiten.

### 7.1 Architekturentscheidung Hosting

IONOS Cloud ist als Ziel für App-Hosting erwogen; Supabase soll nach Möglichkeit bestehen bleiben. Daraus folgt noch keine bestätigte Datenresidenz oder vollständige Souveränität.

Vor einer Entscheidung sind mindestens diese Varianten technisch und rechtlich zu vergleichen:

1. App-Hosting bei IONOS plus Supabase als verwalteter Backend-Dienst.
2. App-Hosting und selbst betriebene Datenbank-/Backend-Komponenten in einer kontrollierten Infrastruktur.
3. Weitere vom Betreiber tatsächlich angebotene EU-/Deutschland-Optionen.

Entscheidungskriterien: Datenstandort, Unterauftragnehmer, Zugriff durch Support/Administratoren, AVV, Sicherheitsnachweise, Backup-Regionen, Verfügbarkeit, Exit-Fähigkeit, Betriebsaufwand und Kosten.

Es wird keine Hosting-Variante allein aufgrund einer Marketingaussage wie „EU-Hosting“ als freigegeben eingestuft.

## 8. KI-Governance

### 8.1 Grundsatz

KI ist ein unterstützendes Werkzeug für Content-Erstellung und Lernfunktionen. Der Einsatz darf nicht zu einer unkontrollierten Offenlegung von Schülerdaten oder zu intransparenten automatisierten Schülerbewertungen führen.

### 8.2 Verbindliche Leitplanken

- Keine Übermittlung von Klarnamen, Schüler-E-Mail-Adressen, internen Schüler-IDs, individuellen Lernverläufen oder direkt zuordenbaren Schülerdialogen an externe KI-Anbieter, solange kein gesonderter, geprüfter und freigegebener Verarbeitungspfad besteht.
- Keine Nutzung von Schülerdaten zum Training externer Modelle durch DR1FT.
- KI-Anbieter dürfen nicht eigenständig Zwecke oder Nutzungsrechte an Schülerdaten erhalten.
- Wo KI für dynamische Lernfunktionen eingesetzt wird, sind Datenminimierung, Pseudonymisierung, Prompt-Filterung und Output-Prüfung vorzusehen.
- Redaktionelle KI-Content-Erstellung und Laufzeit-KI mit Schülerinteraktion sind getrennte Verarbeitungsszenarien und müssen separat bewertet werden.
- KI-generierte Inhalte werden nicht automatisch zu veröffentlichten Lerninhalten.
- Es muss dokumentiert sein, welches Modell bzw. welcher Anbieter für welchen Zweck eingesetzt wird und welche Daten tatsächlich übertragen werden.

### 8.3 KI-Register

Für jeden KI-Anwendungsfall werden dokumentiert:

- Use-Case-ID und Produktfunktion,
- Anbieter, Modell und Endpunkt,
- Ein-/Ausgabedaten und mögliche personenbezogene Inhalte,
- Zweck und Nutzerkreis,
- Speicher-/Trainingsbedingungen,
- Region und Unterauftragnehmer,
- Filter-/Pseudonymisierungsmaßnahmen,
- menschliche Kontrolle,
- Risiko- und Freigabestatus.

## 9. Authentifizierung, Autorisierung und Mandantentrennung

Sicherheitsanforderungen:

- sichere Authentifizierung und Sitzungsverwaltung,
- angemessene Passwort- und Wiederherstellungsprozesse,
- MFA für privilegierte Verwaltungszugänge, soweit technisch und organisatorisch vorgesehen,
- serverseitige Rollen- und Scope-Prüfungen,
- Row Level Security (RLS) für alle relevanten mandantenbezogenen Tabellen,
- keine implizite Berechtigung allein durch Kenntnis einer UUID oder URL,
- Schutz von Service-Role-Schlüsseln und anderen Secrets,
- nachvollziehbarer Entzug von Berechtigungen bei Rollenwechsel, Deaktivierung oder Schulwechsel,
- Tests gegen schulübergreifenden Datenzugriff (Tenant Isolation).

### 9.1 Bekannte Prüfpunkte aus dem bisherigen Audit

Die bisherigen Code-/Schema-Prüfungen haben unter anderem folgende Risiken bzw. offene Punkte identifiziert:

- eine rollenblinde Unique-Index-Regel kann mehrere aktive Klassenmitgliedschaften von Lehrkräften verhindern;
- ein Backfill kann Lehrkraftzuweisungen auslassen, wenn er bereits aktive Mitgliedschaften rollenblind prüft;
- eine Funktion zur Ermittlung einer aktiven Klasse ist für den Player-Kontext gedacht und darf nicht als allgemeine Teacher-App-Auflösung verwendet werden;
- einzelne Teacher-Abfragen sollten die eigene User-ID explizit einschränken und nicht allein auf RLS vertrauen;
- Middleware und einzelne Server-/Edge-Pfade benötigen eine vollständige Rollen- und Schulzugehörigkeitsprüfung;
- `school_lead` ist eine Schulrolle und darf nicht als Klassenrolle behandelt werden, wenn das Datenbank-Enum diese Rolle nicht enthält.

Diese Punkte sind Prüfbefunde aus dem bisherigen Audit-Kontext und müssen am aktuellen Branch-/Produktionsstand erneut verifiziert werden. Sie sind nicht automatisch als vollständig behoben anzusehen.

## 10. Aufbewahrung, Löschung und Datenexport

Ein verbindliches Lösch- und Aufbewahrungskonzept ist vor dem Pilotbetrieb erforderlich. Pauschale Fristen werden in diesem Draft bewusst nicht festgelegt, weil sie von Zweck, Datenart, schulrechtlichen Vorgaben, Vertrag und Einsatzmodell abhängen.

Für jede Datenkategorie muss festgelegt werden:

- Beginn und Ende der Aufbewahrung,
- auslösendes Ereignis (z. B. Ende des Schuljahres, Austritt, Vertragsende),
- Verantwortlichkeit für die Auslösung,
- technische Löschung aus Primärsystemen,
- Umgang mit Replikaten, Caches, Suchindizes, Logs und Backups,
- Nachweis der Löschung,
- zulässige Ausnahmen und Sperrung statt Löschung, falls rechtlich erforderlich.

### 10.1 Erforderliche Lebenszyklusfälle

- Schüler verlässt eine Klasse.
- Schüler wechselt die Schule.
- Schülerkonto wird deaktiviert.
- Schule beendet den Vertrag.
- Lehrkraft verlässt die Schule oder verliert eine Klassenberechtigung.
- Schule fordert einen Datenexport oder eine Löschung an.
- DR1FT beendet einen Dienstleister oder migriert den Hosting-Anbieter.
- Backups laufen aus oder werden wiederhergestellt.

Historische Lern- und Klassenbezüge dürfen nicht versehentlich überschrieben werden. Historie darf aber auch nicht unbegrenzt aufbewahrt werden, nur weil sie technisch nützlich wäre. Der zulässige Zweck und die Frist sind gesondert festzulegen.

## 11. Transparenz und Betroffenenrechte

Es sind verständliche und zielgruppengerechte Informationen vorzubereiten für:

- Schüler,
- Eltern bzw. Erziehungsberechtigte,
- Lehrkräfte,
- Schulleitung und Schulverwaltung.

Die Informationen müssen – passend zum konkreten Einsatz – unter anderem Zwecke, Datenkategorien, Rechtsgrundlagen, Empfänger, Speicherfristen, Betroffenenrechte und Kontaktstellen erklären.

Es ist ein Prozess für Anfragen zu etablieren, insbesondere für Auskunft, Berichtigung, Löschung, Einschränkung und Widerspruch, soweit jeweils anwendbar. Die Schule und DR1FT müssen Zuständigkeiten, Identitätsprüfung, Fristen und technische Unterstützung abstimmen.

Einwilligung darf nicht pauschal als Standard-Rechtsgrundlage angenommen werden. Die konkrete Rechtsgrundlage ist für jeden schulischen Verarbeitungsvorgang im jeweiligen Bundesland und Einsatzmodell zu prüfen.

## 12. Datenschutz-Folgenabschätzung und Risikomanagement

Es ist zu prüfen und nachvollziehbar zu dokumentieren, ob eine Datenschutz-Folgenabschätzung (DSFA) nach Art. 35 DSGVO erforderlich ist. Die Prüfung darf nicht allein mit dem Hinweis auf Pseudonyme oder eine geringe Nutzerzahl verneint werden.

Zu bewerten sind insbesondere:

- Minderjährige als betroffene Personen,
- Umfang und Detailtiefe von Lern- und Verhaltensdaten,
- systematische Beobachtung bzw. Auswertung,
- Verknüpfung verschiedener Datenquellen,
- KI-gestützte Verarbeitung,
- mögliche Auswirkungen von Berichten und Kompetenzprofilen,
- Zahl der betroffenen Schulen und Schüler,
- Empfänger und internationale Datenflüsse.

Das Risikoregister führt je Risiko: Beschreibung, betroffene Daten/Systeme, Eintrittswahrscheinlichkeit, Schadensausmaß, Maßnahmen, Restrisiko, Verantwortliche und Status.

## 13. Informationssicherheit und technische Schutzmaßnahmen

Das TOM-Konzept wird mindestens folgende Bereiche abdecken:

1. Zutritts- und Zugangskontrolle für Betriebsumgebungen.
2. Authentifizierung und Berechtigungsmanagement.
3. Zugriffskontrolle und Mandantentrennung.
4. Verschlüsselung bei Übertragung und Speicherung, einschließlich Schlüsselmanagement.
5. Integrität, sichere Deployments und Schutz vor Manipulation.
6. Verfügbarkeit, Backup, Wiederherstellung und Notfallplanung.
7. Protokollierung und Überwachung mit Datenminimierung.
8. Schwachstellenmanagement, Dependency-Updates und Security-Tests.
9. sichere Entwicklungs- und Testumgebungen.
10. organisatorische Vertraulichkeit, Schulung und geregelte Supportzugriffe.
11. regelmäßige Überprüfung der Wirksamkeit der Maßnahmen.

Konkrete technische Implementierungen und Nachweise müssen je Maßnahme ergänzt werden. Eine Liste von Sicherheitsmaßnahmen ohne Wirksamkeitsnachweis genügt nicht.

## 14. Protokollierung und Monitoring

Logs sollen Sicherheits- und Betriebsprobleme erkennbar machen, aber keine unnötige zweite Sammlung von Schülerdaten bilden.

- Keine Passwörter, Tokens, Secrets oder vollständigen Auth-Credentials protokollieren.
- Schülertexte und Dialoginhalte nicht standardmäßig in Fehlerlogs oder Traces kopieren.
- Personenbeziehbare Logfelder minimieren oder pseudonymisieren.
- Zugriff auf Logs beschränken und Zugriffe selbst nachvollziehbar machen.
- Aufbewahrungsfristen für Logs separat festlegen.
- Monitoring-Daten nicht ohne Zweckprüfung für pädagogische Schülerauswertungen verwenden.

## 15. Datenschutzvorfälle und Incident Management

Es wird ein dokumentierter Ablauf für Sicherheits- und Datenschutzvorfälle eingerichtet:

1. Erkennen und Melden.
2. Einstufen und dokumentieren.
3. Sofortmaßnahmen zur Begrenzung.
4. Beweissicherung und technische Analyse.
5. Information der zuständigen Verantwortlichen.
6. Unterstützung der Schule bei ihrer rechtlichen Bewertung und etwaigen Meldepflichten.
7. Abhilfe und Wiederherstellung.
8. Nachbereitung und Prävention.

Der Prozess muss klare interne Kontaktwege, Erreichbarkeit, Zuständigkeiten und einen Zeitstempel für jeden Schritt enthalten. Die rechtliche Bewertung und Meldung an Aufsichtsbehörden bzw. Betroffene erfolgt durch die jeweils verantwortliche Stelle nach den anwendbaren Vorgaben; DR1FT muss hierfür vertraglich und organisatorisch rechtzeitig unterstützen können.

## 16. Schuljahreswechsel, Klassenlisten und Berechtigungsänderungen

Der separate Architekturstrang **DR1FT – Schuljahre, Klassenfortschreibung und Lehrkräfteverwaltung** ist mit diesem Compliance-Strang verbunden.

Datenschutzanforderungen:

- Historische Klasseninstanzen bleiben nachvollziehbar; keine stillschweigende Überschreibung.
- Schülerzuordnungen werden nur durch berechtigte Schulrollen finalisiert.
- Lehrkräfte erhalten nur Zugriff auf ausdrücklich zugewiesene Klassen.
- Eine Klassenlistenprüfung durch Lehrkräfte wird mit Klasse, Schuljahr, prüfender Lehrkraft, Zeitstempel und Listen-Version dokumentiert.
- Änderungen an der Liste nach einer Bestätigung lösen eine erneute Prüfung aus.
- Entfernte Lehrkräfte verlieren den Zugriff und offene Aufgaben im betreffenden Klassen-Scope.
- Schuljahreswechsel dürfen keine Social-/Runtime-Daten unkontrolliert in neue Klassen kopieren.
- Die Aufbewahrung historischer Lernstände ist separat zu begründen und zu befristen.

## 17. Landes- und schulformspezifische Konfiguration

Die technische Plattform soll eine gemeinsame Basis besitzen. Schulrechtliche Vorgaben dürfen nicht als eine bundesweit einheitliche Regel angenommen werden.

### 17.1 NRW als erste Referenz

Für NRW ist ein eigenes Prüf- und Dokumentationspaket vorzubereiten. Dazu gehören insbesondere die Prüfung des Schulgesetzes NRW, der einschlägigen schuldatenschutzrechtlichen Vorschriften (u. a. VO-DV I und VO-DV II), der Vorgaben der zuständigen Datenschutzaufsicht sowie der konkreten Vorgaben des Schulträgers bzw. der Schule.

### 17.2 Bundesweite Erweiterung

Für jedes weitere Bundesland ist ein eigener Rechts- und Organisationsabgleich vorzunehmen. Die technische Konfiguration soll mindestens Bundesland, Schulform, Bildungsgang/Jahrgangsstruktur und schulindividuelle Abweichungen abbilden können.

**Wichtig:** Die Konfiguration von Schulform und Bundesland ersetzt keine rechtliche Prüfung. Sie dient der korrekten Abbildung von Schulorganisation und Workflows, nicht der automatischen Bestimmung einer Rechtsgrundlage.

## 18. Erforderliche Compliance-Artefakte

Vor einem kontrollierten Schul-Pilot sollen mindestens folgende Artefakte vorliegen:

| ID | Artefakt | Zweck | Status |
|---|---|---|---|
| C-01 | Dateninventar und Datenklassifizierung | vollständige Übersicht der verarbeiteten Daten | offen |
| C-02 | Verzeichnis der Verarbeitungstätigkeiten / Zuarbeit | strukturierte Beschreibung der Verarbeitung | offen |
| C-03 | Datenflussregister | interne und externe Datenflüsse | offen |
| C-04 | Rollen- und Berechtigungsmatrix | nachvollziehbare Zugriffskontrolle | teilweise konzeptionell |
| C-05 | Mandantentrennungs- und RLS-Testnachweise | Schutz zwischen Schulen | offen |
| C-06 | Lösch- und Aufbewahrungskonzept | kontrollierter Datenlebenszyklus | offen |
| C-07 | AVV und Unterauftragnehmerliste | vertragliche Auftragsverarbeitung | offen |
| C-08 | TOM-Dokumentation | technische und organisatorische Maßnahmen | offen |
| C-09 | KI-System- und Use-Case-Register | Transparenz über KI-Verarbeitung | offen |
| C-10 | DSFA-Screening und ggf. DSFA | Bewertung hoher Risiken | offen |
| C-11 | Informations- und Datenschutzhinweise | Transparenz gegenüber Betroffenen | offen |
| C-12 | Betroffenenrechte-Prozess | Bearbeitung von Anfragen | offen |
| C-13 | Incident-Response-Plan | Umgang mit Vorfällen | offen |
| C-14 | Backup-, Restore- und Exit-Konzept | Verfügbarkeit und Anbieterwechsel | offen |
| C-15 | NRW-Prüfpaket | landesspezifische Einsatzprüfung | offen |
| C-16 | Bundesland-Erweiterungsmatrix | Übertragbarkeit auf weitere Länder | offen |

## 19. Umsetzungsplan

### Phase 0 – Ist-Aufnahme und Scope

- Repository, produktive Infrastruktur und Supabase-Konfiguration inventarisieren.
- tatsächliche Tabellen, Felder, RLS-Policies, RPCs und Edge Functions erfassen.
- alle Apps, Anbieter, KI-Endpunkte, Logs, Backups und Datenstandorte erfassen.
- Datenflüsse anhand von Code und Konfiguration nachweisen.
- offene Audit-Feststellungen aktualisieren.

**Ergebnis:** belastbare Ist-Architektur und priorisiertes Risikoregister.

### Phase 1 – Kritische technische Grundlagen

- Schülerdatenminimierung und Pseudonymisierung prüfen.
- Rollen- und Berechtigungspfade konsistent umsetzen.
- RLS und Mandantentrennung systematisch testen.
- privilegierte Zugänge und Secrets absichern.
- KI-Datenpfade technisch trennen und Datenabfluss verhindern.
- Logging und Monitoring datensparsam konfigurieren.

**Ergebnis:** dokumentierte technische Baseline mit Tests und Nachweisen.

### Phase 2 – Governance und Betriebsprozesse

- Dateninventar und Datenflussregister vervollständigen.
- Lösch- und Aufbewahrungsregeln beschließen und technisch abbilden.
- Incident-Response-, Betroffenenrechte- und Supportprozesse etablieren.
- TOMs und Anbieter-/Unterauftragnehmerregister erstellen.
- Backup-, Restore- und Exit-Verfahren testen.

**Ergebnis:** betriebsfähiges Datenschutz- und Sicherheitsmanagement.

### Phase 3 – NRW-Pilotvorbereitung

- NRW-rechtliche Prüfung mit qualifizierter Datenschutz-/Schulrechtsberatung.
- AVV und weitere erforderliche Vertragsunterlagen abstimmen.
- DSFA-Screening durchführen und ggf. DSFA erstellen.
- Datenschutzhinweise und schulische Informationsmaterialien erstellen.
- Pilotfreigabe mit Schule, Schulträger und zuständigen Datenschutzverantwortlichen abstimmen.

**Ergebnis:** vollständiges Prüf- und Entscheidungspaket für einen konkreten NRW-Piloten.

### Phase 4 – Bundesweite Erweiterung

- Anforderungen weiterer Länder systematisch erfassen.
- Unterschiede in Schulrecht, Schulorganisation und Genehmigungswegen dokumentieren.
- landesspezifische Pakete und Konfigurationen pflegen.
- zentrale technische Baseline unverändert halten, soweit keine begründete Anpassung erforderlich ist.

**Ergebnis:** wiederverwendbarer Länder-Erweiterungsprozess.

## 20. Definition of Done – Datenschutz- und Sicherheitsbaseline

Ein Bereich gilt nicht allein deshalb als abgeschlossen, weil ein Konzeptdokument existiert. Er gilt erst als umgesetzt, wenn:

- die Anforderung eindeutig beschrieben ist,
- die verantwortliche Komponente und Person benannt sind,
- die technische/organisatorische Umsetzung dokumentiert ist,
- relevante Tests oder Prüfungen durchgeführt wurden,
- die Ergebnisse nachvollziehbar abgelegt sind,
- offene Restrisiken akzeptiert oder Maßnahmen terminiert wurden.

Ein NRW-Pilot darf erst als „Compliance-vorbereitet“ bezeichnet werden, wenn die für den konkreten Einsatz erforderlichen technischen, vertraglichen und organisatorischen Prüfungen abgeschlossen und durch die zuständigen Stellen bewertet wurden. Eine allgemeine bundesweite Einsatzfreigabe wird daraus nicht abgeleitet.

## 21. Offene Entscheidungen und benötigte Nachweise

Folgende Punkte sind derzeit ausdrücklich nicht abschließend geklärt:

1. Wer ist die betreibende juristische Person und wer schließt Verträge mit Schulen?
2. Welche konkrete IONOS-Cloud-Architektur wird eingesetzt?
3. Welche Supabase-Organisation, Region, Vertragsstufe und Unterauftragnehmer sind tatsächlich aktiv?
4. Welche produktiven Daten werden an Cloudflare, Gemini, Anthropic oder andere KI-/Drittdienste übertragen?
5. Welche Daten liegen in Logs, Analytics, Backups, Supportsystemen und Fehlertracking?
6. Welche Tabellen enthalten personenbezogene oder pseudonymisierte Schülerdaten und wie vollständig ist RLS?
7. Welche Aufbewahrungsfristen gelten je Datenkategorie und Schul-/Vertragsende?
8. Welche Rechtsgrundlage gilt je Verarbeitung im konkreten NRW-Schulmodell?
9. Ist eine DSFA erforderlich und wer führt sie mit welchen Beteiligten durch?
10. Welche Nachweise und Vertragsunterlagen verlangen die konkreten Pilot-Schulen bzw. Schulträger?

Diese Fragen werden nicht durch Annahmen geschlossen. Sie benötigen technische, vertragliche oder rechtliche Nachweise.

## 22. Quellen- und Prüfgrundlage

Die rechtliche Prüfung muss sich auf die zum Zeitpunkt des konkreten Schuleinsatzes geltenden Fassungen und Zuständigkeiten stützen. Als Ausgangspunkte für die weitere Prüfung dienen insbesondere:

- Datenschutz-Grundverordnung (DSGVO), insbesondere Grundsätze, Rechtsgrundlagen, Auftragsverarbeitung, Sicherheit, Datenschutz-Folgenabschätzung und Datenschutzverletzungen.
- Schulgesetz NRW, insbesondere die schuldatenschutzrechtlichen Vorschriften in §§ 120 ff.
- VO-DV I und VO-DV II NRW in der jeweils geltenden Fassung.
- Veröffentlichungen und Orientierungshilfen der zuständigen Datenschutzaufsichtsbehörden sowie der Datenschutzkonferenz.
- Konkrete Vorgaben des Schulträgers und der jeweiligen Schule.

Offizielle Einstiegsquellen (vor einer rechtlichen Bewertung auf Aktualität und Anwendbarkeit prüfen):

- DSGVO: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- Schulgesetz NRW: https://recht.nrw.de/
- Ministerium für Schule und Bildung NRW: https://www.schulministerium.nrw/
- Landesbeauftragte für Datenschutz und Informationsfreiheit NRW: https://www.ldi.nrw.de/
- Datenschutzkonferenz: https://www.datenschutzkonferenz-online.de/

---

## Änderungsprotokoll

- **v0.1:** Erster Arbeitsdraft aus DR1FT-Grundprinzipien, vorhandenen Architekturunterlagen, aktuellem Rollen-/Schuljahreskonzept und bisherigen Audit-Feststellungen erstellt. Noch keine rechtliche oder technische Freigabe.
