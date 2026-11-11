# DR1FT – Review der 50 Repository-Migrationen ohne gleichnamigen Ledger-Eintrag

**Auditdatum:** 2026-11-11  
**Branch:** `fix/scenario-assessment-v2`  
**Supabase-Projekt:** `oegshknzeqmjmkraxozr`  
**Methode:** GitHub-Quellenprüfung und ausschließlich lesende Katalog-/Datenbankabfragen  
**Änderungen an Supabase:** keine

## Ergebnis in Kürze

Die 50 Dateien sind **keine Liste von 50 ausstehenden Migrationen**. Die Live-Datenbank enthält die Auswirkungen der meisten historischen Migrationen bereits. In mehreren Fällen sind Funktionen oder Policies später verändert und damit die ursprünglichen Implementierungen überholt worden.

| Befund | Anzahl |
|---|---:|
| Wirkung in der Live-Datenbank vorhanden / aktuell repräsentiert (einschließlich nachträglich ergänzter Realtime- und Index-Effekte) | 36 |
| Durch spätere Architektur oder Migration ersetzt | 9 |
| Historischer Daten-Backfill ohne aktuell beobachtbare Wirkung; Ausführung nicht beweisbar | 1 |
| Scenario Assessment V2: SQL-Effekt vorhanden, Ledgerregistrierung ausstehend | 4 |
| **Gesamt** | **50** |

„Wirkung vorhanden“ bedeutet ausdrücklich nicht, dass die jeweilige Datei unter ihrer lokalen Versionsnummer ausgeführt wurde. Ohne Ledger-Eintrag lässt sich der historische Ausführungsweg nicht beweisen. Die Aussagen beziehen sich auf den aktuell beobachteten Datenbankzustand.

## Einzelprüfung

