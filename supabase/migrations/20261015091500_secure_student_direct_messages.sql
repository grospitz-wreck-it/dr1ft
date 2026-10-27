-- Tighten direct-message authorization and expose read marking as a narrow RPC.
drop policy if exists "students send direct messages as themselves" on public.student_direct_messages;
create policy "students send direct messages to classmates"
  on public.student_direct_messages for insert
  to authenticated
  with check (
    class_instance_id = public.get_current_class_instance_id()
    and sender_id = auth.uid()
    and sender_id <> recipient_id
    and exists (
      select 1
      from public.user_profiles recipient
      where recipient.id = recipient_id
        and recipient.class_instance_id = student_direct_messages.class_instance_id
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
  update public.student_direct_messages
  set read_at = coalesce(read_at, now())
  where id = any(p_message_ids)
    and recipient_id = auth.uid()
    and class_instance_id = public.get_current_class_instance_id();
end;
$$;

revoke all on function public.mark_student_direct_messages_read(uuid[]) from public;
grant execute on function public.mark_student_direct_messages_read(uuid[]) to authenticated;
