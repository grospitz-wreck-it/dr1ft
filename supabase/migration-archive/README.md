# Archived DR1FT migration sources

This directory preserves historical SQL files that must not remain in the active `supabase/migrations/` path.

## Remaining archived files

| Original file | Disposition |
|---|---|
| `20260930130000_enforce_one_active_class_module.sql` | Superseded one-active-module model; do not replay. |
| `20260930130000_teacher_workspace_hardening.sql` | Historical source with a duplicate version prefix; current reporting policies were later extended. |

## Restored under their original remote versions

Nine files that had duplicate local version prefixes were compared with the corresponding remote ledger SQL and moved into the active migration directory under their exact remote version/name. Their original blobs were preserved unchanged:

- `20261104220304_restrict_class_membership_and_instance_grants.sql` (formerly archived as `20261104230000_restrict_class_membership_and_instance_grants.sql`)
- `20261104221729_teacher_module_editor_posts_rpc.sql` (formerly archived as `20261104230000_teacher_module_editor_posts_rpc.sql`)
- `20261106123935_grant_admin_scoped_report_rpcs.sql` (formerly archived as `20261106150000_grant_admin_scoped_report_rpcs.sql`)
- `20261106105500_guard_school_protected_fields_manual_reconcile_20261106.sql` (formerly archived as `20261106150000_guard_school_protected_fields.sql`)
- `20261106125611_allow_class_teachers_individual_reports.sql` (formerly archived as `20261106170000_allow_class_teachers_individual_reports.sql`)
- `20261106105505_revoke_client_trigger_references_manual_reconcile_20261106.sql` (formerly archived as `20261106170000_revoke_client_trigger_references.sql`)
- `20261106155723_role_scope_security_alignment.sql` (formerly archived as `20261106170000_role_scope_security_alignment.sql`)
- `20261106125620_include_class_teachers_in_class_reporting.sql` (formerly archived as `20261106171000_include_class_teachers_in_class_reporting.sql`)
- `20261106160054_tighten_teacher_class_assignment_scope.sql` (formerly archived as `20261106171000_tighten_teacher_class_assignment_scope.sql`)

## Important

- Do not move the remaining archived files back into `supabase/migrations/`.
- Do not run or replay these archived SQL files.
- The active migration directory must contain one file per version prefix.