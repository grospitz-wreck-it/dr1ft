# Archived DR1FT migration sources

This directory preserves historical SQL files that must not remain in the active `supabase/migrations/` path.

These files were moved without changing their blob contents. They are retained for audit/history only and must not be replayed.

## Why these files were archived

| Original file | Disposition |
|---|---|
| `20260930130000_enforce_one_active_class_module.sql` | superseded; duplicate version prefix |
| `20260930130000_teacher_workspace_hardening.sql` | superseded; duplicate version prefix |
| `20261104230000_restrict_class_membership_and_instance_grants.sql` | same SQL as remote 20261104220304 |
| `20261104230000_teacher_module_editor_posts_rpc.sql` | same SQL as remote 20261104221729 |
| `20261106150000_grant_admin_scoped_report_rpcs.sql` | same SQL as remote 20261106123935 |
| `20261106150000_guard_school_protected_fields.sql` | same SQL as remote 20261106105500 |
| `20261106170000_allow_class_teachers_individual_reports.sql` | same SQL as remote 20261106125611 |
| `20261106170000_revoke_client_trigger_references.sql` | same SQL as remote 20261106105505 |
| `20261106170000_role_scope_security_alignment.sql` | same SQL as remote 20261106155723 |
| `20261106171000_include_class_teachers_in_class_reporting.sql` | same SQL as remote 20261106125620 |
| `20261106171000_tighten_teacher_class_assignment_scope.sql` | same SQL as remote 20261106160054 |

## Important

- Do not move these files back into `supabase/migrations/`.
- Do not run or replay these archived SQL files.
- For the nine files mapped to remote ledger entries, the remote SQL is represented by the corresponding original-version migration source in the active migration directory.
- The two `20260930130000` files belong to a superseded model and share a version prefix; they are retained here only as historical references.
- The active migration directory must contain one file per version prefix.