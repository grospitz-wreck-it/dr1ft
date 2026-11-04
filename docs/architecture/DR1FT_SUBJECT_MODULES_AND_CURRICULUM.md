# DR1FT – Fachmodule und Curriculum-Schicht

Status: Architekturentscheidung / Implementierungsgrundlage v1.0  
Branch: `feature/school-year-and-staff-management`

## Ziel

DR1FT soll mehrere Unterrichtsfächer und Lernbereiche unterstützen, ohne für jedes Fach eine eigene App, einen eigenen Player oder eine eigene Lern-Engine zu benötigen.

Dafür werden drei Ebenen getrennt:

1. **Plattformkern:** Schulen, Schuljahre, Klassen, Unterrichtsgruppen, Nutzer, Berechtigungen und Lernhistorie.
2. **Fach- und Curriculum-Schicht:** Fachbereiche, Lernmodule, Lernziele, Kompetenzbezüge und optionale Lehrplanreferenzen.
3. **Lerninhalte und Ausführung:** Szenarien, Missionen, Content-Items, Lernkarten, Interaktionen, Reflexion und Evidenz.

Die vorhandene Lern-Engine bleibt fachneutral. Fachmodule konfigurieren und bündeln Lerninhalte; sie implementieren keine eigene Engine.

## Bestand: bereits vorhandene DR1FT-Bausteine

Die bestehende Implementierung bringt wesentliche Teile bereits mit:

- `scenarios` bündeln ein Thema und altersbezogene Varianten.
- `missions` strukturieren Lernaufgaben innerhalb eines Szenarios.
- `content_items` enthalten Feed- und Lerninhalte.
- `competencies` bilden übergreifende Kompetenzen ab.
- `scenarios.primary_competency_id` und `secondary_competency_ids` bilden bereits Kompetenzbezüge eines Szenarios ab.
- Der Learning-Design-Vertrag enthält Lernziele, Bloom-Stufen, Framework-Mappings, Lernschritte, Aktivitäten und Evidenzindikatoren.
- Szenarien besitzen eigenständige Lernkarten.

Diese Elemente werden nicht durch parallele Fach-Tabellen ersetzt. Insbesondere sind Szenario, Mission und Fachmodul unterschiedliche Dinge: Ein Fachmodul ist eine kuratierte fachliche Lerneinheit bzw. ein wiederverwendbares Lernangebot; ein Szenario ist eine konkrete simulierte Situation; eine Mission ist ein strukturierter Lernauftrag innerhalb eines Szenarios.

## Fachmodule

Ein Fachmodul ist die redaktionell verantwortete Einheit, die Lernangebote fachlich einordnet und für Unterricht nutzbar macht.

Beispiele (illustrativ, keine abschließende Fachliste):

- Medienbildung / Medienkunde
- Deutsch
- Politik / Gesellschaft
- Informatik
- Wirtschaft
- Religion / Ethik
- Biologie

Fächer dürfen nicht als festes Enum in der Datenbank oder im Anwendungscode hinterlegt werden. Schulen, Länder und spätere Produktvarianten müssen eigene Fach- und Lernbereichskataloge ergänzen können.

### Modul-Metadaten

Ein Fachmodul benötigt konzeptionell:

- stabile ID und stabilen Schlüssel
- Titel, Kurzbeschreibung und ausführliche Beschreibung
- einen oder mehrere Fachbereiche / Lernbereiche
- Zielgruppen: Jahrgangs- oder Altersbänder und optional Schulform/Bildungsgang
- Sprache und Veröffentlichungsstatus
- verantwortliche Redaktion bzw. fachliche Verantwortlichkeit
- Versionsnummer und Änderungsverlauf
- optionale Voraussetzungen und empfohlene Dauer
- optionale Lehrplan- und Curriculumreferenzen
- Verknüpfungen zu Lernzielen, Kompetenzen, Szenarien und Missionen

Ein Modul kann mehrere Szenarien enthalten. Ein Szenario kann in mehreren Modulen wiederverwendet werden, sofern die fachlichen Lernziele und die Zielgruppe passen. Die Zuordnung ist explizit; sie darf nicht aus einem Titel, Slug oder Szenario-Text abgeleitet werden.

## Lernziele und Kompetenzen

Lernziele beschreiben, was Lernende nach einer Einheit wissen, können, reflektieren oder transferieren sollen. Kompetenzen sind übergreifende Fähigkeiten, die über mehrere Lerngelegenheiten hinweg entwickelt und durch mehrere Evidenzen sichtbar werden können.

Daher gilt:

- Lernziele sind nicht mit Kompetenzen gleichzusetzen.
- Ein Lernziel kann auf mehrere Kompetenzen einzahlen.
- Eine Kompetenz kann durch Lernziele in mehreren Fächern gefördert werden.
- Ein Modul kann mehrere Lernziele enthalten.
- Szenarien und Missionen liefern konkrete Lerngelegenheiten und Evidenzen.
- Ein Missionsabschluss oder einzelner Klick ist für sich allein kein Kompetenznachweis.
- Bestehende Kompetenz-Evidenz- und Ergebnislogik bleibt die zentrale Auswertungsgrundlage.

