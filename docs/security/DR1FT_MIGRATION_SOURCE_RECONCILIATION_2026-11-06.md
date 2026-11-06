# DR1FT – Migration Source Reconciliation (2026-11-06)

## Scope and safety

This document records the read-only reconciliation of the remote Supabase migration history, the `security/hardening-phase-1` branch, and the current live schema.

- No migration was replayed.
- No SQL was applied to Supabase.
- No production deployment or promotion was performed.
- Applied migrations must not be edited or replayed to repair missing source files. Any required correction gets a new migration version.
- Existing rollback basis: Git branch `backup/pre-security-repair-2026-11-04`, base commit `0d12136e8fe091b0abcd76742496c6b1176d5a84`; existing encrypted Supabase dump `dr1ft-supabase-backup-20261104-193330`. This work did not create another backup.

## Reconciliation snapshot

At the initial detailed comparison:

- Remote migration history: 93 entries.
- Local SQL files: 124.
- Unique local version IDs: 122.
- Exact version + filename matches: 59.
- Same migration name at a different timestamp: 18.
- Remote applied migration filenames without a local filename match: 16.
- Local filenames not represented by remote history: 47 (45 unique local version IDs).
- Duplicate local version groups:
  - `20260930130000`: `enforce_one_active_class_module` and `teacher_workspace_hardening`.
  - `20261104230000`: `restrict_class_membership_and_instance_grants` and `teacher_module_editor_posts_rpc`.
- Duplicate-content files: `0031_fix_teacher_competency_rpc_types.sql` and `0032_fix_teacher_competency_rpc_types.sql` share blob SHA `1c04a02c93de430f36a2410f8c295db336b187b4`.

The remote migration history includes the 16 entries below. Their absence from the local branch is a source-history gap, not evidence that the remote migrations were not applied.

## Remote-only source files

| Remote version | Migration | Source status |
|---|---|---|
| 20261104222042 | save_teacher_module_editor_rpc | Live function definition is reconstructable; original file not found |
| 20261105062315 | allow_school_image_as_class_visual | Partially reconstructable from live helper/RPC and local visual migrations |
| 20261105071625 | teacher_class_module_self_service_assignments | Live schema and RPC behavior are reconstructable |
| 20261105071638 | school_staff_class_discovery_and_class_teacher_roles | Partially reconstructable from live tables, policies and helpers |
| 20261105073339 | scope_individual_reports_to_teacher_module_assignments | Live scoped-report implementation is reconstructable |
| 20261105073800 | make_scoped_student_report_independent_of_legacy_rpc | Live state confirmed; legacy report RPC is not granted to authenticated |
| 20261105073903 | allow_subscribed_teachers_to_read_class_rosters | Live state confirmed in the membership/RLS model |
| 20261105074036 | add_role_aware_aggregate_class_reporting | Live aggregate-report function is reconstructable |
| 20261105074706 | backfill_teacher_scoped_assignments_from_legacy_assigners | Backfill history/data effects cannot be proven from current empty assignment tables |
| 20261105074750 | add_fast_scoped_teacher_module_library_rpc | Live function definition is reconstructable |
| 20261105074853 | backfill_legacy_assignments_with_original_teacher_attribution | Backfill history/data effects cannot be proven from current empty assignment tables |
| 20261105074930 | restrict_individual_module_reports_to_teacher_role | Drift detected: the applied-history entry exists, but the live scoped-report RPC did not contain the teacher-role guard |
| 20261105075630 | allow_school_leadership_to_teach_subscribed_classes | Live helper/assignment behavior confirmed |
| 20261105190518 | platform_admin_teacher_class_assignments | Local equivalent exists in the platform-admin assignment migration |
| 20261105201549 | archive_school_class_instance_and_skip_archived_rollover | Local archive/rollover implementation exists in `20261105200000_archive_school_class_instance.sql` |
| 20261105201824 | delete_empty_school_class_instance | Local equivalent exists in `20261106080000_strict_single_class_delete_guard.sql`; live function intent matches |

## Timestamp/name mappings

These remote entries have matching local migration names but different timestamps. Do not rename or replay either side without an explicit reconciliation plan.

