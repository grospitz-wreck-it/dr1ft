-- Align class membership cardinality and school-lead visibility with the
-- established DR1FT role model.
--
-- Teachers may be assigned to multiple active class instances.
-- Students may belong to only one active class instance.
-- School leads/admins may inspect their school's class metadata and staff
-- assignments, but school leads do not receive student membership rows.
--
-- This migration does not create or modify any student membership.

-- The previous index limited every role to one active class. Narrow it to
-- students only so teachers can teach multiple classes.
drop index if exists public.uq_one_active_class_instance_membership_per_user;

create unique index uq_one_active_student_class_instance_per_user
  on public.class_instance_memberships (user_id)
  where left_at is null and role = 'student'::public.user_role;

-- School leads can read class metadata within their own school.
drop policy if exists "school leads view their school class instances"
  on public.class_instances;

create policy "school leads view their school class instances"
  on public.class_instances
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.school_memberships sm
      where sm.school_id = class_instances.school_id
        and sm.user_id = (select auth.uid())
        and sm.active = true
        and sm.role = 'school_lead'
    )
  );

-- School leads can see staff assignments, but not student membership rows.
drop policy if exists "school leads view staff class assignments"
  on public.class_instance_memberships;

create policy "school leads view staff class assignments"
  on public.class_instance_memberships
  for select
  to authenticated
  using (
    role in ('teacher'::public.user_role, 'school_admin'::public.user_role)
    and exists (
      select 1
      from public.class_instances ci
      join public.school_memberships sm
        on sm.school_id = ci.school_id
      where ci.id = class_instance_memberships.class_instance_id
        and sm.user_id = (select auth.uid())
        and sm.active = true
        and sm.role = 'school_lead'
    )
  );

-- School leads need the school directory for the existing "Menschen &
-- Zugänge" workflow. This function exposes school membership metadata only;
-- it does not expose student learning data.
create or replace function public.get_school_member_directory(p_school_id uuid)
returns table (
  id uuid,
  user_id uuid,
  email text,
  display_name text,
  role text,
  active boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_platform_admin()
     and not exists (
       select 1
       from public.school_memberships sm
       where sm.school_id = p_school_id
         and sm.user_id = auth.uid()
         and sm.active = true
         and sm.role in ('school_admin', 'school_lead')
     ) then
    raise exception 'Nicht berechtigt, diese Schule einzusehen'
      using errcode = '42501';
  end if;

  return query
  select
    sm.id,
    sm.user_id,
    au.email::text,
    up.display_name,
    sm.role,
    sm.active,
    sm.created_at
  from public.school_memberships sm
  join auth.users au on au.id = sm.user_id
  left join public.user_profiles up on up.id = sm.user_id
  where sm.school_id = p_school_id
  order by sm.active desc, sm.role, coalesce(up.display_name, au.email), sm.created_at;
end;
$$;

revoke all privileges on function public.get_school_member_directory(uuid)
  from public, anon;
grant execute on function public.get_school_member_directory(uuid)
  to authenticated, service_role;

-- Only an active school_lead or school_admin of the same school can assign
-- an existing school teacher to a class in that school.
create or replace function public.assign_teacher_to_class_instance(
  p_class_instance_id uuid,
  p_teacher_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_school_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Nicht authentifiziert'
      using errcode = '42501';
  end if;

  if p_class_instance_id is null or p_teacher_user_id is null then
    raise exception 'Klasse und Lehrkraft müssen angegeben werden'
      using errcode = '22023';
  end if;

  select ci.school_id
    into v_school_id
  from public.class_instances ci
  where ci.id = p_class_instance_id;

  if v_school_id is null then
    raise exception 'Klasseninstanz nicht gefunden'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.school_memberships sm
    where sm.school_id = v_school_id
      and sm.user_id = auth.uid()
      and sm.active = true
      and sm.role in ('school_admin', 'school_lead')
  ) then
    raise exception 'Nur Schuladmin oder Schulleitung dieser Schule dürfen Lehrkräfte zuordnen'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.school_memberships sm
    where sm.school_id = v_school_id
      and sm.user_id = p_teacher_user_id
      and sm.active = true
      and sm.role = 'teacher'
  ) then
    raise exception 'Die Person ist keine aktive Lehrkraft dieser Schule'
      using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.class_instance_memberships cim
    where cim.user_id = p_teacher_user_id
      and cim.role = 'student'
      and cim.left_at is null
  ) then
    raise exception 'Ein aktiver Schülerzugang kann nicht als Lehrkraft zugeordnet werden'
      using errcode = '23514';
  end if;

  insert into public.class_instance_memberships (
    class_instance_id, user_id, role, left_at
  )
  values (
    p_class_instance_id, p_teacher_user_id, 'teacher', null
  )
  on conflict (class_instance_id, user_id)
  do update set left_at = null
  where class_instance_memberships.role = 'teacher';
  
  if not exists (
    select 1
    from public.class_instance_memberships cim
    where cim.class_instance_id = p_class_instance_id
      and cim.user_id = p_teacher_user_id
      and cim.role = 'teacher'
      and cim.left_at is null
  ) then
    raise exception 'Die bestehende Zuordnung hat eine andere Rolle und wurde nicht verändert'
      using errcode = '23514';
  end if;