Die bereits vorhandenen `GeneratedLearningObjective`- und `GeneratedFrameworkMapping`-Verträge werden weiterverwendet. Bei einer späteren Persistierung sind stabile IDs und Versionen erforderlich; generierte Codes allein sind keine dauerhaften Datenbank-IDs.

## Lehrplan- und Curriculumreferenzen

Curriculumreferenzen bilden die nachvollziehbare Verbindung zwischen DR1FT-Lernzielen und externen Rahmenwerken oder Lehrplänen.

Eine Referenz soll mindestens enthalten:

- Framework / Herausgeber (z. B. Landeslehrplan, KMK oder ein fachliches Rahmenwerk)
- Bundesland bzw. Geltungsbereich, sofern relevant
- Schulform/Bildungsgang und Fachbereich, sofern relevant
- Version bzw. Veröffentlichungsstand
- stabile Referenz-ID oder Kapitel-/Kompetenzbereichsschlüssel
- Bezeichnung und kurze Beschreibung
- offizielle Quell-URL und Abruf-/Prüfdatum
- Status der fachlichen Prüfung

Eine Zuordnung benötigt zusätzlich eine Begründung und eine Aussage dazu, auf welches DR1FT-Lernziel sie sich bezieht.

**Wichtig:** Eine Mapping-Zuordnung ist zunächst eine redaktionell/fachlich dokumentierte Orientierung. Sie darf nicht als amtliche Anerkennung, Vollständigkeitsnachweis oder automatische Lehrplankonformität dargestellt werden. Lehrplanversionen müssen nebeneinander bestehen können; Aktualisierungen dürfen historische Modulversionen nicht stillschweigend verändern.

## Zuordnung zum Unterricht

Die Zuweisung eines Fachmoduls erfolgt an eine Unterrichtsgruppe, nicht pauschal an eine organisatorische Klasse.

- Eine Unterrichtsgruppe kann ein oder mehrere Fachmodule nutzen.
- Eine Lehrkraft erhält Zugriff über ihre explizite Unterrichtsgruppen-Zuweisung und die dafür vergebenen Rechte.
- Eine Unterrichtsgruppe kann mehrere Klassen oder ausgewählte Schüler umfassen.
- Ein Modulzugriff verleiht keine zusätzlichen Klassenrechte und keine schulweiten Verwaltungsrechte.
- Schuljahr, Unterrichtsgruppe und Modulversion werden bei einer konkreten Durchführung festgehalten.
- Wird ein Modul später aktualisiert, verändert dies nicht rückwirkend bereits begonnene oder abgeschlossene Lernverläufe.

Die bestehende Trennung von Klasseninstanz, Unterrichtsgruppe und Lehrkraftzuweisung bleibt maßgeblich.

## Laufzeit- und Ergebnisfluss

1. Redaktion erstellt oder pflegt ein Fachmodul.
2. Das Modul wird mit Lernzielen, Kompetenzen und optionalen Curriculumreferenzen versehen.
3. Redaktion ordnet passende Szenarien und deren Missionen dem Modul zu.
4. Lehrkraft wählt das Modul für eine berechtigte Unterrichtsgruppe und eine konkrete Version aus.
5. Die vorhandene Lern-Engine führt Szenarien, Missionen, Lernkarten und Interaktionen aus.
6. Die bestehende Ergebnis- und Evidenzlogik speichert Lernaktivitäten im jeweiligen Schüler-/Klassen-/Unterrichtsgruppen-Kontext.
7. Berichte können fachmodulbezogen aufbereitet werden, greifen aber auf dieselben zentralen Evidenzen zurück.

Es wird keine zweite Lernfortschritts- oder Kompetenzbewertung pro Fach eingeführt. Fachliche Berichte sind gefilterte Sichten auf gemeinsame Evidenzen, keine voneinander unabhängigen Punktesysteme.

## Zielmodell – konzeptionell, noch keine Datenbankmigration

Die folgenden Entitäten beschreiben die Zielarchitektur. Sie sind nicht als bereits vorhandene Tabellen zu verstehen.

### `subject_areas`

Konfigurierbarer Katalog von Fächern und Lernbereichen:

- `id`
- `key` (stabil, nicht aus dem Titel abgeleitet)
- `label`
- `parent_id` (optionale Hierarchie)
- `description`
- `status`

Der Katalog muss erweiterbar sein. Fachbereiche können hierarchisch organisiert werden; keine globale Enum-Liste.

### `learning_modules`

