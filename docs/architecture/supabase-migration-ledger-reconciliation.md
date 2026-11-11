# Supabase migration ledger reconciliation

**Status:** inventory only; no database changes made  
**Audited branch:** `fix/scenario-assessment-v2`  
**Audited branch HEAD:** `7e33e1af2a627351c86c44c618c2546fbb9a4bc7`  
**Supabase project:** `oegshknzeqmjmkraxozr`  
**Audit date:** 2026-11-11

## Safety decision

Do not run `supabase db push`, replay repository migrations, or modify the remote migration ledger until this reconciliation is complete.

The remote schema contains objects from several migrations whose repository filenames are absent or differently named. The remote ledger also contains entries whose names do not match a repository filename. A filename mismatch alone is not proof that the SQL has not run or that it should be replayed.

This document records observed facts and intentionally does not guess historical execution order or equivalence.

## Counts and matching method

- Repository migration files on the audited branch: **165**
- Remote ledger entries: **138**
- Remote ledger entries with no repository file matching the normalized migration name: **24**
- Repository files with no remote ledger entry matching the normalized migration name: **50**

Name matching strips the numeric version prefix and the suffixes `_manual_reconcile...` and `_reconciled...`. It does not compare SQL semantics. Therefore the 24 and 50 lists are **name mismatches**, not counts of unapplied/applied migrations.

There are also ambiguous name collisions:
- Remote entries `0031_fix_teacher_competency_rpc_types` and `0032_fix_teacher_competency_rpc_types` both match two repository files with the same slug.
- Remote entry `20261106105451_restrict_anonymous_security_definer_rpcs_manual_reconcile_20261106` matches two repository files with that normalized slug.

These must be resolved by comparing stored SQL, repository SQL, and resulting database definitions.

## Remote ledger entries without a same-name repository file

| Remote version | Remote migration name |
|---|---|
| 20261104222042 | save_teacher_module_editor_rpc |
| 20261105062315 | allow_school_image_as_class_visual |
| 20261105071625 | teacher_class_module_self_service_assignments |
| 20261105071638 | school_staff_class_discovery_and_class_teacher_roles |
| 20261105073339 | scope_individual_reports_to_teacher_module_assignments |
| 20261105073800 | make_scoped_student_report_independent_of_legacy_rpc |
| 20261105073903 | allow_subscribed_teachers_to_read_class_rosters |
| 20261105074036 | add_role_aware_aggregate_class_reporting |
| 20261105074706 | backfill_teacher_scoped_assignments_from_legacy_assigners |
| 20261105074750 | add_fast_scoped_teacher_module_library_rpc |
| 20261105074853 | backfill_legacy_assignments_with_original_teacher_attribution |
| 20261105074930 | restrict_individual_module_reports_to_teacher_role |
| 20261105075630 | allow_school_leadership_to_teach_subscribed_classes |
| 20261105190518 | platform_admin_teacher_class_assignments |
| 20261105201549 | archive_school_class_instance_and_skip_archived_rollover |
| 20261105201824 | delete_empty_school_class_instance |
| 20261106105610 | pin_unlock_mission_delay_search_path_actual_overload_20261106 |
| 20261107131730 | allow_students_to_read_assigned_teacher_module_assets |
| 20261107143243 | optimize_teacher_module_posts_rls |
| 20261107145017 | optimize_teacher_module_vote_write_and_aggregate_results |
| 20261107145026 | fix_teacher_module_poll_results_rpc |
| 20261107145122 | add_secure_teacher_module_poll_vote_rpc |
| 20261107174714 | batch_teacher_module_poll_results |
| 20261107203837 | optimize_teacher_module_asset_storage_rls |

The exact SQL for these entries is retained in `supabase_migrations.schema_migrations`. Before restoring any source file, compare its stored SQL with all plausible repository candidates. Do not create a second migration file merely because the filename differs.

## Repository files without a same-name remote ledger entry

This list includes both historical files that may have been applied under a different remote version/name and the four new scenario-assessment migrations that are confirmed not yet present in production. The list must not be interpreted as an unapplied-migration queue.