- `20261104220252_security_hardening_phase_1` → `20261104180000_security_hardening_phase_1.sql`
- `20261104220254_harden_student_message_reports` → `20261104190000_harden_student_message_reports.sql`
- `20261104220257_revoke_client_execute_on_trigger_functions` → `20261104200000_revoke_client_execute_on_trigger_functions.sql`
- `20261104220259_validate_student_promotion_source_membership` → `20261104210000_validate_student_promotion_source_membership.sql`
- `20261104220301_scope_membership_helper_to_caller` → `20261104220000_scope_membership_helper_to_caller.sql`
- `20261104220304_restrict_class_membership_and_instance_grants` → `20261104230000_restrict_class_membership_and_instance_grants.sql`
- `20261104221729_teacher_module_editor_posts_rpc` → `20261104230000_teacher_module_editor_posts_rpc.sql`
- `20261104220311_harden_legacy_class_memberships` → `20261104250000_harden_legacy_class_memberships.sql`
- `20261104220313_school_lead_teacher_assignment_and_membership_scope` → `20261104260000_school_lead_teacher_assignment_and_membership_scope.sql`
- `20261104220338_separate_school_lead_and_class_roster_access` → `20261104270000_separate_school_lead_and_class_roster_access.sql`
- `20261105061023_add_class_visual_id` → `20261105100000_add_class_visual_id.sql`
- `20261105061901_set_class_instance_visual_rpc` → `20261105113000_set_class_instance_visual_rpc.sql`
- `20261105182222_school_year_class_matrix_and_rollover` → `20261105150000_school_year_class_matrix_and_rollover.sql`
- `20261105190442_platform_admin_school_class_matrix_access` → `20261105173000_platform_admin_school_class_matrix_access.sql`
- `20261105201509_archive_school_class_instance` → `20261105200000_archive_school_class_instance.sql`
- `20261105202426_fix_school_year_short_format_validation` → `20261105210000_fix_school_year_short_format_validation.sql`
- `20261105204355_fix_class_access_code_generation` → `20261105220000_fix_class_access_code_generation.sql`
- `20261106064653_strict_single_class_delete_guard` → `20261106080000_strict_single_class_delete_guard.sql`

## Live-state observations relevant to recovery

The following assignment tables were empty at inspection time:

| Table | Rows |
|---|---:|
| teacher_module_class_assignments | 0 |
| teacher_class_module_assignments | 0 |
| teacher_class_subscriptions | 0 |
| class_instance_teacher_roles | 0 |

This means there were no current rows to backfill from the legacy assignment model at inspection time. It does not prove that a historical backfill never ran.

The live function `get_teacher_student_scenario_report_scoped_v1(uuid, uuid, uuid)` was SECURITY DEFINER, executable by `authenticated`, not executable by `anon`, and its definition did not contain a teacher-role check. The migration history nevertheless contained `20261105074930_restrict_individual_module_reports_to_teacher_role`. This is recorded as schema drift.

The aggregate report function separately permits school leadership to obtain aggregate reporting. That access model must remain distinct from individual student reporting.

## Corrective branch changes

A new migration was added on `security/hardening-phase-1`:

- `supabase/migrations/20261106110000_enforce_teacher_role_for_individual_reports.sql`
- It adds a same-school active `teacher` membership check tied to the exact class, scenario assignment, subscription, school year and active time window.
- It retains the existing module-assignment helper and active-student membership check as defense in depth.
- It revokes execution from `PUBLIC` and `anon`, then grants to `authenticated` and `service_role`.
- It has **not** been applied to Supabase.

The teacher report page was also changed so school admins and school leads are returned to the aggregate-report path even if a stale/legacy individual assignment row exists.


## Additional live privilege finding (2026-11-06)

A read-only inspection of effective privileges found that both `anon` and `authenticated` have the table-level `TRUNCATE` privilege on 67 of 77 relations in the `public` schema. The same broad grants also include `DELETE`, `TRIGGER` and `REFERENCES` on many relations. RLS does not constrain `TRUNCATE`; therefore this is a separate high-priority privilege-hardening issue, not merely a row-policy concern.

The `schools` table itself has RLS enabled but is among the relations with client `TRUNCATE` privilege. The inspected default-privilege ACLs for both `postgres` and `supabase_admin` also include `TRUNCATE` for `anon` and `authenticated` on future tables in `public`.

A second corrective migration was added on `security/hardening-phase-1`:

