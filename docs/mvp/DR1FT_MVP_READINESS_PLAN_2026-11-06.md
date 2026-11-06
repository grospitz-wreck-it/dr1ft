# DR1FT — MVP Readiness & Stabilisation Plan

**Stand:** 6 November 2026  
**Status:** Working plan for the existing security-hardening branch  
**Scope:** Product, learning systems, school workflows, backend security and release readiness

---

## 1. Purpose and product definition

The MVP is not a reduced game. It is the smallest complete DR1FT product that can validate the educational approach, the core gameplay loop and the technical architecture.

The canonical product direction remains:

- mobile-first serious game for media literacy
- primary target group: learners aged 12–16
- learning through experience rather than static instruction
- safe, simulated digital ecosystem
- ethical AI, accessibility and privacy-first design
- evidence-based learning design and human-reviewable interpretation

The MVP must validate five hypotheses:

1. Interactive experience is more engaging than passive content.
2. Narrative decisions increase reflection.
3. AI-supported dialogue improves immersion.
4. Simulated social feeds make manipulation mechanisms understandable.
5. Learning outcomes can be observed and evaluated through gameplay.

## 2. Proposed MVP cut line

### Included in the first complete school pilot

**Learner / Player**
- secure sign-in and class-code onboarding
- one active class instance per student
- one complete scenario with a simulated social feed
- source/context/profile inspection and comparison actions
- branching decisions with visible consequences
- one AI-supported dialogue path with age-appropriate guardrails
- reflection and at least one transfer task
- progress view that distinguishes activity from assessed evidence

**Teacher**
- access only to assigned classes and their active rosters
- activate/assign the pilot scenario
- class-level progress and evidence overview
- individual report only where a teacher has the required assignment
- report language that distinguishes observed behaviour, evidence, interpretation and recommendation

**School administration**
- school-scoped staff and role management
- teacher assignment to classes
- aggregate school/class information only where authorised
- no school-lead access to student-level learning records by default

**Editorial / content operations**
- create, review, version and publish the pilot scenario
- record content provenance, age suitability and safety review
- prevent unreviewed AI-generated content from being published

### Explicitly not required for MVP validation

- large-scale scenario catalogue
- public matchmaking or multiplayer
- advanced LiveOps, seasons and community growth systems
- unrestricted peer-to-peer messaging
- complex recommendation/personalisation systems before the evidence model is validated

Existing code for excluded features is not automatically deleted. It should be hidden, disabled or permission-restricted in the pilot until it has a clear product need, moderation model and test coverage. The simulated social feed remains a core learning mechanic; unrestricted real-world social networking is not required to validate it.

## 3. Critical technical blockers identified

### 3.1 Migration history and schema drift

- Remote migration history and local source are not fully aligned.
- Historical migrations must not be edited or replayed to repair this.
- Every correction must be a new forward migration with a unique version.
- Before any production migration: compare local and remote history, run a dry run, inspect the exact migration set and stop on unexpected history changes.

**Gate:** no production schema change until the reconciliation is complete and the migration set is independently reviewed.

### 3.2 Client database privileges

Live inspection found broad client grants across 67 public relations:
- `TRUNCATE` for `anon` and `authenticated`
- `TRIGGER` and `REFERENCES` for both client roles
- broad `DELETE` grants, whose effective row access still depends on RLS

Branch migrations now prepare removal of `TRUNCATE`, `TRIGGER` and `REFERENCES`, including future-table defaults. `DELETE` is intentionally not revoked globally; each delete policy must be reviewed against an explicit product workflow.

**Gate:** verify effective grants after staging and prove that every remaining browser write is required and RLS-scoped.

### 3.3 SECURITY DEFINER RPCs and search paths

- Live inspection found 29 SECURITY DEFINER functions executable by `anon`.
- Seven helpers referenced by RLS policies granted to `PUBLIC` must retain the execution permission needed for policy evaluation; their bodies must bind checks to `auth.uid()`.
- A branch migration removes anonymous execution from the other affected RPCs while preserving authenticated/service-role access.
- A second migration pins the search path for the remaining 13 functions flagged by the advisor.

**Gate:** compare the post-migration function ACLs with the intended role matrix; test anonymous, student, teacher, school-lead, school-admin and platform-admin calls.

### 3.4 Student join and class-instance consistency

The live `join_class_as_student` still writes to legacy `classes/class_memberships`, while the current runtime uses `class_instances/class_instance_memberships`. The intended earlier cutover migration is absent from remote history. A forward migration now updates the existing RPC signature to create the current class-instance membership.

