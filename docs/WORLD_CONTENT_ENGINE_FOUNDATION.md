# DR1FT — World Content Engine Foundation

**Status:** Architecture baseline for implementation  
**Branch:** `feat/world-content-engine-foundation`  
**Scope:** NPC identity, interests, content generation, author attribution, world simulation and personalized feed selection  
**Rule:** This document defines the target contract. It does not claim that the described behavior is already implemented.

## 1. Objective

DR1FT is a simulated social-media world, not a conventional CMS. Its feed combines ambient realism, narrative, scenario content, player-created content and learning activities. These content classes have different purposes and must not be collapsed into one generator.

The World Content Engine should make the world feel coherent for each learner while keeping learning objectives, age suitability, editorial review and safety constraints explicit.

## 2. Existing implementation observed

The current repository already contains useful foundations:

- `creators` stores NPC/system accounts and persona data.
- NPC Studio adds `npc_category`, `npc_role`, `bio`, `interest_tags`, `age_bands`, `story_role`, `ai_identity` and `is_active`.
- `npc_story_links` can connect reusable NPCs to scenarios and age bands.
- `content_items` stores posts, comments and other learning/content types, with nullable `creator_id`, `parent_id`, `scenario_id` and flexible `extra` metadata.
- Ambient Studio can generate content but currently allows an empty creator selection to persist `creator_id = null`.
- NPC profile generation accepts free-form interest tags; Ambient Studio uses a separate set of display labels.
- The player feed currently ranks mostly by seen content, competency progress, age rating, scenario assignment and signal/ambient ratio. It does not yet load a normalized learner-interest profile.
- The feed maps missing creator data, and the player author row can consequently disappear.

These are integration gaps. They do not justify replacing the whole database or deleting existing learning data.

## 3. Core invariants

1. **Every content item has provenance.** Store who/what created it: NPC, learner, system, or editorial author. Do not infer a learner identity from an NPC identity or vice versa.
2. **Every simulated social post/comment has a valid author.** A simulated NPC item must reference an active NPC. Learner-authored comments must use the authenticated learner identity model. System and learning items follow explicit, separate rules.
3. **No silent anonymous fallback.** If a generator cannot resolve a valid author, generation/save must fail with an actionable error or keep the item in an explicit exception state. It must not silently persist a simulated social item without an author.
4. **Stable identity, variable expression.** An NPC has a stable profile; each post may vary in mood and wording without reinventing their biography, interests or values.
5. **One canonical interest taxonomy.** NPCs, content and learner preferences use the same stable keys. Labels and emoji are presentation only.
6. **Age and scenario constraints are hard filters.** Personalization may rank only content already allowed for the learner and assigned scenarios.
7. **Learning content is not ambient content.** Personalization may enrich the surrounding world but cannot remove, reorder against mandatory pedagogical dependencies, or rewrite required learning steps.
8. **Editorial safety stays in control.** Generation is not publication. AI output is draft until it passes the existing review/publish workflow.
9. **No unrestricted runtime roleplay by default.** Preserve the existing safety design for NPC conversations: critical/scenario dialogue is authored or generated ahead of time, validated and reviewed; do not introduce unconstrained live AI dialogue as a side effect of this refactor.
10. **Re-runnable data setup.** Seed scripts must use stable keys and upserts, not create duplicate NPCs or content on each run.
11. **No destructive cleanup without classification.** Never mass-delete content based only on `creator_id is null`. Learner comments, learning artifacts, scenario content, interactions and progress need explicit treatment.

## 4. Target conceptual model

### 4.1 NPC identity

An NPC profile should provide:

- stable ID and handle;
- display name, bio, category and role;
- canonical interest keys;
- supported age bands;
- stable persona fields (voice, mannerisms, recurring details, worldview, boundaries);
- narrative role and optional scenario/story links;
- active/retired state;
- profile version and generation provenance.

Use existing `creators` and `npc_story_links` where possible. Add columns/tables only when a demonstrated requirement cannot be represented safely in the existing schema. NPC retirement should normally be soft deactivation, not deletion that nulls authors on existing content.

### 4.2 Canonical interests

Introduce a canonical, versioned catalogue before mass generation. Each interest has a stable machine key and a display label. Initial categories should cover the existing use cases, for example:

- `music`
- `gaming`
- `sports`
- `animals`
- `books_fantasy`
- `art_creativity`
- `food_cooking`
- `fashion_style`
- `technology`
- `nature_outdoors`
- `school_social_life`
- `memes_internet_culture`
- `science_space`
- `climate_sustainability`

This is a starting vocabulary, not a closed final list. Each canonical key can have synonyms for importing legacy free-text tags (for example, `Games` and `Videospiele` map to `gaming`). Preserve original values during migration for auditability. Do not use emoji or localized labels as IDs.