```text
0056_ambient_generator_assets.sql
20260926210000_scenario_studio.sql
20260930100000_fix_join_class_as_student_instance_scope.sql
20260930120000_student_comments_instance_scope.sql
20260930130000_enforce_one_active_class_module.sql
20260930130000_teacher_workspace_hardening.sql
20260930150000_teacher_class_management.sql
20260930170000_restore_school_administration.sql
20261001170000_reconcile_class_instance_runtime.sql
20261005090000_allow_school_admin_school_updates.sql
20261005100000_class_instance_status_and_images.sql
20261006070000_player_activity_realtime.sql
20261009100000_teacher_competency_evidence.sql
20261012120000_school_admin_class_visibility.sql
20261015090000_student_direct_messages.sql
20261015091500_secure_student_direct_messages.sql
20261027180000_learning_results_foundation.sql
20261027190000_harden_learning_result_event_writes.sql
20261027200000_restrict_learning_results_table_grants.sql
20261027210000_secure_comparison_assessment.sql
20261027220000_hide_expected_comparison_answer.sql
20261028120000_repair_student_direct_message_security.sql
20261028210000_dr1ft_iab_interest_taxonomy.sql
20261028213000_dr1ft_interest_hierarchy_extensions.sql
20261029100000_ambient_density.sql
20261029170000_mission_scheduler_reporting.sql
20261029180000_include_historical_missions_in_reporting.sql
20261029190000_enforce_mission_schedule_runtime.sql
20261029200000_backfill_legacy_mission_completions.sql
20261029210000_mission_thumbnail_url.sql
20261029220000_scenario_cover_image.sql
20261030123000_archive_class_instance_scenario_assignments.sql
20261030150000_add_active_state_to_class_module_assignments.sql
20261031153000_teacher_learning_evidence_reporting_v1.sql
20261031154500_fix_mission_domain_event_instance_scope.sql
20261031170000_secure_discrete_action_assessment.sql
20261102090000_scenario_learning_cards.sql
20261102100000_secure_scenario_learning_card_evidence.sql
20261102110000_store_scenario_learning_card_responses.sql
20261102120000_teacher_scenario_learning_card_insights.sql
20261102130000_remove_learning_card_reporting_threshold.sql
20261102140000_teacher_student_learning_journey.sql
20261102160000_teacher_student_scenario_report_detail.sql
20261102170000_teacher_student_social_pulse.sql
20261102180000_student_active_time_tracking.sql
20261103100000_school_sso_connections.sql
20261110100000_scenario_assessment_calculation_v1.sql
20261110110000_discrete_action_requirement_modes.sql
20261110120000_scenario_assessment_snapshots_and_results.sql
20261110130000_teacher_controlled_student_scenario_reports.sql
```

## Direct production observations

Read-only schema inspection confirmed:

- `mission_content_items`, `learning_result_events`, `learning_evidence_events`, and `scenario_learning_card_responses` exist.
- `scenarios.learning_cards` exists.
- `scenario_assessment_snapshots` and `scenario_assessment_results` do not exist.
- `authenticated` cannot directly insert into `learning_result_events`, nor select or insert into `scenario_learning_card_responses`.
- The expected existing RPCs for comparison, discrete-action assessment, learning-card submission, and teacher reporting exist and are executable by authenticated users.
- Existing learning evidence and learning-card response tables had no rows at the time of the earlier audit.

The existing assessment-related objects prove that some SQL from the unmatched repository migrations is already represented in production. They do not prove the exact historical migration/version that introduced each object.

## Safe next steps

1. Export every remote ledger entry's stored `statements` array to a local audit artifact, preserving remote version and name.
2. Compare SQL text against repository files (normalized whitespace/comments only for an initial candidate search; verify semantic differences manually).
3. Compare final database function definitions, table columns, constraints, indexes, policies, grants, triggers, and storage policies for each candidate.
4. Assign each migration one evidence-backed status: exact match / same SQL under another version / superseded by later migration / partially represented / not represented / unresolved.
5. Only after review, restore missing historical source files or add explicit reconciliation documentation. Never rewrite historical migration SQL to make it appear that a different statement ran.
6. Keep the four scenario-assessment migrations pending until validated against a disposable or staging database and until the ledger reconciliation is complete.

## Change log

- Initial read-only inventory added on 2026-11-11.
- No Supabase migration ledger, schema, policy, function, table, or data was modified.
