# Supabase migration reconciliation (read-only inventory)

**Baseline inspected:** Git commit `9564bee98142e5ff57fcd2b278ee4e4ee406db06` (`origin/main` at inspection time)  
**Supabase project:** `oegshknzeqmjmkraxozr`  
**Purpose:** document migration-ledger drift without changing production or replaying historical SQL.

## Inventory

| Measure | Count |
|---|---:|
| Local SQL migration files | 195 |
| Remote migration ledger entries | 154 |
| Versions present on both sides | 101 |
| Local-only versions | 94 |
| Remote-only versions | 53 |
| Shared versions with different names | 0 |

A version present on both sides is not automatically proof that the SQL content is identical. A matching name under a different version is not automatically a safe repair mapping.

## Safe operating rule

- Do not run `supabase db push`, `db pull`, or `migration repair` against production until each mismatch has an explicit disposition.
- Do not replay remote-only SQL or mark local-only versions applied merely to silence the CLI.
- Treat the live production schema as authoritative for current behavior, but not as proof of historical migration contents.
- Keep this reconciliation documentation separate from executable migrations.

## Local-only versions

These files exist in Git but have no row with the same version in the remote migration ledger. They are **not** classified as unapplied: some may be represented by later migrations, superseded, or intentionally absent.

- `0056` — `0056_ambient_generator_assets.sql`
- `20260926210000` — `20260926210000_scenario_studio.sql`
- `20260930100000` — `20260930100000_fix_join_class_as_student_instance_scope.sql`
- `20260930120000` — `20260930120000_student_comments_instance_scope.sql`
- `20260930150000` — `20260930150000_teacher_class_management.sql`
- `20260930170000` — `20260930170000_restore_school_administration.sql`
- `20261001170000` — `20261001170000_reconcile_class_instance_runtime.sql`
- `20261005090000` — `20261005090000_allow_school_admin_school_updates.sql`
- `20261005100000` — `20261005100000_class_instance_status_and_images.sql`
- `20261006070000` — `20261006070000_player_activity_realtime.sql`
- `20261009100000` — `20261009100000_teacher_competency_evidence.sql`
- `20261012120000` — `20261012120000_school_admin_class_visibility.sql`
- `20261015090000` — `20261015090000_student_direct_messages.sql`
- `20261015091500` — `20261015091500_secure_student_direct_messages.sql`
- `20261027180000` — `20261027180000_learning_results_foundation.sql`
- `20261027190000` — `20261027190000_harden_learning_result_event_writes.sql`
- `20261027200000` — `20261027200000_restrict_learning_results_table_grants.sql`
- `20261027210000` — `20261027210000_secure_comparison_assessment.sql`
- `20261027220000` — `20261027220000_hide_expected_comparison_answer.sql`
- `20261028120000` — `20261028120000_repair_student_direct_message_security.sql`
- `20261028210000` — `20261028210000_dr1ft_iab_interest_taxonomy.sql`
- `20261028213000` — `20261028213000_dr1ft_interest_hierarchy_extensions.sql`
- `20261029100000` — `20261029100000_ambient_density.sql`
- `20261029170000` — `20261029170000_mission_scheduler_reporting.sql`
- `20261029180000` — `20261029180000_include_historical_missions_in_reporting.sql`
- `20261029190000` — `20261029190000_enforce_mission_schedule_runtime.sql`
- `20261029200000` — `20261029200000_backfill_legacy_mission_completions.sql`
- `20261029210000` — `20261029210000_mission_thumbnail_url.sql`
- `20261029220000` — `20261029220000_scenario_cover_image.sql`
- `20261030123000` — `20261030123000_archive_class_instance_scenario_assignments.sql`
- `20261030150000` — `20261030150000_add_active_state_to_class_module_assignments.sql`
- `20261031153000` — `20261031153000_teacher_learning_evidence_reporting_v1.sql`
- `20261031154500` — `20261031154500_fix_mission_domain_event_instance_scope.sql`
- `20261031170000` — `20261031170000_secure_discrete_action_assessment.sql`
- `20261102090000` — `20261102090000_scenario_learning_cards.sql`
- `20261102100000` — `20261102100000_secure_scenario_learning_card_evidence.sql`
- `20261102110000` — `20261102110000_store_scenario_learning_card_responses.sql`
- `20261102120000` — `20261102120000_teacher_scenario_learning_card_insights.sql`
- `20261102130000` — `20261102130000_remove_learning_card_reporting_threshold.sql`
- `20261102140000` — `20261102140000_teacher_student_learning_journey.sql`
- `20261102160000` — `20261102160000_teacher_student_scenario_report_detail.sql`
- `20261102170000` — `20261102170000_teacher_student_social_pulse.sql`
- `20261102180000` — `20261102180000_student_active_time_tracking.sql`
- `20261103100000` — `20261103100000_school_sso_connections.sql`
- `20261104180000` — `20261104180000_security_hardening_phase_1.sql`
- `20261104190000` — `20261104190000_harden_student_message_reports.sql`
- `20261104200000` — `20261104200000_revoke_client_execute_on_trigger_functions.sql`
- `20261104210000` — `20261104210000_validate_student_promotion_source_membership.sql`
- `20261104220000` — `20261104220000_scope_membership_helper_to_caller.sql`
- `20261104240000` — `20261104240000_restrict_anonymous_security_definer_rpcs.sql`
- `20261104250000` — `20261104250000_harden_legacy_class_memberships.sql`
- `20261104260000` — `20261104260000_school_lead_teacher_assignment_and_membership_scope.sql`
- `20261104270000` — `20261104270000_separate_school_lead_and_class_roster_access.sql`
- `20261105100000` — `20261105100000_add_class_visual_id.sql`
- `20261105113000` — `20261105113000_set_class_instance_visual_rpc.sql`
- `20261105150000` — `20261105150000_school_year_class_matrix_and_rollover.sql`
- `20261105173000` — `20261105173000_platform_admin_school_class_matrix_access.sql`
- `20261105200000` — `20261105200000_archive_school_class_instance.sql`
- `20261105210000` — `20261105210000_fix_school_year_short_format_validation.sql`
- `20261105220000` — `20261105220000_fix_class_access_code_generation.sql`
- `20261106080000` — `20261106080000_strict_single_class_delete_guard.sql`
- `20261106110000` — `20261106110000_enforce_teacher_role_for_individual_reports.sql`
- `20261106120000` — `20261106120000_revoke_client_truncate_privileges.sql`
- `20261106121500` — `20261106121500_restrict_class_instance_updates_to_school_admins.sql`
- `20261106130000` — `20261106130000_restrict_anonymous_security_definer_rpcs.sql`
- `20261106140000` — `20261106140000_fix_student_comment_membership_policy.sql`
- `20261106143000` — `20261106143000_restrict_class_creation_and_individual_reports.sql`
- `20261106160000` — `20261106160000_pin_function_search_paths.sql`
- `20261106170500` — `20261106170500_role_aware_class_module_library.sql`
- `20261106171500` — `20261106171500_school_lead_platform_admin_rls_parity.sql`
- `20261106180000` — `20261106180000_fix_student_join_class_instance_runtime.sql`
- `20261106190000` — `20261106190000_protect_system_managed_learning_progress.sql`
- `20261106200000` — `20261106200000_restrict_learning_design_mapping_writes.sql`
- `20261106210000` — `20261106210000_restrict_npc_safety_event_visibility.sql`
- `20261106220000` — `20261106220000_record_interactions_through_validated_rpc.sql`
- `20261106230000` — `20261106230000_get_student_class_peers_rpc.sql`
- `20261106240000` — `20261106240000_create_student_comment_atomically.sql`
- `20261106250000` — `20261106250000_get_class_instance_post_likes_rpc.sql`
- `20261106260000` — `20261106260000_remove_user_profile_birth_year.sql`
- `20261107100000` — `20261107100000_regenerate_class_instance_access_code.sql`
- `20261107100500` — `20261107100500_tighten_class_access_code_teacher_scope.sql`
- `20261107103000` — `20261107103000_student_onboarding_credentials_encrypted.sql`
- `20261107110000` — `20261107110000_restrict_onboarding_print_to_subject_teachers_and_school_admins.sql`
- `20261107111500` — `20261107111500_add_role_scoped_onboarding_print_permission.sql`
- `20261107112000` — `20261107112000_teacher_module_authorization_alignment.sql`
- `20261107113000` — `20261107113000_consume_onboarding_credentials_after_password_change.sql`
- `20261107120000` — `20261107120000_allow_class_teacher_onboarding_and_code_rotation.sql`
- `20261107121500` — `20261107121500_allow_active_school_members_to_view_school_identity.sql`
- `20261107230000` — `20261107230000_delete_scenario_family.sql`
- `20261112120000` — `20261112120000_restrict_class_scenario_assignment_management.sql`
- `20261112130000` — `20261112130000_allow_subject_teachers_add_scenarios.sql`
- `20261112140000` — `20261112140000_include_class_shared_modules_in_teacher_library.sql`
- `20261112150000` — `20261112150000_fix_scenario_snapshot_feedback_and_class_module_rls.sql`
- `20261112160000` — `20261112160000_allow_subscribed_teachers_read_class_module_shares.sql`