**Gate:** a new student must join exactly one active class instance; feed, interactions, mission progress and teacher roster must all resolve that same instance. Test invalid codes, inactive instances, rejoin and second-class attempts.

### 3.5 Student comment policy

The live comment INSERT policy contained a tautological membership comparison. A replacement policy and matching Player API role check are prepared in the branch.

**Gate:** active students can comment only in their own current instance; teachers, anonymous users, former members and students from another instance are denied.

### 3.6 School-level privilege boundary

A school-scoped UPDATE policy also allowed school-level roles to attempt changes to platform-controlled school fields. A trigger guard is prepared to preserve ordinary profile editing while reserving identity, plan, funding, status and internal fields for platform admins.

**Gate:** test ordinary profile edits and protected-field denials for school_admin and school_lead; verify platform_admin operations remain functional.

### 3.7 Security-definer view

The advisor flags `visible_content_for_user`. Its owner-rights behaviour and legacy consumers are not yet fully mapped. Do not switch it to invoker mode or revoke its grants until underlying RLS and all consumers have been verified.

**Gate:** trace all consumers, verify the view's data boundary and then choose the least-privilege compatible design.

## 4. Learning evidence is an MVP release gate

The learning model must preserve the distinction:

`Raw event → Evidence → Interpretation → Competency state → Recommendation`

A click, view, like or completed mission is not automatically proof of competence.

The existing tracking assessment identifies unresolved issues:
- actual active working time is not yet reliably measurable
- `MissionStarted` can currently mean that a mission was unlocked, not that a learner began it
- the complete Learning Design → Learning Step → Evidence Event → Teacher Report chain has not been verified
- the tested class had no `learning_evidence_events` in the inspected period
- single actions or a single mission do not justify a stable competence diagnosis

Required before teacher reports are used for pedagogical decisions:
1. Separate `MissionUnlocked`, `MissionStarted` and `MissionCompleted` semantics.
2. Verify event persistence and class-instance attribution for every MVP action.
3. Produce evidence records for the pilot scenario's required evidence dimensions: behaviour, reasoning, reflection, creation and transfer where applicable.
4. Link evidence to learning objective, competency, scenario/step and source.
5. Show evidence count, context and confidence; label missing data as “not observed/not recorded”.
6. Do not generate percentage-like pseudo-precision or automatic high-stakes diagnoses.
7. Keep recommendations reviewable by teachers.

**Gate:** one end-to-end learner run must produce a traceable evidence chain that can be inspected from raw event to teacher report.

## 5. MVP vertical slice

The first complete acceptance path should be:

1. Platform admin creates/activates a pilot school and its authorised school roles.
2. School lead/admin assigns a teacher to a class instance.
3. Teacher activates the pilot scenario for that class instance.
4. Student creates/signs into an account and joins using the class code.
5. Student completes the simulated feed, decisions, dialogue, reflection and transfer task.
6. System stores events with the correct user, class instance, scenario and timestamp.
7. Teacher sees class-level progress and evidence for the assigned class.
8. Teacher can open an individual report only with the required assignment and role.
9. A school-level report contains aggregates only, not student-level records.
10. A platform operator can inspect logs and resolve an incident without exposing unnecessary student content.

No new feature should be added to the MVP until this path works reliably.

## 6. Required test matrix

| Area | Positive case | Negative / boundary case |
|---|---|---|
| Authentication | valid student and staff sign-in | anonymous RPC access; inactive account |
| Class join | valid code joins active instance | invalid code; archived class; second active student class |
| Roster | assigned teacher sees active roster | unassigned teacher; school lead requesting student identifiers |
| Scenario access | assigned active scenario is available | unassigned or archived scenario |
| Learning events | all MVP actions persist with instance scope | missing, duplicate or cross-instance event |
| Reports | assigned teacher sees permitted report | other class, other school, wrong role |
| Comments | active student comments on allowed post | teacher, former member, other instance, anonymous |
| School roles | school admin/lead manages allowed school workflow | protected platform fields; cross-school operation |
| Content | reviewed age-appropriate scenario can publish | draft/unreviewed/unsafe content cannot publish |
| AI dialogue | bounded, contextual and age-appropriate response | prompt injection, personal-data request, unsafe output |
| Privacy | minimum data returned for each role | broad export, unintended student data access |
| Accessibility | keyboard, focus, contrast and mobile layouts | keyboard trap, inaccessible control, unreadable state |

Use synthetic test accounts and synthetic student records. Do not use real student data for security tests.

## 7. MVP quality gates

A pilot release is blocked until all gates are green:

### Gate A — Source and migration integrity
- remote/local migration reconciliation completed
- no duplicate migration versions
- no edits to already-applied migrations
- new migrations reviewed and dry-run output matches the intended set
- backup/restore procedure documented and restore tested