- `supabase/migrations/20261106120000_revoke_client_truncate_privileges.sql`
- Revokes only `TRUNCATE` from `anon` and `authenticated` on existing public relations.
- Removes inherited `TRUNCATE` from default privileges for future public tables created by `postgres` or `supabase_admin`.
- Deliberately leaves `SELECT`, `INSERT`, `UPDATE` and `DELETE` grants unchanged; existing RLS and application authorization remain responsible for row-level access.
- It has **not** been applied to Supabase. No production data or schema was changed by this inspection.

Before applying, validate the migration in a disposable environment and re-check effective privileges. Also review the broad `TRIGGER` and `REFERENCES` grants separately; this migration intentionally does not change them.

## Remaining verification before applying

1. Validate the migration against a disposable/staging database before production.
2. Test the report RPC as: assigned teacher (allowed), unassigned teacher (denied), school_admin (denied), school_lead (denied), student (denied), anonymous (denied).
3. Confirm aggregate reporting remains available to the intended school leadership roles.
4. Re-run Supabase Security Advisor and inspect function grants after the staged migration.
5. Resolve the remaining missing-source mappings only where they materially affect future schema changes; do not manufacture historical backfill files.


## Additional live SECURITY DEFINER finding (2026-11-06)

A fresh read-only catalog query confirmed 29 public-schema SECURITY DEFINER functions remain executable by `anon`. The effective function ACLs also show that `authenticated` and `service_role` already have explicit execution rights for the affected functions. The remote migration history contains the earlier phase-1 hardening migration but does not contain the separate source migration `20261104240000_restrict_anonymous_security_definer_rpcs.sql`; that file exists on the branch but was not applied remotely. Public-schema function default privileges for both `postgres` and `supabase_admin` also explicitly grant EXECUTE to `anon`, which can expose functions created after a one-time cleanup.

The Player join page was inspected. It calls `join_class_as_student` only after `signUp` or `signInWithPassword` has established an authenticated session. The inspected flow therefore does not require anonymous execution of that SECURITY DEFINER RPC.

A corrective branch migration was added:

- `supabase/migrations/20261106130000_restrict_anonymous_security_definer_rpcs.sql`
- Finds existing public-schema SECURITY DEFINER functions executable by `anon`, excluding trigger-returning functions.
- Revokes `PUBLIC` and `anon` execution while preserving the effective pre-existing `authenticated` and `service_role` permissions for each affected function.
- Removes `PUBLIC` and `anon` execution from future public-schema function defaults for `postgres` and `supabase_admin`; it deliberately preserves the authenticated and service-role defaults.
- Has **not** been applied to Supabase. The 29 live function grants and default ACLs remain unchanged until a separately approved deployment.

This is a reachability/privilege finding, not proof that each function can be exploited. Authorization inside each RPC still requires function-by-function review and role-matrix testing.


## Additional live student-comment policy drift (2026-11-06)

A read-only inspection of `pg_policies` confirmed that the live `content_items` policy `instance members create student comments` contains the tautology `m.class_instance_id = m.class_instance_id` instead of correlating the membership row to the inserted content row. The corrected outer-row correlation exists in local source migration `20260930120000_student_comments_instance_scope.sql`, but that migration is absent from the remote migration history. The live policy therefore does not enforce the intended exact-instance membership relationship by itself.

The Player comment API was inspected. It authenticates the user, resolves the current class instance, checks membership in that instance, verifies the target is a live post, and inserts comment metadata with `createdBy: "student"` and `userId: user.id`. The API's membership lookup previously accepted any active role, not only a student role. A second permissive legacy policy expected `studentUserId`, which the current API does not send; the policies therefore did not form one coherent authorization contract.

Two branch changes address this:

- `supabase/migrations/20261106140000_fix_student_comment_membership_policy.sql` drops both permissive legacy INSERT policies and replaces them with one authenticated policy requiring a live comment, a parent post, the current class instance, matching authenticated user metadata, and an active `student` membership correlated to `content_items.class_instance_id`.
- `apps/player/app/api/content/[contentId]/comment/route.ts` now also requires the active membership role to be `student`, providing an application-layer check before the insert.

Neither change has been applied to Supabase or deployed. Validate the Player comment flow with an active student, then verify denial for an unassigned student, a teacher, an ended membership, a different class instance, and an anonymous caller before applying the migration.


## Additional school administration privilege finding (2026-11-06)

