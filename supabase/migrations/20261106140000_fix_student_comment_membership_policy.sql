-- DR1FT: repair the live student-comment INSERT policy.
--
-- The live policy contains the tautology m.class_instance_id = m.class_instance_id.
-- The source migration 20260930120000 contains the intended outer-row reference,
-- but that migration is absent from the remote migration history. Replace both
-- permissive legacy policies with one explicit, authenticated, instance-scoped
-- student policy matching the current Player comment API payload.

drop policy if exists "instance members create student comments"
  on public.content_items;

drop policy if exists "students can create own comments"
  on public.content_items;

create policy "students create own instance comments"
  on public.content_items
  for insert
  to authenticated
  with check (
    type = 'comment'
    and status = 'live'
    and creator_id is null
    and parent_id is not null
    and class_instance_id = public.get_current_class_instance_id()
    and coalesce(extra ->> 'createdBy', '') = 'student'
    and coalesce(extra ->> 'userId', extra ->> 'studentUserId') = (select auth.uid())::text
    and exists (
      select 1
      from public.class_instance_memberships m
      where m.class_instance_id = content_items.class_instance_id
        and m.user_id = (select auth.uid())
        and m.role = 'student'::public.user_role
        and m.left_at is null
    )
  );

comment on policy "students create own instance comments" on public.content_items is
  'Allows an authenticated student to create a comment only in their own active class instance and only with their own user ID in the comment metadata.';