end;
$$;

-- Unassignment is a soft end of the staff membership, preserving history.
create or replace function public.unassign_teacher_from_class_instance(
  p_class_instance_id uuid,
  p_teacher_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_school_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Nicht authentifiziert'
      using errcode = '42501';
  end if;

  select ci.school_id
    into v_school_id
  from public.class_instances ci
  where ci.id = p_class_instance_id;

  if v_school_id is null then
    raise exception 'Klasseninstanz nicht gefunden'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.school_memberships sm
    where sm.school_id = v_school_id
      and sm.user_id = auth.uid()
      and sm.active = true
      and sm.role in ('school_admin', 'school_lead')
  ) then
    raise exception 'Nur Schuladmin oder Schulleitung dieser Schule dürfen Lehrkräfte zuordnen'
      using errcode = '42501';
  end if;

  update public.class_instance_memberships
  set left_at = now()
  where class_instance_id = p_class_instance_id
    and user_id = p_teacher_user_id
    and role = 'teacher'
    and left_at is null;
end;
$$;

revoke all privileges on function public.assign_teacher_to_class_instance(uuid, uuid)
  from public, anon;
revoke all privileges on function public.unassign_teacher_from_class_instance(uuid, uuid)
  from public, anon;

grant execute on function public.assign_teacher_to_class_instance(uuid, uuid)
  to authenticated, service_role;
grant execute on function public.unassign_teacher_from_class_instance(uuid, uuid)
  to authenticated, service_role;

comment on function public.assign_teacher_to_class_instance(uuid, uuid) is
  'Assigns an active teacher of the same school to a class instance. Only active school_lead or school_admin members of that school may call it.';

comment on function public.unassign_teacher_from_class_instance(uuid, uuid) is
  'Ends a teacher assignment in a class instance without deleting its history. Only active school_lead or school_admin members of that school may call it.';


-- Return only per-class student counts for the school workspace. This avoids
-- granting school_lead direct visibility of student membership identifiers.
create or replace function public.get_school_class_student_counts(p_school_id uuid)
returns table (
  class_instance_id uuid,
  student_count bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not (
    public.is_platform_admin()
    or exists (
      select 1
      from public.school_memberships sm
      where sm.school_id = p_school_id
        and sm.user_id = auth.uid()
        and sm.active = true
        and sm.role in ('school_admin', 'school_lead')
    )
  ) then
    raise exception 'Nicht berechtigt, Klassenstatistiken dieser Schule einzusehen'
      using errcode = '42501';
  end if;

  return query
  select
    ci.id,
    count(cim.user_id)::bigint
  from public.class_instances ci
  left join public.class_instance_memberships cim
    on cim.class_instance_id = ci.id
   and cim.role = 'student'
   and cim.left_at is null
  where ci.school_id = p_school_id
  group by ci.id;
end;
$$;

revoke all privileges on function public.get_school_class_student_counts(uuid)
  from public, anon;
grant execute on function public.get_school_class_student_counts(uuid)
  to authenticated, service_role;


-- Assigned teachers need the active roster of their own class. This is
-- intentionally narrower than school-lead visibility: school leads see
-- staff assignments and aggregate student counts, not student identities.
drop policy if exists "assigned teachers view class memberships"
  on public.class_instance_memberships;

create policy "assigned teachers view class memberships"
  on public.class_instance_memberships
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.class_instance_memberships actor
      where actor.class_instance_id = class_instance_memberships.class_instance_id
        and actor.user_id = (select auth.uid())
        and actor.left_at is null
        and actor.role in ('teacher'::public.user_role, 'school_admin'::public.user_role)
    )
  );