The live `schools` table grants broad UPDATE privileges at table level to both client roles. RLS limits row access, but the policy `school admins update own school` calls `is_school_admin_of(id)`; the local helper definition explicitly includes both `school_admin` and `school_lead`. Consequently, either school role could attempt to change platform-controlled fields such as `status`, `plan`, `funding_type`, `internal_notes`, `email_domain` and `student_count` on its own school row. This is separate from cross-school access; the existing policy remains school-scoped.

A forward-only branch migration was added:

- `supabase/migrations/20261106150000_guard_school_protected_fields.sql`
- Adds a `BEFORE UPDATE` guard that allows existing school-level profile editing but reserves school identity, billing, status and internal administration fields for platform admins.
- Leaves the existing row-level school scope and profile-editing policy unchanged.
- Has **not** been applied to Supabase.

Before applying, test school_admin and school_lead updates to ordinary profile fields, and verify both are denied for protected fields while platform_admin remains allowed. The exact business ownership of `student_count` and `email_domain` should be confirmed with the school-operations workflow before production rollout.


The anonymous-RPC migration was refined after checking all live RLS policy expressions. Seven currently anon-executable helper functions are referenced by policies granted to `PUBLIC` and must remain executable so PostgreSQL can evaluate those policies; their authorization logic binds to `auth.uid()`. The migration now excludes functions referenced by `PUBLIC` RLS policies, while preserving each affected function's existing authenticated/service-role permissions. A read-only preflight query indicates 22 of the 29 anon-executable SECURITY DEFINER functions would be revoked; the RLS helper functions are retained. Future helper functions used by `PUBLIC` policies must receive an explicit, reviewed grant.


## Security Advisor view finding retained for compatibility review

The live view `public.visible_content_for_user` remains an owner-rights (security-definer) view with broad `anon` and `authenticated` relation privileges. Its current definition returns live `content_items` joined through legacy `class_scenario_assignments` and `class_memberships`, filtered by `cm.user_id = auth.uid()`. The current Player feed page instead queries `content_items` and class-instance assignments directly; however, repository-wide consumers and the legacy teacher/editorial paths have not yet been conclusively traced.

No change was made to this view. Converting it to `security_invoker` or revoking its grants without tracing every consumer and validating the underlying RLS behavior could silently remove legacy content access or change which content is visible. Treat the Security Advisor error as an open review item, not as a resolved finding.


## Additional non-RLS table privilege finding (2026-11-06)

A fresh live privilege inventory confirmed that both `anon` and `authenticated` have table-level `TRIGGER` and `REFERENCES` on the same 67 public relations that also carry the broad `TRUNCATE` grant. These privileges are not restricted by row-level security. The earlier `20261106120000_revoke_client_truncate_privileges.sql` removes `TRUNCATE`; a separate forward-only migration was added for the other two privileges:

- `supabase/migrations/20261106170000_revoke_client_trigger_references.sql`
- Revokes `TRIGGER` and `REFERENCES` from `anon` and `authenticated` across public relations.
- Removes these two grants from future public-table defaults for `postgres` and `supabase_admin`.
- Leaves `SELECT`, `INSERT`, `UPDATE` and `DELETE` unchanged. In particular, `DELETE` remains subject to RLS and must be reviewed table/policy by table/policy rather than revoked wholesale.

No live privilege has been changed; this migration is source-only until explicitly approved and safely reconciled.


## Additional student join / class-instance cutover finding (2026-11-06)

The live migration history does not contain local migration `20260930100000_fix_join_class_as_student_instance_scope.sql`. A read-only inspection of the live `join_class_as_student(text,text)` definition confirmed that it still looks up `public.classes` and writes to legacy `public.class_memberships`. The current Player join page still calls this RPC, while the active runtime and its current-class resolution are based on `class_instances` and `class_instance_memberships`. The only live triggers on the two membership tables bootstrap story arcs; there is no trigger that mirrors legacy student joins into instance memberships.

This is an MVP-critical consistency defect: a successful join can be recorded only in the legacy membership model, leaving the current class-instance runtime without the membership it expects.

A forward-only correction was added:

- `supabase/migrations/20261106180000_fix_student_join_class_instance_runtime.sql`
- Keeps the existing RPC signature, so the current Player page does not need a client API change.
- Requires an authenticated user and a non-empty access code/display name.
- Looks up an active row in `class_instances` and creates/updates the corresponding active `class_instance_memberships` row with role `student`.
- Creates/updates the user profile before the membership insert.
- Does not write new legacy `class_memberships` rows.
- Has **not** been applied to Supabase.

