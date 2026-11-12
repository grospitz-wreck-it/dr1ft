# DR1FT Learning Results — Assessment Inventory v1

Status: implementation planning, based on the current player and content-task editor.

## Purpose

Define which current interactions can be used as evidence for a learning result, without confusing an action, feedback text, or a learner's answer with a verified success.

## Current interaction inventory

| Interaction / data | What the current app records or knows | Safe scoring interpretation for v1 |
|---|---|---|
| `view`, `like`, `comment`, `share`, `report`, `ignore` | A user interaction; comments/shares may include associated metadata | Activity only. Never count as learning success by themselves. |
| `inspect_source`, `inspect_media`, `inspect_context`, `inspect_profile` | An inspection action and sometimes a configured feedback/discovery message | Exploration evidence only. The action alone does not prove the learner identified a signal correctly. |
| `compare_information` — opening comparison | The app records phase `open_comparison` | Activity only; no scored result. |
| `compare_information` — learner decision | The client sends a selected `support` or `contradict` value; the related content has a relation type such as `supports`, `corroborates`, or `contradicts` | Candidate for deterministic scoring, but only after a trusted server-side evaluator loads the relation from the database and independently checks the submitted choice. Do not trust a client-provided correctness flag. |
| `learning_task_response` | A free-text response is saved in `user_interactions.metadata.response`; configuration currently includes `evaluationMethod` and `successCriteria` strings | Not automatically assessable yet. Requires an explicit rubric, answer key, or a reviewed assessment process. A saved answer is not a success verdict. |
| Configured `discoveryMessage` / `interaction_discoveries` | Feedback is displayed and some discovery metadata is attached to the interaction | Feedback alone is not proof of success. It may explain an observation but must not award points by itself. |

## v1 scoring rules

1. Only explicitly configured, required learning requirements contribute to a content percentage.
2. Generic social actions and exploratory clicks do not count as successful learning requirements.
3. A discovery/feedback message is instructional UI, not a score.
4. Free-text answers remain `not_assessable` until a validated assessment method exists.
5. The comparison decision is the first candidate for deterministic scoring because the related content relation is structured. A trusted server must fetch both the relation and the authenticated actor/context, then derive the outcome itself.
6. A client must never be allowed to insert arbitrary `success`, `partial`, or `not_yet` outcomes into `learning_result_events`.
7. A content with no configured, assessable required requirements returns `null` (not 0% and not 100%).
8. Legacy `user_interactions` must not be backfilled as successful results merely because the action happened in the past.

## Implementation sequence

1. Add a trusted server-side assessment path for the structured comparison decision.
2. Store validated assessment events through a server-only write path.
3. Build the canonical content-result calculation from configured requirements and validated evidence.
4. Add mission-content assignment and aggregate mission results from assigned contents only.
5. Reuse the same canonical result output in Insights and individual reports.

## Current limitation

The existing player uses `recordInteraction` to write generic events to `user_interactions`. That mechanism is not an assessment engine. This document does not change database behavior or award any scores.
