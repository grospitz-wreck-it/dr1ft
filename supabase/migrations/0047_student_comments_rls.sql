-- ============================================================
-- DR1FT — Student comment creation
-- ============================================================

-- Student-authored comments are content_items without an NPC/system creator.
-- The author identity is carried in extra.studentUserId and validated below.
drop policy if exists "students can create own comments" on public.content_items;

create policy "students can create own comments"
  on public.content_items
  for insert
  with check (
    type = 'comment'
    and status = 'live'
    and creator_id is null
    and class_instance_id = public.get_current_class_instance_id()
    and coalesce(extra ->> 'createdBy', '') = 'student'
    and extra ->> 'studentUserId' = auth.uid()::text
  );