Before deployment, test a new student joining a current active class instance, an invalid/archived code, an already-active student attempting a second class, a former student rejoining the same class, and an anonymous caller. Confirm that the Player feed, interactions, mission progress and teacher roster all resolve the same class-instance ID.


## Additional learning-record and learning-design authorization findings (2026-11-06)

Two further live RLS issues were confirmed.

### System-managed learning state was writable by learners

The live `user_mission_progress`, `user_story_arc_progress`, `user_unlocked_missions` and `user_competency_progress` policies granted `ALL` to a learner for their own active class-instance rows. This allowed direct browser writes to mission completion, arc position/status, mission unlocks and competency evidence/level. Those records are produced by server-side SECURITY DEFINER trigger/workflow functions:

- `evaluate_missions_after_interaction()` creates mission completion after qualifying interactions.
- `update_competency_progress_after_mission()` derives competency evidence and level from mission completion.
- `advance_story_arc_after_mission()` advances story arcs after completion.
- `start_arc_for_user(...)` and `unlock_mission_for_user(...)` create arc/unlock state.

A separate SELECT policy on `user_competency_progress` allowed any active class-instance member to read every learner's competency records in that instance. That exposed classmates' individual learning evidence and levels.

Forward-only migration added:

- `supabase/migrations/20261106190000_protect_system_managed_learning_progress.sql`
- Removes browser INSERT/UPDATE/DELETE privileges from the four system-managed progress tables.
- Keeps learner read access to their own scoped records.
- Keeps assigned-teacher read access to class competency and mission progress.
- Removes classmate-wide competency visibility.
- Leaves server-side trigger/function ownership and service-role privileges intact.

Before applying, verify the Player only reads these tables directly and that all writes are generated by the validated interaction/mission/arc workflows. Test that a student cannot insert, update or delete their own completion/evidence, cannot read a classmate's competency records, and that the legitimate trigger pipeline still writes the records.

### Learning-design mapping tables were writable by any authenticated user

The live tables `learning_objective_competencies`, `learning_step_competencies`, `learning_step_content`, `learning_step_missions` and `learning_step_objectives` each had an authenticated `ALL` policy whose only condition was that the referenced parent learning object/step existed. It did not require platform staff. Existing separate SELECT policies were retained.

Forward-only migration added:

- `supabase/migrations/20261106200000_restrict_learning_design_mapping_writes.sql`
- Replaces the five broad write policies with platform-staff-only management policies.
- Leaves the existing authenticated read policies unchanged.

Before applying, verify the Editorial authoring workflow uses a platform-staff identity and that ordinary teachers/students cannot insert, update or delete canonical learning-design mappings.


## Additional NPC safety-event visibility finding (2026-11-06)

The live `npc_safety_events` table contains class-instance-scoped moderation/safety records (`npc_id`, source type/id, decision, reason and timestamp) but no learner-facing requirement was identified. Its SELECT policy allowed every active member of a class instance to read all safety events in that instance. This could expose moderation signals to classmates.

Forward-only migration added:

- `supabase/migrations/20261106210000_restrict_npc_safety_event_visibility.sql`
- Replaces class-member-wide SELECT with access for assigned class teachers/school admins and platform staff/admins.
- No student-level content or safety records are returned to other students.
- Has not been applied to Supabase.


## Additional raw interaction integrity finding (2026-11-06)

The live `user_interactions` policy `members manage own scoped interactions` allowed an active class member to INSERT, UPDATE and DELETE their own raw event rows directly. The Player's shared `recordInteraction()` helper wrote directly to this table. An AFTER INSERT trigger immediately evaluates mission conditions from these rows, so a client could bypass the UI and submit or alter raw events used for mission completion. The table also had no unique index preventing repeated `view` events for the same content item.

A forward-only migration and matching client change were added:

- `supabase/migrations/20261106220000_record_interactions_through_validated_rpc.sql`
- Adds `record_user_interaction(...)`, which derives the user from `auth.uid()`, requires an active student membership in an active class instance, validates the interaction type and metadata size, requires live content, and checks class-instance ownership/scenario assignment before inserting.
- Replaces the broad ALL policy with own-row SELECT only and removes browser INSERT/UPDATE/DELETE privileges.
- `packages/engine-core/src/recordInteraction.ts` now calls the RPC instead of inserting directly.
- The RPC validates event scope and provenance but cannot prove that a learner actually paid attention or performed the claimed cognitive action. Views/inspection events remain behavioural telemetry, not competence evidence; reasoning, reflection and transfer evidence are still required.