- `id`
- `key`
- `title`, `summary`, `description`
- `version`
- `status` (draft, in_review, approved, published, archived)
- `language`
- `target_age_bands` (flexibel)
- `school_forms` / `educational_pathways` (optional, konfigurierbar)
- `estimated_minutes`
- `created_at`, `updated_at`

### `learning_module_subject_areas`

Verknüpft ein Modul mit einem oder mehreren Fach-/Lernbereichen.

### `learning_objectives`

Persistente, versionierbare Lernziele mit stabilem Schlüssel, Beschreibung, Zieltyp, Bloom-Stufe und Status. Die bereits vorhandenen Learning-Design-JSON-Verträge bleiben die Generierungs-/Austauschform; eine normalisierte Persistierung wird erst nach Bestandsprüfung eingeführt.

### `learning_module_objectives`

Verknüpft Fachmodule und Lernziele inklusive Priorität und optionaler didaktischer Notiz.

### `curriculum_frameworks` und `curriculum_references`

Versionierte externe Rahmenwerke und konkrete Referenzstellen. Ein Framework kann viele Referenzen enthalten; eine Referenz kann in mehreren Modulen verwendet werden.

### `learning_objective_curriculum_mappings`

Verknüpft ein DR1FT-Lernziel mit einer konkreten Curriculumreferenz, inklusive Begründung, Prüfstatus und Version.

### `learning_module_scenarios`

Explizite Zuordnung von Fachmodul zu Szenario, inklusive Reihenfolge, Pflicht/Optional und didaktischer Rolle. Diese Relation ermöglicht Wiederverwendung ohne Szenario-Duplikate.

### `teaching_group_module_assignments`

Ordnet einer Unterrichtsgruppe ein Fachmodul und eine konkrete Modulversion zu. Enthält Status, zuweisende Person und Zeitstempel. Die Berechtigungsprüfung erfolgt weiterhin serverseitig über Schule, Schuljahr, Unterrichtsgruppe und Lehrkraftzuweisung.

## Versionierung und Historie

- Veröffentliche Modulversionen sind unveränderlich; Änderungen erzeugen eine neue Version.
- Curriculumreferenzen speichern den verwendeten Veröffentlichungsstand.
- Modulzuweisungen referenzieren eine konkrete Version.
- Laufende Lernverläufe bleiben mit der gestarteten Version verbunden.
- Archivierung entfernt keine historischen Zuordnungen oder Evidenzen.
- Korrekturen an Curriculum-Mappings dürfen alte Berichte nicht unbemerkt umdeuten.

## Nicht-Ziele für die erste Umsetzung

- Keine eigene App je Fach.
- Keine fachabhängigen Kopien des Players oder der Lern-Engine.
- Keine globale, fest codierte Fächer- oder Jahrgangsliste.
- Keine automatische Behauptung von Lehrplankonformität.
- Keine parallelen Kompetenzscores pro Fach.
- Keine automatische Freigabe externer KI-Verarbeitung von Schülerdaten.
- Keine Datenbankmigration, bevor bestehende Schema-, RLS- und Migrationskonventionen geprüft wurden.

## Umsetzung in kleinen Schritten

1. **Jetzt:** Fachmodul-Vertrag als Shared Types und Architektur dokumentieren; bestehende Learning-Design-Typen referenzieren statt duplizieren.
2. Bestehende Content-, Scenario-, Mission-, Kompetenz- und Learning-Design-Persistenz vollständig inventarisieren.
3. Datenmodell und RLS für Fachkatalog, Modulversionen und Zuordnungen anhand des realen Remote-Schemas entwerfen.
4. Migrationen mit Backfill-/Rollback-Plan und Tests erstellen; vor Anwendung Remote-Migrationshistorie und Live-Schema abgleichen.
5. Editorial: Fachbereiche, Modul-Metadaten, Lernziele und Curriculum-Mappings pflegen.
6. Unterricht: Module Unterrichtsgruppen zuweisen und konkrete Version starten.
7. Teacher-Reports um fachmodulbezogene Filter ergänzen, ohne neue Bewertungslogik einzuführen.

## Abnahmekriterien

- Ein Modul kann mehrere Szenarien und Missionen enthalten.
- Ein Szenario kann in mehreren passenden Modulen wiederverwendet werden.
- Ein Modul kann mehrere Fachbereiche und Lernziele haben.
- Lernziele können auf mehrere Kompetenzen und versionierte Curriculumreferenzen verweisen.
- Lehrplanstände sind nachvollziehbar und historisch stabil.
- Module werden Unterrichtsgruppen und konkreten Versionen zugewiesen.
- Eine Lehrkraft sieht nur Module und Lernende innerhalb ihrer berechtigten Unterrichtsgruppen.
- Fachbezogene Auswertungen nutzen dieselben Evidenzen wie die allgemeinen DR1FT-Auswertungen.
- Bestehende Szenarien, Missionen und Lernverläufe bleiben ohne Zwangsmigration funktionsfähig.
