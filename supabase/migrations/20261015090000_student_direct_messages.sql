-- Direct student-to-student messages. Messages are scoped to the active class instance.
create table if not exists public.student_direct_messages (
  id uuid primary key default gen_random_uuid(),
  class_instance_id uuid not null,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint student_direct_messages_no_self_message check (sender_id <> recipient_id)
);

create index if not exists student_direct_messages_conversation_idx
  on public.student_direct_messages (class_instance_id, sender_id, recipient_id, created_at);
create index if not exists student_direct_messages_recipient_unread_idx
  on public.student_direct_messages (class_instance_id, recipient_id, read_at, created_at);

alter table public.student_direct_messages enable row level security;

drop policy if exists "students read own direct messages" on public.student_direct_messages;
create policy "students read own direct messages"
  on public.student_direct_messages for select
  to authenticated
  using (
    class_instance_id = public.get_current_class_instance_id()
    and auth.uid() in (sender_id, recipient_id)
  );

drop policy if exists "students send direct messages as themselves" on public.student_direct_messages;
create policy "students send direct messages as themselves"
  on public.student_direct_messages for insert
  to authenticated
  with check (
    class_instance_id = public.get_current_class_instance_id()
    and sender_id = auth.uid()
    and sender_id <> recipient_id
  );

drop policy if exists "recipients mark direct messages read" on public.student_direct_messages;
create policy "recipients mark direct messages read"
  on public.student_direct_messages for update
  to authenticated
  using (
    class_instance_id = public.get_current_class_instance_id()
    and recipient_id = auth.uid()
  )
  with check (
    class_instance_id = public.get_current_class_instance_id()
    and recipient_id = auth.uid()
  );
