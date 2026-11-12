-- Harden learning result event writes before the player integration ships.
--
-- A client must not be able to submit its own success/partial/not_yet verdict.
-- Learning outcomes will be written only by a trusted server-side evaluator
-- after validating the configured requirement and evidence. Until that path
-- exists, the table is intentionally read-only for authenticated students.

drop policy if exists "students insert own learning result events"
  on public.learning_result_events;

-- RLS remains enabled. The existing SELECT policy still allows a student to
-- read only their own events. With no INSERT/UPDATE/DELETE policies, direct
-- client writes are denied by default.

comment on table public.learning_result_events is
  'Append-only learning evidence. Students can read their own events; writes and scored outcomes require a trusted server-side evaluator.';