| # | Repository-Datei | Befund | Live-Evidenz / Einordnung |
|---:|---|---|---|
| 1 | `0056_ambient_generator_assets.sql` | **Wirkung vorhanden** | Tabelle `ambient_generation_profiles` vorhanden (5 Datensätze); Bucket `ambient-assets` sowie Lese-/Upload-/Delete-Policies vorhanden. |
| 2 | `20260926210000_scenario_studio.sql` | **Wirkung vorhanden** | `scenarios.scenario_group`, `age_band` und die beiden zugehörigen Indizes vorhanden. |
| 3 | `20260930100000_fix_join_class_as_student_instance_scope.sql` | **Ersetzt** | Join-RPC vorhanden, aber die aktuelle Implementierung ist die spätere, gehärtete Variante; Remote-Ledger enthält dafür die manuell umregistrierte Migration `20261106105509`. Nicht erneut ausführen. |
| 4 | `20260930120000_student_comments_instance_scope.sql` | **Ersetzt** | Die alte Comment-Policy ist nicht mehr aktiv. Stattdessen besteht `students create own instance comments`; die spätere Policy-Änderung ist im Ledger unter `20261106105456` registriert. |
| 5 | `20260930130000_enforce_one_active_class_module.sql` | **Ersetzt** | Alte Triggerfunktion, Trigger und Unique-Index für „genau ein Modul je Klasse“ fehlen. Die aktuelle Assignment-Struktur unterstützt Aktivierung/Deaktivierung und Archivierung; die alte Löschlogik wäre fachlich riskant. |
| 6 | `20260930130000_teacher_workspace_hardening.sql` | **Wirkung vorhanden, später erweitert** | `teacher_reports` existiert mit RLS. Die ursprüngliche Lehrer-Policy ist durch die spätere rollen-/berichtsumfangsbezogene Policy ersetzt. |
| 7 | `20260930150000_teacher_class_management.sql` | **Ersetzt** | `upsert_class_instance_scenario_assignment` existiert, hat aktuell aber einen anderen Rückgabetyp und eine spätere Implementierung. Nicht mit der alten Void-/Ersetzungslogik replayen. |
| 8 | `20260930170000_restore_school_administration.sql` | **Wirkung vorhanden, später erweitert** | `school_memberships`, `is_school_admin_of`, `get_school_member_directory` und zugehörige Schulzugriffs-Policies vorhanden. |
| 9 | `20261001170000_reconcile_class_instance_runtime.sql` | **Ersetzt / teilweise umbenannt** | Der NPC-Konversations-Unique-Index ist als `idx_user_npc_conversations_instance_unique` vorhanden. Der alte Ein-Modul-pro-Klasse-Index fehlt; die Assignment-Logik wurde später auf den aktuellen Status-/Archivierungsansatz umgestellt. |
| 10 | `20261005090000_allow_school_admin_school_updates.sql` | **Ersetzt** | Die alte School-Admin-Update-Policy ist durch `school managers update own school` mit `can_manage_school` ersetzt. |
| 11 | `20261005100000_class_instance_status_and_images.sql` | **Wirkung vorhanden** | Status-, Bild- und Visual-Felder der Klasseninstanzen, Bucket `class-images`, `can_manage_class_image` und die vier Storage-Policies vorhanden. |
| 12 | `20261006070000_player_activity_realtime.sql` | **Wirkung vorhanden, nachträglich ergänzt** | `content_items` und `user_interactions` sind Mitglieder von `supabase_realtime`; die Ergänzung wurde mit `20261111184418` angewendet und registriert. |
| 13 | `20261009100000_teacher_competency_evidence.sql` | **Wirkung vorhanden, später gehärtet** | `get_class_student_competency_evidence` existiert; die aktuelle Berechtigungsprüfung verwendet `can_view_class_individual_reports`. |
| 14 | `20261012120000_school_admin_class_visibility.sql` | **Wirkung vorhanden** | Schuladmin-Policies für Klasseninstanzen, Klassenmitgliedschaften und Profile in den eigenen Klassen vorhanden. |
| 15 | `20261015090000_student_direct_messages.sql` | **Wirkung vorhanden** | Tabelle, Indizes, RLS, Nachrichten-Policies und RPC zum Markieren als gelesen vorhanden; aktuell 17 Nachrichten. |
| 16 | `20261015091500_secure_student_direct_messages.sql` | **Wirkung vorhanden, später nachgebessert** | Aktuelle Policies begrenzen Lesen und Senden auf die eigene aktive Klassenmitgliedschaft und aktive Mitschüler. |
| 17 | `20261027180000_learning_results_foundation.sql` | **Wirkung vorhanden** | `mission_content_items` und `learning_result_events` samt Indizes und RLS vorhanden. |
| 18 | `20261027190000_harden_learning_result_event_writes.sql` | **Wirkung vorhanden** | Direkte Insert-Policy für Lernereignisse fehlt; authentifizierte Clients besitzen kein direktes INSERT-Recht. |
| 19 | `20261027200000_restrict_learning_results_table_grants.sql` | **Wirkung vorhanden** | `learning_result_events`: authenticated SELECT, kein INSERT/UPDATE/DELETE. `mission_content_items`: keine direkten Browser-Tabellenrechte. |
| 20 | `20261027210000_secure_comparison_assessment.sql` | **Durch Folgemigration ersetzt** | Comparison-RPC vorhanden; die finale Implementierung stammt aus der nachfolgenden Migration zum Verbergen der erwarteten Antwort. |
| 21 | `20261027220000_hide_expected_comparison_answer.sql` | **Wirkung vorhanden** | Finale `record_comparison_assessment`-RPC vorhanden, authenticated ausführbar, anon nicht ausführbar. |
| 22 | `20261028120000_repair_student_direct_message_security.sql` | **Wirkung vorhanden** | Finale Direktnachrichten-Policies und `mark_student_direct_messages_read` vorhanden. |
| 23 | `20261028210000_dr1ft_iab_interest_taxonomy.sql` | **Wirkung vorhanden** | `ambient_interest_iab_categories`, RLS, Index und 122 Mapping-Datensätze vorhanden. |
| 24 | `20261028213000_dr1ft_interest_hierarchy_extensions.sql` | **Wirkung vorhanden** | `ambient_interests.parent_key` vorhanden; aktuell 115 Interessen-Datensätze. |
| 25 | `20261029100000_ambient_density.sql` | **Wirkung vorhanden** | `scenarios.ambient_density` vorhanden. |
| 26 | `20261029170000_mission_scheduler_reporting.sql` | **Wirkung vorhanden** | `scheduled_start_at` und `scheduled_end_at` an Klassen-Szenario-Zuweisungen vorhanden. |
| 27 | `20261029180000_include_historical_missions_in_reporting.sql` | **Wirkung vorhanden** | `get_class_student_mission_progress` vorhanden und authenticated ausführbar. |
| 28 | `20261029190000_enforce_mission_schedule_runtime.sql` | **Wirkung vorhanden** | Trigger `trg_evaluate_missions_after_interaction`, Funktion `evaluate_missions_after_interaction` und die zeitfensterbezogene Lese-Policy für Mission-Content vorhanden. |
| 29 | `20261029200000_backfill_legacy_mission_completions.sql` | **Keine Wirkung beobachtbar** | Aktuell 0 Zeilen in `user_mission_progress`, 0 unscoped completed rows und 0 `MissionCompleted`-Domain-Events. Ob die Migration früher ausgeführt wurde, ist nicht beweisbar; derzeit gibt es keine Daten, an denen sich ein Backfill-Effekt erkennen ließe. |
| 30 | `20261029210000_mission_thumbnail_url.sql` | **Wirkung vorhanden** | `missions.thumbnail_url` vorhanden. |
| 31 | `20261029220000_scenario_cover_image.sql` | **Wirkung vorhanden** | `scenarios.cover_image_url` vorhanden. |
| 32 | `20261030123000_archive_class_instance_scenario_assignments.sql` | **Wirkung vorhanden** | `archived_at` und Index `idx_class_instance_scenario_assignments_active` vorhanden. |
| 33 | `20261030150000_add_active_state_to_class_module_assignments.sql` | **Wirkung vorhanden, nachträglich ergänzt** | `is_active`, `archived_at` und `idx_class_instance_scenario_assignments_active_state` sind vorhanden; der fehlende Index wurde mit `20261111184418` ergänzt. |
| 34 | `20261031153000_teacher_learning_evidence_reporting_v1.sql` | **Wirkung vorhanden, später gehärtet** | `get_class_student_learning_evidence_v1` vorhanden; die aktuelle Berechtigungsprüfung nutzt `can_view_class_individual_reports`. |
| 35 | `20261031154500_fix_mission_domain_event_instance_scope.sql` | **Wirkung vorhanden** | Die aktuelle Mission-Auswertungsfunktion prüft Klasseninstanz, Zuweisung und Zeitfenster; der zugehörige Trigger ist aktiv. |
| 36 | `20261031170000_secure_discrete_action_assessment.sql` | **Wirkung vorhanden; durch Folgemigration erweitert** | `record_discrete_action_assessment` existiert. Die Live-Version unterstützt inzwischen `requirementMode` einschließlich `all_acceptable`; die Erweiterung ist in der neuen Scenario-Assessment-Migration enthalten. |
| 37 | `20261102090000_scenario_learning_cards.sql` | **Wirkung vorhanden** | `scenarios.learning_cards` vorhanden. |
| 38 | `20261102100000_secure_scenario_learning_card_evidence.sql` | **Durch Folgemigration ersetzt** | Die aktuelle `submit_scenario_learning_card`-RPC schreibt in `scenario_learning_card_responses`, nicht in `learning_evidence_events`, und aktualisiert keinen Kompetenzfortschritt. |
| 39 | `20261102110000_store_scenario_learning_card_responses.sql` | **Wirkung vorhanden** | Antworttabelle, Indizes und RPC vorhanden. Direkter SELECT-/INSERT-Zugriff für authenticated ist entzogen; aktuell 0 Antworten. |
| 40 | `20261102120000_teacher_scenario_learning_card_insights.sql` | **Durch Folgemigration ersetzt** | Insights-RPC existiert; die aktuelle Implementierung ist die nachfolgende Version ohne Reporting-Schwelle. |
| 41 | `20261102130000_remove_learning_card_reporting_threshold.sql` | **Wirkung vorhanden** | Aktuelle Insights-RPC ohne die frühere Reporting-Schwelle vorhanden. |
| 42 | `20261102140000_teacher_student_learning_journey.sql` | **Wirkung vorhanden** | RPC vorhanden; authenticated EXECUTE, anon kein EXECUTE. |
| 43 | `20261102160000_teacher_student_scenario_report_detail.sql` | **Wirkung vorhanden** | Szenario-Detail-RPC vorhanden; authenticated EXECUTE, anon kein EXECUTE. |
| 44 | `20261102170000_teacher_student_social_pulse.sql` | **Wirkung vorhanden** | Social-Pulse-RPC vorhanden; authenticated EXECUTE, anon kein EXECUTE. |
| 45 | `20261102180000_student_active_time_tracking.sql` | **Wirkung vorhanden** | Tabelle und beide RPCs vorhanden; 334 Zeitereignisse. Direkte Browser-Tabellenrechte sind entzogen. |
| 46 | `20261103100000_school_sso_connections.sql` | **Wirkung vorhanden** | Tabelle, RLS und Schuladmin-/Plattformadmin-Policy vorhanden; aktuell 0 Konfigurationen. |
| 47 | `20261110100000_scenario_assessment_calculation_v1.sql` | **Angewendet, nicht registriert** | `calculate_scenario_requirement_score_v1` ist vorhanden. Live-Smoke-Test: eine von zwei Pflichtanforderungen ergibt 50 %. Version fehlt im Ledger. |
| 48 | `20261110110000_discrete_action_requirement_modes.sql` | **Angewendet, nicht registriert** | `record_discrete_action_assessment` ist vorhanden und unterstützt `all_acceptable`. Version fehlt im Ledger. |
| 49 | `20261110120000_scenario_assessment_snapshots_and_results.sql` | **Angewendet, nicht registriert** | Snapshot-/Ergebnistabellen, RLS, Snapshot-Trigger sowie interner Finalizer und RPC-Wrapper sind vorhanden. Version fehlt im Ledger. |
| 50 | `20261110130000_teacher_controlled_student_scenario_reports.sql` | **Angewendet, nicht registriert** | `student_reports_enabled` liegt auf `class_instance_scenario_assignments`, Default `false`; der Finalizer prüft den Schalter. Version fehlt im Ledger. |

