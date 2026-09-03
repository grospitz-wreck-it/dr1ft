-- ============================================================
-- DR1FT — Student comments: instance-scoped write access
-- ============================================================

alter table public.content_items enable row level security;

drop policy if exists "instance members create student comments"
  on public.content_items;

create policy "instance members create student comments"
  on public.content_items
  for insert
  with check (
    type = 'comment'
    and status = 'live'
    and creator_id is null
    and class_instance_id = public.get_current_class_instance_id()
    and exists (
      select 1
      from public.class_instance_memberships m
      where m.class_instance_id = class_instance_id
        and m.user_id = auth.uid()
        and m.left_at is null
    )
    and extra ->> 'createdBy' = 'student'
    and parent_id is not null
  );
