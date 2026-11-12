-- Repair direct-message authorization for databases where the earlier migrations already ran.
-- This migration is intentionally safe to re-run.

create or replace function public.get_current_class_instance_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select cim.class_instance_id
  from public.class_instance_memberships cim
  join public.class_instances ci on ci.id = cim.class_instance_id
  where cim.user_id = auth.uid()
    and cim.role = 'student'
    and cim.left_at is null
    and ci.is_active = true
  order by cim.joined_at desc, cim.class_instance_id
  limit 1;
$$;

revoke all on function public.get_current_class_instance_id() from public;
grant execute on function public.get_current_class_instance_id() to authenticated;

drop policy if exists "students send direct messages as themselves" on public.student_direct_messages;
drop policy if exists "students send direct messages to classmates" on public.student_direct_messages;
create policy "students send direct messages to classmates"
  on public.student_direct_messages for insert
  to authenticated
  with check (
    class_instance_id = public.get_current_class_instance_id()
    and sender_id = auth.uid()
    and sender_id <> recipient_id
    and exists (
      select 1 from public.class_instance_memberships own
      where own.class_instance_id = student_direct_messages.class_instance_id
        and own.user_id = auth.uid()
        and own.role = 'student'
        and own.left_at is null
    )
    and exists (
      select 1 from public.class_instance_memberships peer
      where peer.class_instance_id = student_direct_messages.class_instance_id
        and peer.user_id = student_direct_messages.recipient_id
        and peer.role = 'student'
        and peer.left_at is null
    )
  );

drop policy if exists "students read own direct messages" on public.student_direct_messages;
create policy "students read own direct messages"
  on public.student_direct_messages for select
  to authenticated
  using (
    class_instance_id = public.get_current_class_instance_id()
    and auth.uid() in (sender_id, recipient_id)
    and exists (
      select 1 from public.class_instance_memberships own
      where own.class_instance_id = student_direct_messages.class_instance_id
        and own.user_id = auth.uid()
        and own.role = 'student'
        and own.left_at is null
    )
    and exists (
      select 1 from public.class_instance_memberships peer
      where peer.class_instance_id = student_direct_messages.class_instance_id
        and peer.user_id = case when sender_id = auth.uid() then recipient_id else sender_id end
        and peer.role = 'student'
        and peer.left_at is null
    )
  );

drop policy if exists "recipients mark direct messages read" on public.student_direct_messages;
create or replace function public.mark_student_direct_messages_read(p_message_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.student_direct_messages m
  set read_at = coalesce(m.read_at, now())
  where m.id = any(p_message_ids)
    and m.recipient_id = auth.uid()
    and m.class_instance_id = public.get_current_class_instance_id()
    and exists (
      select 1 from public.class_instance_memberships own
      where own.class_instance_id = m.class_instance_id
        and own.user_id = auth.uid()
        and own.role = 'student'
        and own.left_at is null
    );
end;
$$;

revoke all on function public.mark_student_direct_messages_read(uuid[]) from public;
grant execute on function public.mark_student_direct_messages_read(uuid[]) to authenticated;
