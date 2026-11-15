-- Keep student direct messaging class-scoped without exposing the
-- class_instance_memberships table to every student.
--
-- get_student_class_peers(uuid) is an existing SECURITY DEFINER RPC that:
--   * requires auth.uid()
--   * verifies an active student membership in the requested active class
--   * returns only active student peers from that same class
--
-- Reuse that narrow boundary in direct-message RLS instead of querying a
-- classmate's membership row from policies that are subject to membership RLS.

drop policy if exists "students send direct messages to classmates"
  on public.student_direct_messages;

create policy "students send direct messages to classmates"
  on public.student_direct_messages
  for insert
  to authenticated
  with check (
    class_instance_id = public.get_current_class_instance_id()
    and sender_id = (select auth.uid())
    and sender_id <> recipient_id
    and exists (
      select 1
      from public.get_student_class_peers(class_instance_id) peer
      where peer.peer_user_id = student_direct_messages.recipient_id
    )
  );

drop policy if exists "students read own direct messages"
  on public.student_direct_messages;

create policy "students read own direct messages"
  on public.student_direct_messages
  for select
  to authenticated
  using (
    class_instance_id = public.get_current_class_instance_id()
    and (select auth.uid()) in (sender_id, recipient_id)
    and exists (
      select 1
      from public.get_student_class_peers(class_instance_id) peer
      where peer.peer_user_id = case
        when student_direct_messages.sender_id = (select auth.uid())
          then student_direct_messages.recipient_id
        else student_direct_messages.sender_id
      end
    )
  );

comment on policy "students send direct messages to classmates"
  on public.student_direct_messages is
  'Allows an authenticated active student to message only active student peers returned by get_student_class_peers for their own active class.';

comment on policy "students read own direct messages"
  on public.student_direct_messages is
  'Allows an authenticated active student to read only their own messages exchanged with active peers in their own active class.';
