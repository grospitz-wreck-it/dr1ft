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


## Remote versions with a unique same-name repository candidate

The following rows have exactly one repository file with the same normalized migration name, but the version numbers differ. This is strong filename-level evidence of a renamed/re-versioned source candidate, **not yet proof that the SQL contents are identical**. These entries are safe to treat as candidates for exact SQL comparison, not as reconciled automatically.

| Remote version | Remote ledger name | Repository candidate |
|---|---|---|
| 20261104220252 | `security_hardening_phase_1` | `20261104180000_security_hardening_phase_1.sql` |
| 20261104220254 | `harden_student_message_reports` | `20261104190000_harden_student_message_reports.sql` |
| 20261104220257 | `revoke_client_execute_on_trigger_functions` | `20261104200000_revoke_client_execute_on_trigger_functions.sql` |
| 20261104220259 | `validate_student_promotion_source_membership` | `20261104210000_validate_student_promotion_source_membership.sql` |
| 20261104220301 | `scope_membership_helper_to_caller` | `20261104220000_scope_membership_helper_to_caller.sql` |
| 20261104220304 | `restrict_class_membership_and_instance_grants` | `20261104230000_restrict_class_membership_and_instance_grants.sql` |
| 20261104220311 | `harden_legacy_class_memberships` | `20261104250000_harden_legacy_class_memberships.sql` |
| 20261104220313 | `school_lead_teacher_assignment_and_membership_scope` | `20261104260000_school_lead_teacher_assignment_and_membership_scope.sql` |
| 20261104220338 | `separate_school_lead_and_class_roster_access` | `20261104270000_separate_school_lead_and_class_roster_access.sql` |
| 20261104221729 | `teacher_module_editor_posts_rpc` | `20261104230000_teacher_module_editor_posts_rpc.sql` |
| 20261105061023 | `add_class_visual_id` | `20261105100000_add_class_visual_id.sql` |
| 20261105061901 | `set_class_instance_visual_rpc` | `20261105113000_set_class_instance_visual_rpc.sql` |
| 20261105182222 | `school_year_class_matrix_and_rollover` | `20261105150000_school_year_class_matrix_and_rollover.sql` |
| 20261105190442 | `platform_admin_school_class_matrix_access` | `20261105173000_platform_admin_school_class_matrix_access.sql` |
| 20261105201509 | `archive_school_class_instance` | `20261105200000_archive_school_class_instance.sql` |
| 20261105202426 | `fix_school_year_short_format_validation` | `20261105210000_fix_school_year_short_format_validation.sql` |
| 20261105204355 | `fix_class_access_code_generation` | `20261105220000_fix_class_access_code_generation.sql` |
| 20261106064653 | `strict_single_class_delete_guard` | `20261106080000_strict_single_class_delete_guard.sql` |
| 20261106105427 | `enforce_teacher_role_for_individual_reports_manual_reconcile_20261106110000` | `20261106110000_enforce_teacher_role_for_individual_reports.sql` |
| 20261106105443 | `revoke_client_truncate_privileges_manual_reconcile_2026110612` | `20261106120000_revoke_client_truncate_privileges.sql` |
| 20261106105456 | `fix_student_comment_membership_policy_manual_reconcile_20261106` | `20261106140000_fix_student_comment_membership_policy.sql` |
| 20261106105500 | `guard_school_protected_fields_manual_reconcile_20261106` | `20261106150000_guard_school_protected_fields.sql` |
| 20261106105505 | `revoke_client_trigger_references_manual_reconcile_20261106` | `20261106170000_revoke_client_trigger_references.sql` |
| 20261106105509 | `fix_student_join_class_instance_runtime_manual_reconcile_20261106` | `20261106180000_fix_student_join_class_instance_runtime.sql` |
| 20261106105516 | `protect_system_managed_learning_progress_manual_reconcile_20261106` | `20261106190000_protect_system_managed_learning_progress.sql` |
| 20261106105521 | `restrict_learning_design_mapping_writes_manual_reconcile_20261106` | `20261106200000_restrict_learning_design_mapping_writes.sql` |
| 20261106105528 | `restrict_npc_safety_event_visibility_manual_reconcile_20261106` | `20261106210000_restrict_npc_safety_event_visibility.sql` |
| 20261106105532 | `record_interactions_through_validated_rpc_manual_reconcile_20261106` | `20261106220000_record_interactions_through_validated_rpc.sql` |
| 20261106105535 | `create_student_comment_atomically_manual_reconcile_20261106` | `20261106240000_create_student_comment_atomically.sql` |
| 20261106105543 | `pin_function_search_paths_reconciled_actual_overloads_20261106` | `20261106160000_pin_function_search_paths.sql` |
| 20261106105549 | `get_class_instance_post_likes_rpc_manual_reconcile_20261106` | `20261106250000_get_class_instance_post_likes_rpc.sql` |
| 20261106105700 | `get_student_class_peers_rpc_manual_reconcile_20261106` | `20261106230000_get_student_class_peers_rpc.sql` |
| 20261106120615 | `restrict_class_instance_updates_to_school_admins` | `20261106121500_restrict_class_instance_updates_to_school_admins.sql` |
| 20261106123614 | `restrict_class_creation_and_individual_reports` | `20261106143000_restrict_class_creation_and_individual_reports.sql` |
| 20261106123935 | `grant_admin_scoped_report_rpcs` | `20261106150000_grant_admin_scoped_report_rpcs.sql` |
| 20261106125611 | `allow_class_teachers_individual_reports` | `20261106170000_allow_class_teachers_individual_reports.sql` |
| 20261106125620 | `include_class_teachers_in_class_reporting` | `20261106171000_include_class_teachers_in_class_reporting.sql` |
| 20261106131923 | `remove_user_profile_birth_year` | `20261106260000_remove_user_profile_birth_year.sql` |
| 20261106155723 | `role_scope_security_alignment` | `20261106170000_role_scope_security_alignment.sql` |
| 20261106155937 | `role_aware_class_module_library` | `20261106170500_role_aware_class_module_library.sql` |
| 20261106160054 | `tighten_teacher_class_assignment_scope` | `20261106171000_tighten_teacher_class_assignment_scope.sql` |
| 20261106160159 | `school_lead_platform_admin_rls_parity` | `20261106171500_school_lead_platform_admin_rls_parity.sql` |
| 20261107091141 | `regenerate_class_instance_access_code` | `20261107100000_regenerate_class_instance_access_code.sql` |
| 20261107091236 | `tighten_class_access_code_teacher_scope` | `20261107100500_tighten_class_access_code_teacher_scope.sql` |
| 20261107093355 | `student_onboarding_credentials_encrypted` | `20261107103000_student_onboarding_credentials_encrypted.sql` |
| 20261107093642 | `restrict_onboarding_print_to_subject_teachers_and_school_admins` | `20261107110000_restrict_onboarding_print_to_subject_teachers_and_school_admins.sql` |
| 20261107093756 | `add_role_scoped_onboarding_print_permission` | `20261107111500_add_role_scoped_onboarding_print_permission.sql` |
| 20261107093910 | `consume_onboarding_credentials_after_password_change` | `20261107113000_consume_onboarding_credentials_after_password_change.sql` |
| 20261107094755 | `allow_class_teacher_onboarding_and_code_rotation` | `20261107120000_allow_class_teacher_onboarding_and_code_rotation.sql` |
| 20261107094824 | `allow_active_school_members_to_view_school_identity` | `20261107121500_allow_active_school_members_to_view_school_identity.sql` |
| 20261107101744 | `teacher_module_authorization_alignment` | `20261107112000_teacher_module_authorization_alignment.sql` |
| 20261107213509 | `delete_scenario_family` | `20261107230000_delete_scenario_family.sql` |

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
