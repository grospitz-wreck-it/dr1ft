-- Support the membership lookups used by teacher-module RLS policies.
-- These indexes preserve the existing authorization rules; they only make
-- the correlated EXISTS checks selective and index-backed.

create index if not exists class_instance_memberships_user_instance_active_idx
  on public.class_instance_memberships (user_id, class_instance_id)
  where left_at is null;

create index if not exists class_instance_memberships_instance_user_active_idx
  on public.class_instance_memberships (class_instance_id, user_id)
  where left_at is null;

create index if not exists school_memberships_user_school_active_idx
  on public.school_memberships (user_id, school_id)
  where active = true;

create index if not exists school_memberships_school_user_active_idx
  on public.school_memberships (school_id, user_id)
  where active = true;

create index if not exists teacher_module_class_assignments_module_active_class_idx
  on public.teacher_module_class_assignments (module_id, class_instance_id)
  where is_active = true;

create index if not exists teacher_module_posts_published_module_order_idx
  on public.teacher_module_posts (module_id, sort_order, created_at)
  where status = 'published';

analyze public.class_instance_memberships;
analyze public.school_memberships;
analyze public.teacher_module_class_assignments;
analyze public.teacher_module_posts;
analyze public.teacher_modules;