## Zusätzliche Querschnittsprüfungen

Die folgenden Sicherheitszustände wurden live geprüft:

- **0** öffentliche Tabellen mit TRUNCATE-Recht für anon/authenticated.
- **0** öffentliche Tabellen mit TRIGGER- oder REFERENCES-Recht für anon/authenticated.
- **0** öffentliche SECURITY DEFINER-Funktionen mit EXECUTE-Recht für anon.
- Die 15 Funktionen aus der lokalen Search-Path-Härtungsdatei haben aktuell den erwarteten gepinnten Search Path `pg_catalog, public, auth, pg_temp`.
- Die Scenario-Assessment-Struktur ist in Production vorhanden: Tabellen, Scoring-/Discrete-Action-Funktionen, Snapshot-Trigger, Finalizer-Wrapper und `student_reports_enabled` wurden read-only verifiziert. Die vier Quellversionen fehlen im Ledger.
- Die aktuelle Assignment-Tabelle enthält `is_active` und `archived_at`; das alte „genau ein Modul je Klasse“-Trigger-/Indexmodell ist nicht aktiv.

## Konsequenz / empfohlene nächste Schritte

1. **Keine der 50 Dateien pauschal ausführen.** Der Großteil der historischen Effekte ist bereits vorhanden oder wurde durch spätere Versionen ersetzt.
2. Die Realtime-Publikation und der fehlende Assignment-Index wurden mit `20261111184418` ergänzt und sind registriert. Nicht erneut ausführen.
3. Den Backfill `20261029200000` nicht wiederholen: aktuell sind weder Quell- noch Zielzeilen vorhanden.
4. Die vier Scenario-Assessment-Versionen sind in Production nachgewiesen, fehlen aber im Ledger. Nach abschließender Quellenprüfung ausschließlich die vier Versionen gezielt mit `migration repair --status applied` registrieren; kein SQL-Replay.
5. Für die übrigen historischen Migrationen ohne Ledger-Eintrag bleibt die exakte Ausführungshistorie teilweise unbekannt. Vorhandene Live-Objekte sind Zustandsbelege, aber nicht automatisch ein Versionsnachweis.