## Remote-only versions

These ledger entries have no local file with the same version. They are **not** automatically safe to mark reverted: some correspond to renamed files, consolidated migrations, manual reconciliation entries, or historical SQL no longer present in Git.

- `20261104220252` — `security_hardening_phase_1`
- `20261104220254` — `harden_student_message_reports`
- `20261104220257` — `revoke_client_execute_on_trigger_functions`
- `20261104220259` — `validate_student_promotion_source_membership`
- `20261104220301` — `scope_membership_helper_to_caller`
- `20261104220311` — `harden_legacy_class_memberships`
- `20261104220313` — `school_lead_teacher_assignment_and_membership_scope`
- `20261104220338` — `separate_school_lead_and_class_roster_access`
- `20261105061023` — `add_class_visual_id`
- `20261105061901` — `set_class_instance_visual_rpc`
- `20261105062315` — `allow_school_image_as_class_visual`
- `20261105182222` — `school_year_class_matrix_and_rollover`
- `20261105190442` — `platform_admin_school_class_matrix_access`
- `20261105201509` — `archive_school_class_instance`
- `20261105201549` — `archive_school_class_instance_and_skip_archived_rollover`
- `20261105202426` — `fix_school_year_short_format_validation`
- `20261105204355` — `fix_class_access_code_generation`
- `20261106064653` — `strict_single_class_delete_guard`
- `20261106105427` — `enforce_teacher_role_for_individual_reports_manual_reconcile_20261106110000`
- `20261106105443` — `revoke_client_truncate_privileges_manual_reconcile_2026110612`
- `20261106105451` — `restrict_anonymous_security_definer_rpcs_manual_reconcile_20261106`
- `20261106105456` — `fix_student_comment_membership_policy_manual_reconcile_20261106`
- `20261106105509` — `fix_student_join_class_instance_runtime_manual_reconcile_20261106`
- `20261106105516` — `protect_system_managed_learning_progress_manual_reconcile_20261106`
- `20261106105521` — `restrict_learning_design_mapping_writes_manual_reconcile_20261106`
- `20261106105528` — `restrict_npc_safety_event_visibility_manual_reconcile_20261106`
- `20261106105532` — `record_interactions_through_validated_rpc_manual_reconcile_20261106`
- `20261106105535` — `create_student_comment_atomically_manual_reconcile_20261106`
- `20261106105543` — `pin_function_search_paths_reconciled_actual_overloads_20261106`
- `20261106105549` — `get_class_instance_post_likes_rpc_manual_reconcile_20261106`
- `20261106105610` — `pin_unlock_mission_delay_search_path_actual_overload_20261106`
- `20261106105700` — `get_student_class_peers_rpc_manual_reconcile_20261106`
- `20261106120615` — `restrict_class_instance_updates_to_school_admins`
- `20261106123614` — `restrict_class_creation_and_individual_reports`
- `20261106131923` — `remove_user_profile_birth_year`
- `20261106155937` — `role_aware_class_module_library`
- `20261106160159` — `school_lead_platform_admin_rls_parity`
- `20261107091141` — `regenerate_class_instance_access_code`
- `20261107091236` — `tighten_class_access_code_teacher_scope`
- `20261107093355` — `student_onboarding_credentials_encrypted`
- `20261107093642` — `restrict_onboarding_print_to_subject_teachers_and_school_admins`
- `20261107093756` — `add_role_scoped_onboarding_print_permission`
- `20261107093910` — `consume_onboarding_credentials_after_password_change`
- `20261107094755` — `allow_class_teacher_onboarding_and_code_rotation`
- `20261107094824` — `allow_active_school_members_to_view_school_identity`
- `20261107101744` — `teacher_module_authorization_alignment`
- `20261107213509` — `delete_scenario_family`
- `20261112103910` — `restrict_class_scenario_assignment_management`
- `20261112104911` — `allow_subject_teachers_add_scenarios`
- `20261112105031` — `include_class_shared_modules_in_teacher_library`
- `20261112105741` — `fix_scenario_snapshot_completion_feedback_trigger`
- `20261112105810` — `fix_scenario_snapshot_feedback_and_class_module_rls`
- `20261112110124` — `allow_subscribed_teachers_read_class_module_shares`

