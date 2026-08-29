-- A user may belong to only one active class instance at a time.
-- Historical memberships remain available through left_at.
create unique index if not exists uq_one_active_class_instance_membership_per_user
  on public.class_instance_memberships(user_id)
  where left_at is null;

-- Resolve the current runtime class context centrally.
create or replace function get_current_class_instance_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select cim.class_instance_id
  from public.class_instance_memberships cim
  join public.class_instances ci on ci.id = cim.class_instance_id
  where cim.user_id = auth.uid()
    and cim.left_at is null
    and ci.is_active = true
  limit 1;
$$;
