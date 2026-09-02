-- ============================================================
-- DR1FT — Enforce instance-scoped interaction RLS
--
-- 0021 added instance-aware policies, but the original global
-- "users manage own interactions" policy from 0001 remained in
-- place. PostgreSQL combines permissive policies with OR, so that
-- legacy policy could bypass the class-instance boundary.
-- ============================================================

drop policy if exists "users manage own interactions" on public.user_interactions;

-- Keep the instance-scoped policies from 0021 as the sole student
-- access path. They require both the authenticated user and an
-- active membership in the referenced class instance.

create index if not exists idx_user_interactions_user_instance
  on public.user_interactions(user_id, class_instance_id, created_at desc);