## Shared versions with different names

None.

## Already established historical mappings

- Commit `58fa24b` archived duplicate-version migration files.
- Commit `5d1a1e9` restored nine files under versions documented as matching remote entries, preserving their blobs.
- Several 6 November `manual_reconcile` ledger entries have plausible local counterparts; combined migrations (notably function search-path pinning) must be documented as combined, not split by guessing.
- The 12 November scenario feedback trigger was corrected in the later local migration `20261112150000_fix_scenario_snapshot_feedback_and_class_module_rls.sql`; the earlier remote entry remains a historical ledger entry.

## Recommended next action

Use this inventory to prepare a reviewed, minimal migration-ledger reconciliation. Any actual history mutation must be a separate, explicit operation after a production backup and a final dry-run. This file itself changes no database state.


## Candidate version mappings (name match only; not yet repair-approved)

The following remote/local pairs have the same migration name but different version numbers. This is stronger evidence than a semantic guess, but it is **not** sufficient by itself to mutate the ledger: the SQL blobs and execution order still need comparison.

| Remote ledger version | Local file version | Migration |
|---|---|---|
| 0031 | 0032 | fix_teacher_competency_rpc_types |
| 20261104220252 | 20261104180000 | security_hardening_phase_1 |
| 20261104220254 | 20261104190000 | harden_student_message_reports |
| 20261104220257 | 20261104200000 | revoke_client_execute_on_trigger_functions |
| 20261104220259 | 20261104210000 | validate_student_promotion_source_membership |
| 20261104220301 | 20261104220000 | scope_membership_helper_to_caller |
| 20261104220311 | 20261104250000 | harden_legacy_class_memberships |
| 20261104220313 | 20261104260000 | school_lead_teacher_assignment_and_membership_scope |
| 20261104220338 | 20261104270000 | separate_school_lead_and_class_roster_access |
| 20261105061023 | 20261105100000 | add_class_visual_id |
| 20261105061901 | 20261105113000 | set_class_instance_visual_rpc |
| 20261105182222 | 20261105150000 | school_year_class_matrix_and_rollover |
| 20261105190442 | 20261105173000 | platform_admin_school_class_matrix_access |
| 20261105201509 | 20261105200000 | archive_school_class_instance |
| 20261105202426 | 20261105210000 | fix_school_year_short_format_validation |
| 20261105204355 | 20261105220000 | fix_class_access_code_generation |
| 20261106064653 | 20261106080000 | strict_single_class_delete_guard |
| 20261106120615 | 20261106121500 | restrict_class_instance_updates_to_school_admins |
| 20261106123614 | 20261106143000 | restrict_class_creation_and_individual_reports |
| 20261106131923 | 20261106260000 | remove_user_profile_birth_year |
| 20261106155937 | 20261106170500 | role_aware_class_module_library |
| 20261106160159 | 20261106171500 | school_lead_platform_admin_rls_parity |
| 20261107091141 | 20261107100000 | regenerate_class_instance_access_code |
| 20261107091236 | 20261107100500 | tighten_class_access_code_teacher_scope |
| 20261107093355 | 20261107103000 | student_onboarding_credentials_encrypted |
| 20261107093642 | 20261107110000 | restrict_onboarding_print_to_subject_teachers_and_school_admins |
| 20261107093756 | 20261107111500 | add_role_scoped_onboarding_print_permission |
| 20261107093910 | 20261107113000 | consume_onboarding_credentials_after_password_change |
| 20261107094755 | 20261107120000 | allow_class_teacher_onboarding_and_code_rotation |
| 20261107094824 | 20261107121500 | allow_active_school_members_to_view_school_identity |
| 20261107101744 | 20261107112000 | teacher_module_authorization_alignment |
| 20261107213509 | 20261107230000 | delete_scenario_family |
| 20261112103910 | 20261112120000 | restrict_class_scenario_assignment_management |
| 20261112104911 | 20261112130000 | allow_subject_teachers_add_scenarios |
| 20261112105031 | 20261112140000 | include_class_shared_modules_in_teacher_library |
| 20261112105810 | 20261112150000 | fix_scenario_snapshot_feedback_and_class_module_rls |
| 20261112110124 | 20261112160000 | allow_subscribed_teachers_read_class_module_shares |

**Important exceptions:** the four remote 6 November `manual_reconcile` entries at versions `20261106105427`, `20261106105443`, `20261106105451`, and `20261106105456` are not simple exact-name pairs. The remote entries at `20261106105509` through `20261106105700` map by name/intent to later local files, while `pin_function_search_paths` is a combined local migration that must not be split into multiple independent repairs without checking its SQL against the historical applied changes.

## Repair decision

No production repair command is approved by this inventory alone. The next executable step is to compare the local SQL blobs against the historical blobs in Git history (including archived/renamed paths), then generate a literal `supabase migration repair` command list for only the pairs proven to represent the same already-applied SQL. Local-only migrations with no proven remote counterpart must remain unresolved until the live schema or archived migration history establishes their disposition.