The final physical representation (catalogue table plus join tables versus validated arrays) must be decided after checking query patterns and migration state. Avoid introducing a new relational model just for theoretical purity.

### 4.3 Content provenance and classification

Every generated content item should carry structured metadata, preferably in typed columns where core constraints matter and JSON only for generation diagnostics:

- `content_origin`: `npc`, `learner`, `system`, `editorial`;
- `content_role`: `ambient`, `narrative`, `scenario`, `learning`, `reflection`, `player_created`;
- canonical interest keys;
- generation run/version and prompt/schema version;
- age band/rating;
- optional narrative beat or parent event reference.

Existing `type`, `status`, `scenario_id`, `creator_id`, `parent_id` and `extra` remain relevant. Do not overload `type` to represent both social format and pedagogical role.

### 4.4 Content relationships

- A comment must point to a valid parent post/message where the product contract requires a reply.
- A comment's author must be distinct data from the post author; the generator should choose a plausible responding NPC, not always the original author.
- Content generated as a thread should be persisted as a coherent batch with explicit parent references.
- Orphaned comments must be surfaced by validation and not silently published.

### 4.5 Learner preferences

Personalization should start with a small, explainable profile derived from explicit preferences and observed in-app interactions. Do not infer sensitive traits. Avoid equating a single like/view with a durable interest.

Suggested signals:
- explicit selected interests (if/when the UI supports them);
- repeated positive interactions with canonical interest tags;
- recently seen creators/content, for diversity;
- current scenario and learning step;
- age eligibility and class assignment.

Use bounded, decaying weights and caps. Learner preference affects ambient selection, not mandatory learning sequence or safety decisions.

## 5. Generator contracts

### 5.1 NPC Profile Generator

**Input:** category, intended age bands, scenario/story context if relevant, canonical interests to cover, diversity constraints and editorial brief.

**Output:** schema-validated NPC profiles with stable handles, non-empty interests, age compatibility, persona voice, boundaries, story function and generation metadata.

**Validation before save:**
- valid age-band values;
- canonicalized interest keys only;
- minimum useful interest count for NPC types expected to generate ambient content;
- no duplicate handles (case-insensitive);
- no duplicate profile/near-duplicate within the same batch;
- required persona and boundary fields present;
- role/category combinations valid.

Profiles should not be marked active if required fields fail validation.

### 5.2 Ambient Content Generator

**Input:** canonical interest keys, target age band, desired format/mood mix, selected eligible NPCs, recent content for deduplication, editorial constraints and image policy.

**Output:** posts plus structured tags and an explicit `creatorHandle`/stable creator key for every simulated social item. Resolve that key to a database creator before saving; never rely on an LLM-invented UUID.

**Selection rules:**
- choose active NPCs whose age bands and interests match the generation context;
- if an editor explicitly selects an NPC, validate compatibility;
- if automatic assignment is selected, select an eligible NPC deterministically or by a controlled weighted rotation;
- fail clearly if no eligible NPC exists rather than saving `creator_id = null`;
- avoid the same NPC dominating a batch;
- preserve each NPC's stable voice and avoid repetitive templates;
- save as draft; image failure must not produce a misleading partially published item.

### 5.3 Comment/interaction generator

**Input:** parent post, parent author, eligible respondent NPCs, their interests/personas/relationships, age and scenario context, intended narrative/social function.

**Output:** comments with valid parent references, valid authors, and coherent tone/stance diversity. A generated thread must not consist only of generic reactions such as “cool” or “Ja”.

**Validation:**
- parent exists and is an allowed type;
- comment author resolves to an active eligible NPC (unless it is explicitly a learner comment);
- prevent self-reply when the scenario does not call for it;
- avoid duplicate comments and repeated author patterns;
- ensure scenario comments reference the correct scenario;
- retain draft/review state for editorially controlled content.

### 5.4 Runtime interaction

The first implementation should use validated content, bounded response options and/or pre-generated reviewed variants. Any future dynamic generation must have a separate design for latency, prompt injection, age safety, moderation, persistence and audit. It must not be smuggled into the content refactor.

## 6. Feed selection contract

The feed engine remains a pure, testable function. It should receive an explicit context including:

- age rating and allowed scenario IDs;
- learner competency progress;
- recent content/creator IDs and recent topics;
- canonical interest weights;
- current scenario/learning step and mandatory content IDs;
- signal/ambient target ratio;
- deterministic seed/session context where reproducibility is required.

Selection stages:

