# DR1FT Class Instance Runtime

## Core rule

Global educational content is reusable. Runtime state is not global.

A **class instance** is a concrete class in a concrete school year, e.g. `8a · 2026/27`.

### Global
- scenarios
- modules
- missions
- NPC definitions
- authored content

### Scoped to a class instance
- scenario assignments
- student memberships
- likes / reactions / shares / reports / comments and other social activity
- current mission progress
- current competency context
- runtime decisions

### Longitudinal
Student identity and historical learning can survive a school-year transition. Historical learning can be aggregated across class instances, while social activity remains isolated to the instance in which it happened.

## School-year transition

Creating the next class instance links it to `previous_instance_id`.

The teacher can then select which students to carry forward. Students keep the same user identity. A new class instance starts with a new social world; old social activity is never copied.

Example:

```text
2026/27 · 8a
  Marie ──┐
  Jonas ──┼── learning history continues
  Max ────┘
          │
          ▼
2027/28 · 9a
  Marie
  Jonas
  Sophie
```

## Hard isolation rule

For social data, `class_instance_id` is the tenant boundary. Queries and RLS must require the current authenticated user to be an active member of that exact instance.

A user playing the same global scenario in two different classes therefore sees two independent social worlds.
