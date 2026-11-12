-- Restore instance memberships for legacy classes that already have
-- a corresponding class instance.
--
-- Only backfill users who do not already have an active membership
-- in another class instance. Existing instance memberships are left
-- untouched.

insert into public.class_instance_memberships (
  class_instance_id,
  user_id,
  role
)
select
  cm.class_id,
  cm.user_id,
  cm.role
from public.class_memberships cm
join public.class_instances ci
  on ci.id = cm.class_id
where not exists (
  select 1
  from public.class_instance_memberships existing
  where existing.user_id = cm.user_id
    and existing.left_at is null
)
on conflict (class_instance_id, user_id) do update
set
  role = excluded.role,
  left_at = null;