1. Hard-filter unpublished, age-inappropriate, unassigned or otherwise prohibited content.
2. Include mandatory learning content according to its authored dependencies.
3. Score eligible ambient/narrative content using interest overlap, creator diversity, recency, seen-content penalty and topical variety.
4. Interleave signal and ambient content without a predictable fixed rhythm.
5. Return reason codes for diagnostics/tests, not necessarily user-facing explanations.
6. Record actual impressions/interactions so repeated content can be down-ranked.

Do not optimize for raw time-on-platform or clicks. Do not use engagement as a proxy for learning progress.

## 7. Editorial workflow and observability

The Editorial UI should make these states clear:

- missing or incompatible author;
- missing/invalid interests;
- age-band mismatch;
- orphan comment;
- duplicate or near-duplicate content;
- missing scenario/story link where required;
- generated content awaiting review.

Provide a dry-run/preview before bulk creation. Bulk generation should report counts for valid, rejected and skipped items with actionable reasons. Logs should include generation/schema version and item IDs but not expose secrets or unnecessary learner data.

## 8. Safe migration and reset strategy

Do not drop/recreate the live schema. Use versioned migrations and a separate, explicitly reviewed seed/data script.

Recommended sequence:

1. Read-only inventory: counts by type/status/origin, null authors, orphan comments, NPC interest gaps, duplicate handles/tags and scenario assignments.
2. Agree canonical interest keys and mapping from legacy tags.
3. Add compatible schema constraints/fields via a new migration, after verifying migration history and remote schema state.
4. Add normalization/backfill that preserves original values and only changes unambiguous mappings.
5. Add generator-side validation and explicit author resolution.
6. Add feed interest context and ranking tests.
7. Seed new NPCs/content with stable deterministic keys and `ON CONFLICT`/upsert behavior.
8. Quarantine or archive obsolete ambient records only after their classification and replacement are verified.
9. Validate: zero live simulated posts/comments with missing authors; zero required comments with missing parents; no age-ineligible content; all seed keys resolve; mandatory learning content remains present.
10. Apply schema only through the established migration process. Check migration history and dry-run before any remote push. Do not use ad hoc schema edits in the SQL editor.

### Explicitly protected data

Unless a separate approved plan says otherwise, preserve:
- learner-authored comments and their attribution;
- user interactions and learning evidence;
- competency progress and mission progress;
- scenario/module/mission definitions and assignments;
- authored learning/scenario content;
- review history and source references.

A reset may replace ambient NPC/content seed data, but must not delete these protected records.

## 9. Implementation sequence

### Phase A — Contract and schema audit
- Inventory existing migrations, actual schema, all writers of `content_items`, NPC creation/edit paths, comment paths and player rendering.
- Decide canonical taxonomy and provenance representation.
- Produce a migration/data-reset plan with explicit preservation boundaries.

### Phase B — Shared domain utilities
- Add shared interest keys/aliases and normalization/validation helpers.
- Add shared content-origin/role and author-resolution contracts.
- Add unit tests before wiring generators.

### Phase C — Generator enforcement
- NPC generation validates and canonicalizes profiles.
- Ambient generation always resolves a compatible author.
- Comment/thread generation always resolves both author and parent.
- All outputs remain draft until reviewed.

### Phase D — Feed personalization
- Extend feed context with interest weights and creator diversity.
- Preserve hard educational/age/scenario filters.
- Add deterministic unit tests for ranking, variety, mandatory content and safe empty states.

### Phase E — Data rebuild
- Generate a reviewed NPC roster using stable keys.
- Run an idempotent seed script.
- Regenerate/replace only classified ambient items.
- Run data-integrity checks before any live promotion.

### Phase F — Rollout
- Deploy code compatible with old and new records.
- Run migration dry-run, reconcile migration history, apply migration.
- Run post-deploy validation and monitor generation errors.
- Only then retire obsolete paths.

## 10. Acceptance criteria

- No live simulated social post/comment lacks a valid NPC author.
- Learner-authored comments retain learner attribution and are never reassigned to NPCs.
- No required live comment lacks a valid parent.
- NPC and content interest tags use canonical keys.
- NPC profile generation produces distinct, age-compatible, usable profiles.
- Automatic author assignment cannot save null author IDs.
- Feed personalization changes ambient selection while preserving assigned scenarios, age filters and mandatory learning content.
- Tests cover missing authors, missing parents, invalid interests, age mismatch, duplicate generation, no eligible NPC and empty interest profiles.
- Seed/data setup is safe to re-run and does not duplicate records.
- No learning progress or learner content is deleted by the reset path.

## 11. Immediate next task

Before implementing Phase B, complete the repository audit for every writer of `content_items` and every path that renders or saves comments. The initial inspection has already found the Ambient Studio null-author path and a feed engine with no interest weights. Do not patch only those two files and call the foundation complete; establish a shared author/content contract and then migrate each writer to it.
