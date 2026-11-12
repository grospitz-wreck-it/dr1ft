-- Restrict table-level privileges for learning results.
--
-- RLS does not protect against TRUNCATE, and broad table grants can allow
-- operations beyond the intended student-read-only policy. Keep student
-- reads on learning_result_events; trusted server-side code will write
-- validated results. Mission/content mapping stays inaccessible to clients
-- until editorial authorization policies are implemented.

revoke all privileges on table public.learning_result_events
  from anon, authenticated, public;

grant select on table public.learning_result_events to authenticated;

revoke all privileges on table public.mission_content_items
  from anon, authenticated, public;

-- Reassert the intended RLS policies in case this migration is applied to a
-- database where the initial policy setup differs.
drop policy if exists "students insert own learning result events"
  on public.learning_result_events;

drop policy if exists "students read own learning result events"
  on public.learning_result_events;

create policy "students read own learning result events"
  on public.learning_result_events
  for select
  to authenticated
  using (auth.uid() = user_id);

comment on table public.learning_result_events is
  'Students may read their own learning evidence. Writes require trusted server-side validation.';
