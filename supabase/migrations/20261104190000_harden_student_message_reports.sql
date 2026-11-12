-- Restrict student message reports to the authenticated reporting flow.
-- Reports are inserted through the Player server route, which also verifies
-- that the referenced message belongs to the current user's conversation.

alter table public.student_message_reports enable row level security;

drop policy if exists "students create reports for their own conversations"
  on public.student_message_reports;

create policy "students create reports for their own conversations"
  on public.student_message_reports
  for insert
  to authenticated
  with check (
    reporter_id = (select auth.uid())
    and class_instance_id = public.get_current_class_instance_id()
    and status = 'open'
    and report_type = 'user_report'
    and reviewed_at is null
    and reviewed_by is null
    and other_user_id <> reporter_id
    and exists (
      select 1
      from public.class_instance_memberships own
      where own.class_instance_id = student_message_reports.class_instance_id
        and own.user_id = (select auth.uid())
        and own.role = 'student'
        and own.left_at is null
    )
    and exists (
      select 1
      from public.student_direct_messages dm
      where dm.id = student_message_reports.reported_message_id
        and dm.class_instance_id = student_message_reports.class_instance_id
        and (
          (dm.sender_id = (select auth.uid()) and dm.recipient_id = student_message_reports.other_user_id)
          or
          (dm.recipient_id = (select auth.uid()) and dm.sender_id = student_message_reports.other_user_id)
        )
    )
  );

-- The Player route treats a repeated report of the same message by the same
-- student as an idempotent success (HTTP 200 on SQLSTATE 23505).
-- Read-only preflight found no existing duplicate reporter/message pairs.
create unique index if not exists student_message_reports_message_reporter_unique
  on public.student_message_reports (reported_message_id, reporter_id);

-- The Player route only inserts reports. No client role should read,
-- modify, delete, or truncate reports through the Data API.
revoke all privileges on table public.student_message_reports
  from public, anon, authenticated;
grant insert on table public.student_message_reports
  to authenticated;

comment on table public.student_message_reports is
  'Student-submitted reports for messages in the reporter''s active class conversation. Client access is insert-only and constrained by RLS; moderation access must be provided through a separately authorized staff workflow.';