### Gate B — Security and roles
- RLS enabled on all exposed tables
- no unexplained broad client privileges
- SECURITY DEFINER ACLs reviewed
- search paths pinned
- role matrix tests pass across school boundaries
- service-role secrets never reach browser bundles
- security-definer view resolved or explicitly risk-accepted by accountable reviewers

### Gate C — Core learning journey
- one scenario can be completed from onboarding to transfer
- all required evidence is traceable and correctly class-scoped
- teacher reports do not overstate what the data proves
- AI dialogue passes safety and age-suitability review

### Gate D — School operations
- school, teacher, class and student lifecycle tested
- teacher assignment, class rollover, archive and deletion paths tested
- account recovery and access revocation tested
- support and incident process documented

### Gate E — Privacy, legal and accessibility
- data inventory and purpose documented
- retention/deletion/export process tested
- data-processing agreements and processor/subprocessor review completed
- hosting and international transfer assessment completed
- school/DPO/legal review completed for NRW use
- accessibility review completed
- age-appropriate privacy and safety information prepared

Passing technical gates is not, by itself, a declaration of GDPR or legal compliance.

## 8. Execution order

### Workstream 1 — Stabilise database and access control
1. Complete migration-source reconciliation.
2. Validate the four prepared security corrections and the join cutover.
3. Inspect remaining DELETE policies and table grants.
4. Review all SECURITY DEFINER functions and the flagged view.
5. Build and run the role/instance negative-test matrix.

### Workstream 2 — Stabilise the learning data flow
1. Audit Player event producers.
2. Correct unlock/start/completion event semantics.
3. Verify Learning Evidence creation and linkage.
4. Verify active-time tracking or remove it from MVP claims.
5. Reconcile teacher reports with the evidence model.

### Workstream 3 — Freeze the vertical slice
1. Select one pilot scenario.
2. Freeze the learner journey and teacher workflow.
3. Disable or defer non-essential social/multiplayer/LiveOps surfaces.
4. Complete mobile usability and accessibility review.
5. Run an end-to-end pilot with synthetic users before any real class.

### Workstream 4 — Pilot readiness
1. Complete privacy, DPO, legal and school review.
2. Test backup restore, monitoring, incident response and account revocation.
3. Prepare teacher onboarding and support material.
4. Approve a limited pilot cohort and explicit success measures.
5. Review results before expanding to further schools or content.

## 9. Current status and change-control boundary

Prepared on branch `security/hardening-phase-1`:
- remove client `TRUNCATE`, `TRIGGER` and `REFERENCES` privileges
- restrict unnecessary anonymous SECURITY DEFINER execution
- pin remaining mutable function search paths
- correct student comment membership scope
- protect platform-controlled school fields
- route student self-join into the class-instance runtime
- document live/source migration drift and MVP gates

These are source changes only. They have **not** been applied to the live Supabase project. No merge to `main`, production deployment or production migration is authorised by this plan.

The first pilot should proceed only after the migration set is reconciled, reviewed, tested in a separate environment and explicitly approved.


### 3.8 System-managed learning records must not be client-writable

The live policies allowed learners to write their own mission completion, unlocked mission, story-arc state and competency evidence/level records directly. The same competency policy also allowed any class member to read all classmates' competency records.

Branch migration `20261106190000_protect_system_managed_learning_progress.sql` changes these tables to read-only for browser roles, limits student reads to their own records, and preserves assigned-teacher reads where required. Server-side mission/competency/story-arc triggers remain the write path.

**Gate:** a student cannot self-award mission completion or competency level, cannot unlock arbitrary missions or alter arc state, and cannot read classmates' individual competency evidence. The legitimate event-triggered pipeline must still work end to end.

### 3.9 Canonical learning design must be editorially controlled

Five learning-design mapping tables allowed any authenticated user to write/delete rows when the parent object existed. Branch migration `20261106200000_restrict_learning_design_mapping_writes.sql` limits writes to platform staff and retains the existing authenticated read policies.

**Gate:** Editorial authoring works for platform staff; teacher/student accounts cannot modify canonical learning objectives, competency mappings, learning-step content, mission mappings or objective mappings.


### 3.10 NPC safety events are operational records, not peer-visible content

The live policy allowed every active class member to read all `npc_safety_events` for their class instance. The table stores moderation decisions and reasons. Branch migration `20261106210000_restrict_npc_safety_event_visibility.sql` limits reads to assigned class staff and platform staff/admins.

**Gate:** a student cannot query class safety/moderation events; assigned staff can review only the class instances they are authorised to manage.