**Sicherheitsentscheidung:** `supabase db push` bleibt gesperrt. Keine Ledger-Reparatur, kein SQL-Replay, kein Merge nach `main` und kein Deployment wurde durchgeführt.

## Live-Nachprüfung am 11.11.2026

Die folgenden Punkte wurden nach den ursprünglichen Prüfungen erneut direkt in Production read-only verifiziert:

- `scenario_assessment_snapshots` und `scenario_assessment_results` existieren; beide Tabellen haben RLS aktiviert.
- `calculate_scenario_requirement_score_v1(jsonb,jsonb)`, `record_discrete_action_assessment(uuid,uuid,text)`, `capture_scenario_assessment_snapshot_v1()`, `finalize_scenario_assessment_internal_v1(uuid,uuid)` und `finalize_scenario_assessment_v1(uuid,uuid)` existieren.
- Der Snapshot-Trigger `trg_capture_scenario_assessment_snapshot` ist vorhanden.
- `class_instance_scenario_assignments.student_reports_enabled` existiert mit Default `false`.
- Die Live-Implementierung von `record_discrete_action_assessment` enthält den Modus `all_acceptable`; der Finalizer-Wrapper prüft `student_reports_enabled`.
- Der reine Scoring-Smoke-Test mit einer erfüllten von zwei Pflichtanforderungen liefert `50 %`, eine erfüllte und eine `unobserved` Anforderung.
- Zum Prüfzeitpunkt existierte ein Snapshot und noch kein gespeichertes Assessment-Ergebnis. Das ist kein Beleg für eine vollständige End-to-End-Ergebnisprüfung.
- Die vier Versionsnummern `20261110100000` bis `20261110130000` fehlen weiterhin im Remote-Ledger. Ihre SQL-Effekte sind vorhanden. **Nicht erneut ausführen.**

Die vier Ledger-Reparaturen sind ein separater, gezielter Schritt. Sie wurden in dieser Nachprüfung nicht ausgeführt.