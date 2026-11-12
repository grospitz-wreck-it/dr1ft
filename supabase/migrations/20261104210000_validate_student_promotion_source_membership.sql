-- A teacher may promote only a student who is currently an active member
-- of the source class instance. The target must be the linked next instance.
-- This prevents arbitrary user IDs (including users from another school)
-- from being injected into a class during a school-year transition.

create or replace function public.copy_student_to_class_instance(
  p_previous_instance_id uuid,
  p_new_instance_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Nicht authentifiziert';
  end if;

  if p_previous_instance_id is null
     or p_new_instance_id is null
     or p_user_id is null then
    raise exception 'Ungültige Klassen- oder Schülerzuordnung';
  end if;

  if not exists (
    select 1
    from public.class_instance_memberships
    where class_instance_id = p_previous_instance_id
      and user_id = auth.uid()
      and role in ('teacher', 'school_admin')
      and left_at is null
  ) then
    raise exception 'Keine Berechtigung für diese Klasse'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.class_instances source
    join public.class_instances target
      on target.id = p_new_instance_id
     and target.previous_instance_id = source.id
     and target.school_id = source.school_id
    where source.id = p_previous_instance_id
  ) then
    raise exception 'Zielklasse gehört nicht zum angegebenen Schuljahreswechsel'
      using errcode = '22023';
  end if;

  -- The learner must actually belong to the source instance at the time
  -- the promotion is performed. Historical/left memberships are excluded.
  if not exists (
    select 1
    from public.class_instance_memberships learner
    where learner.class_instance_id = p_previous_instance_id
      and learner.user_id = p_user_id
      and learner.role = 'student'
      and learner.left_at is null
  ) then
    raise exception 'Die Person ist kein aktives Mitglied der Ausgangsklasse'
      using errcode = '42501';
  end if;

  insert into public.class_instance_memberships (
    class_instance_id,
    user_id,
    role
  )
  values (
    p_new_instance_id,
    p_user_id,
    'student'
  )
  on conflict (class_instance_id, user_id) do nothing;
end;
$$;

revoke all privileges on function public.copy_student_to_class_instance(uuid, uuid, uuid)
  from public, anon;
grant execute on function public.copy_student_to_class_instance(uuid, uuid, uuid)
  to authenticated, service_role;

comment on function public.copy_student_to_class_instance(uuid, uuid, uuid) is
  'Promotes only an active student from the authorized source class instance into its linked next instance in the same school.';
