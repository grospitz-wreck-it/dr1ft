-- ============================================================
-- DR1FT — Fix class-instance RLS recursion
-- Migration: 0028
-- ============================================================

-- ============================================================
-- 1. MEMBERSHIP HELPER
-- ============================================================

create or replace function public.is_member_of_class_instance(
  p_instance_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.class_instance_memberships cim
    where cim.class_instance_id = p_instance_id
      and cim.user_id = p_user_id
      and cim.left_at is null
  );
$$;


-- ============================================================
-- 2. DO NOT CREATE ANOTHER
--    is_teacher_of_class_instance()
--
-- This function already exists in 0023:
--
-- is_teacher_of_class_instance(target_instance_id uuid)
--
-- We deliberately reuse it.
-- ============================================================


-- ============================================================
-- 3. ACTIVE INSTANCE HELPER
-- ============================================================

create or replace function public.is_active_class_instance(
  p_instance_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.class_instances ci
    where ci.id = p_instance_id
      and ci.is_active = true
  );
$$;


-- ============================================================
-- 4. CLASS INSTANCES
-- ============================================================

drop policy if exists "members view their class instance"
on public.class_instances;

drop policy if exists "teachers manage class instances"
on public.class_instances;

drop policy if exists "members can view their class instance"
on public.class_instances;

drop policy if exists "teachers can manage class instances"
on public.class_instances;


create policy "members view their class instance"
on public.class_instances
for select
using (
  public.is_member_of_class_instance(id)
);


create policy "teachers manage class instances"
on public.class_instances
for all
using (
  public.is_teacher_of_class_instance(id)
)
with check (
  public.is_teacher_of_class_instance(id)
);


-- ============================================================
-- 5. CLASS INSTANCE MEMBERSHIPS
-- ============================================================

drop policy if exists "members view instance memberships"
on public.class_instance_memberships;

drop policy if exists "teachers manage instance memberships"
on public.class_instance_memberships;

drop policy if exists "members can view instance memberships"
on public.class_instance_memberships;

drop policy if exists "teachers can manage instance memberships"
on public.class_instance_memberships;


create policy "members view instance memberships"
on public.class_instance_memberships
for select
using (
  public.is_member_of_class_instance(class_instance_id)
);


create policy "teachers manage instance memberships"
on public.class_instance_memberships
for all
using (
  public.is_teacher_of_class_instance(class_instance_id)
)
with check (
  public.is_teacher_of_class_instance(class_instance_id)
);


-- ============================================================
-- 6. INSTANCE SCENARIO ASSIGNMENTS
-- ============================================================

drop policy if exists "members view instance scenario assignments"
on public.class_instance_scenario_assignments;

drop policy if exists "teachers manage instance scenario assignments"
on public.class_instance_scenario_assignments;

drop policy if exists "members can view instance scenario assignments"
on public.class_instance_scenario_assignments;

drop policy if exists "teachers can manage instance scenario assignments"
on public.class_instance_scenario_assignments;


create policy "members view instance scenario assignments"
on public.class_instance_scenario_assignments
for select
using (
  public.is_member_of_class_instance(class_instance_id)
);


create policy "teachers manage instance scenario assignments"
on public.class_instance_scenario_assignments
for all
using (
  public.is_teacher_of_class_instance(class_instance_id)
)
with check (
  public.is_teacher_of_class_instance(class_instance_id)
);


-- ============================================================
-- 7. USER INTERACTIONS
-- ============================================================

drop policy if exists "members manage own scoped interactions"
on public.user_interactions;

drop policy if exists "members view instance interactions"
on public.user_interactions;

drop policy if exists "members can manage own scoped interactions"
on public.user_interactions;

drop policy if exists "members can view instance interactions"
on public.user_interactions;


create policy "members manage own scoped interactions"
on public.user_interactions
for all
using (
  user_id = auth.uid()
  and class_instance_id is not null
  and public.is_member_of_class_instance(class_instance_id)
)
with check (
  user_id = auth.uid()
  and class_instance_id is not null
  and public.is_member_of_class_instance(class_instance_id)
);


create policy "members view instance interactions"
on public.user_interactions
for select
using (
  class_instance_id is not null
  and public.is_member_of_class_instance(class_instance_id)
);


-- ============================================================
-- 8. SOCIAL PROFILES
-- ============================================================

drop policy if exists "class members read scoped profiles"
on public.user_profiles;

drop policy if exists "users manage own profile"
on public.user_profiles;


create policy "class members read scoped profiles"
on public.user_profiles
for select
using (
  id = auth.uid()
  or exists (
    select 1
    from public.class_instance_memberships target_membership
    where target_membership.user_id = user_profiles.id
      and target_membership.left_at is null
      and public.is_member_of_class_instance(
        target_membership.class_instance_id
      )
  )
);


create policy "users manage own profile"
on public.user_profiles
for all
using (
  id = auth.uid()
)
with check (
  id = auth.uid()
);


-- ============================================================
-- 9. FUNCTION GRANTS
-- ============================================================

grant execute
on function public.is_member_of_class_instance(uuid, uuid)
to authenticated;

grant execute
on function public.is_active_class_instance(uuid)
to authenticated;


-- ============================================================
-- 10. CURRENT CLASS INSTANCE
-- ============================================================

create or replace function public.get_current_class_instance_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select cim.class_instance_id
  from public.class_instance_memberships cim
  join public.class_instances ci
    on ci.id = cim.class_instance_id
  where cim.user_id = auth.uid()
    and cim.left_at is null
    and ci.is_active = true
  limit 1;
$$;


grant execute
on function public.get_current_class_instance_id()
to authenticated;


-- ============================================================
-- END
-- ============================================================