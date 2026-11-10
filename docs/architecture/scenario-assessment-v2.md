# DR1FT Scenario Assessment v2

Status: implementation contract for the isolated `fix/scenario-assessment-v2` branch. No production schema or data has been changed.

## Scope and guardrails

- Change only `apps/editorial`, `apps/player`, and the Supabase schema/functions required by those two apps.
- Do not modify Teacher, other applications, existing teacher-report RPCs, or teacher-report UI.
- Keep `main` and production untouched until a reviewed pull request is explicitly approved.
- Preserve all existing raw interaction and response records. No destructive migration, data rewrite, or retroactive success inference.
- Keep existing legacy assessment configurations readable and operational.

## Current defects confirmed

1. In-feed assessments currently write multiple distinct actions with the same `evidence_key` (usually `in_feed_decision`). Aggregation groups by learner, content, and that key, so independent requirements collapse into one.
2. In-feed actions and scenario learning-card answers are stored in separate event tables and do not share a percentage calculation.
3. Learning-card reporting currently uses the latest answer per learner/card, while in-feed aggregation uses best-success semantics. Retry handling is inconsistent.
4. The Player's current scenario-finished UI state is sessionStorage-backed and is not a trusted backend completion signal.
5. The remote Supabase migration history does not contain several local learning-assessment migration versions even though the corresponding tables/functions exist. Migration history must be reconciled before applying any schema change.

## Editorial contract

### Independent feed requirements

New configurations use `content_items.extra.learningTask.assessment` version 2:

```json
{
  "version": 2,
  "requirements": [
    {
      "id": "report_decision",
      "title": "Problematischen Beitrag melden",
      "actions": ["report"],
      "acceptedActions": ["report"],
      "weight": 1,
      "required": true
    },
    {
      "id": "source_check",
      "title": "Quelle überprüfen",
      "actions": ["inspect_source", "inspect_context"],
      "acceptedActions": ["inspect_source", "inspect_context"],
      "weight": 1,
      "required": true
    }
  ]
}
```

- Every requirement has its own stable ID.
- `actions` lists the observed actions that belong to this requirement.
- `acceptedActions` is a subset of `actions`; accepted alternatives fulfil this one requirement.
- An action ID may belong to only one requirement within a content item. This prevents one action from fulfilling two independent requirements.
- Each required requirement contributes its weight to the denominator, even when the learner never performs it.
- Optional requirements do not contribute to the denominator.
- The Editorial save action continues writing the legacy flattened `assessedActions` and `acceptableActions` arrays as compatibility fields so the existing Player call path can remain stable while the RPC is upgraded.

### Learning cards

- A required, scoreable learning card contributes one requirement identified by its stable card ID.
- Reflection cards are not scoreable requirements.
- Existing option outcomes map to points: `success = 1`, `partial = 0.5`, `not_yet = 0`.
- Optional cards do not enter the denominator.
- Repeated answers are retained as raw attempts; the best points achieved for that requirement count.

### Scenario result feedback

Store five editorially authored result bands on the scenario:

- 0–25 inclusive
- greater than 25 through 50 inclusive
- greater than 50 through 75 inclusive
- greater than 75 and below 100
- exactly 100

Band selection uses the unrounded score. The Player displays the backend-provided title and text; it does not calculate the score or choose a band.

## Backend contract

### Immutable assignment snapshot

Create one assessment snapshot per `class_instance_scenario_assignments.id`. The snapshot contains:

- scoring version;
- the complete required and optional requirement catalog for the assigned scenario;
- source identifiers (content item or learning card);
- requirement IDs, titles, weights, action alternatives, and card point mappings;
- the five result bands as authored when the snapshot is created.

The first Player assessment request creates the snapshot under a row lock if it does not yet exist. All students in the same assignment then use the same snapshot. Later Editorial changes do not silently alter an already-started class assignment. A newly created assignment gets a new snapshot.

### Raw attempts

Keep `learning_result_events` and `scenario_learning_card_responses` append-only. Add nullable snapshot/requirement references and points metadata without rewriting old rows. Legacy rows without a snapshot remain historical evidence and are not retroactively scored under v2.

- In-feed RPC derives the requirement and outcome from the saved snapshot; the client never submits an outcome.
- Learning-card RPC validates the assigned scenario, card, option, and snapshot before recording the attempt.
- A retry appends another raw attempt. It never increases the score by itself.

### One scoring projection for Player

A new Player-scoped RPC returns:

- scenario and assignment identifiers;
- scoring version;
- required requirement count and attempted count;
- earned weighted points and possible weighted points;
- precise percentage (nullable when there are no assessable requirements);
- completion state;
- result-band ID, title, and feedback text when the scenario is complete.

Formula:

`100 * SUM(requirement_weight * best_points_for_requirement) / SUM(required_requirement_weights)`

A missing required action contributes zero. A card's best recorded outcome contributes its mapped points. No required assessable requirements means `score = null`, not 0 or 100.

### Completion signal

Do not trust the existing sessionStorage `scenarioFinished` flag as proof of completion. The backend completion predicate should be based on persisted activity: all live scenario feed posts viewed in the assigned class context and all required scoreable learning cards attempted. Required feed actions themselves need not all be successful or even performed; missing actions remain zero in the final denominator. This allows a learner who performs one of two required actions to receive 50%, not 100%.

## Compatibility

- Keep the existing RPC signatures and return shapes used by Player where practical.
- Legacy `assessedActions` / `acceptableActions` configurations are interpreted as one legacy requirement, preserving their original alternative-action meaning. Do not reinterpret every legacy action as a separate requirement.
- Do not change `get_class_student_learning_evidence_v1`, `get_class_aggregate_learning_report_v1`, `get_teacher_student_learning_journey_v1`, or any Teacher consumer in this work.
- No changes to competency levels or competency evidence semantics are implied by a scenario percentage.

## Verification gates

1. Validate Editorial configuration: unique IDs, non-empty action arrays, accepted actions subset, no duplicate action ownership, positive finite weights.
2. SQL tests: 0%, 25%, 25.01%, 50%, 50.01%, 75%, 75.01%, 99.99%, 100%.
3. Scoring tests: two independent requirements with one completed = 50%; two alternatives within one requirement = at most one requirement; unperformed required actions = zero; optional requirements excluded.
4. Retry tests: not-yet then success = best success; success then not-yet remains success; repeated attempts never inflate the denominator or numerator.
5. Card tests: success/partial/not-yet = 1/0.5/0; retries retain raw rows and count the best.
6. Completion tests: unviewed feed post or unattempted required card means interim result; all posts viewed and required cards attempted means final result.
7. Authorization tests: active student membership and active class assignment required; no cross-class or cross-student reads.
8. Build Editorial and Player; inspect preview deployments only. No Production deployment or Supabase production migration without explicit approval.

## Migration safety note

The remote migration history currently ends at `20261107213509`, while several local learning-assessment migrations (including the learning-results foundation and scenario-card migrations) are absent from that history even though the associated database objects exist. Treat this as migration-history drift. Before any `apply_migration` / `db push`, reconcile the exact remote schema and migration ledger; do not replay older migrations or apply this change to production as a shortcut.
