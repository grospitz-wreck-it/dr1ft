-- ============================================================
-- DR1FT — Student comments + content reports
--
-- Consolidated migration:
-- - instance-scoped student comment creation
-- - own-comment validation
-- - student content reports
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

drop policy if exists "students can create own comments"
  on public.content_items;

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

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  class_instance_id uuid not null references public.class_instances(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (
    reason in (
      'uncomfortable',
      'insulting',
      'threatening',
      'inappropriate',
      'other'
    )
  ),
  details text,
  status text not null default 'open' check (
    status in ('open','reviewed','dismissed','actioned')
  ),
  created_at timestamptz not null default now(),
  unique (content_item_id, reporter_user_id)
);

create index if not exists idx_content_reports_instance_status
  on public.content_reports(class_instance_id, status, created_at desc);

alter table public.content_reports enable row level security;

drop policy if exists "content reports members create"
  on public.content_reports;

create policy "content reports members create"
  on public.content_reports
  for insert
  with check (
    reporter_user_id = auth.uid()
    and exists (
      select 1
      from public.class_instance_memberships m
      where m.class_instance_id = content_reports.class_instance_id
        and m.user_id = auth.uid()
        and m.left_at is null
    )
  );

drop policy if exists "content reports own readable"
  on public.content_reports;

create policy "content reports own readable"
  on public.content_reports
  for select
  using (reporter_user_id = auth.uid());