Before applying, test every Player interaction type (including group chat message views and learning-task responses), valid/invalid class-instance combinations, unassigned scenarios, archived content, anonymous calls, and direct table INSERT/UPDATE/DELETE denial. Confirm the mission trigger still fires after the RPC insert.


The interaction RPC was additionally made idempotent for `view`: it takes a transaction-scoped advisory lock for the user/class/content tuple and returns the existing view row rather than inserting another. This prevents repeated visibility callbacks or client retries on the same content item from inflating mission counts. It does not prove attention and does not prevent a client from reporting views of different visible items; mission completion therefore remains gameplay progress, not competence evidence.


### Compatibility correction: Player share recipient lookup

The stricter own-row SELECT policy on `user_interactions` made the old share dialog's recipient discovery query invalid: it inferred classmates by selecting other users' interaction rows. A separate, narrowly scoped RPC was added:

- `supabase/migrations/20261106230000_get_student_class_peers_rpc.sql`
- `get_student_class_peers(class_instance_id)` requires an active student membership in an active class instance and returns only active student peer IDs and display names for that same instance.
- `apps/player/components/PostCard.tsx` now uses this RPC instead of reading classmates' interaction records or querying profile rows by inferred IDs.

The RPC does not expose interaction history, progress, safety records or any other class roster fields. It has not been applied to Supabase.


### Compatibility correction: atomic student comment creation

The interaction write hardening also exposed a silent failure in the existing comment API: it inserted the comment row, then attempted a direct `user_interactions` INSERT and ignored the result. Once browser INSERT privileges are removed from that table, comments could appear while their mission-evaluation interaction was missing.

Two coordinated changes now close that gap:

- `supabase/migrations/20261106240000_create_student_comment_atomically.sql` adds `create_student_comment_atomically(content_id, body)`. It derives the caller and active class instance from the authenticated session, validates student role and parent-post scope, and writes both the comment and its `comment` interaction in one transaction.
- `apps/player/app/api/content/[contentId]/comment/route.ts` calls that RPC and no longer performs direct table writes or silently ignores interaction failures.

The comment interaction is recorded against the parent post, preserving the existing mission trigger's `CommentCreated` mapping. The migration has not been applied to Supabase.


### Additional interaction provenance guard

A further call-path review found that the generic client interaction RPC accepted `comment`, even though a learner could call that RPC directly without creating a comment row. Because mission evaluation maps `CommentCreated` to the `comment` interaction type, this would preserve a direct route to forge comment-based mission progress.

The generic `record_user_interaction` allow-list now excludes `comment`. Legitimate comments can only be recorded by `create_student_comment_atomically`, which creates the comment row and corresponding interaction in the same transaction. The shared TypeScript helper also excludes `comment` at compile time. The atomic comment RPC additionally validates that a scenario-bound parent post is assigned and currently scheduled for the caller's class instance.


### School administration UI and internal-note confidentiality

The school profile page is also accessible to a school's active `school_admin` and `school_lead`. The database trigger protects platform-controlled fields from modification, but the server page previously selected `internal_notes` and passed the value to every school role. A trigger cannot protect read access to an individual column.

The page now sends `internal_notes` to the client only for platform admins. The edit UI hides platform-controlled fields from school roles, and its update payload omits those fields unless the caller is a platform admin. The database trigger remains the authoritative enforcement layer.


### Compatibility correction: class feed like aggregates

The own-row-only policy on `user_interactions` also affected the feed's like aggregation: the server page previously selected every class member's like rows and then loaded their profiles. Under the new policy, that query would return only the current learner's likes, silently reducing class like counts and hiding peer-like identities.

A narrow read RPC was added:

- `supabase/migrations/20261106250000_get_class_instance_post_likes_rpc.sql`
- `get_class_instance_post_likes(class_instance_id, content_item_ids)` requires an active student membership and returns only like rows, display name, username and avatar seed for active student members, limited to explicitly supplied live posts that are visible in that class instance.
- `apps/player/app/feed/page.tsx` now uses this RPC and no longer reads other learners' raw interaction rows or performs a second profile lookup.

The RPC does not expose views, comments, reports, metadata, timestamps, mission events or learning progress. It has not been applied to Supabase.
