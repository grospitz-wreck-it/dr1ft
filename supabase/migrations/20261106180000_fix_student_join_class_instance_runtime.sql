-- DR1FT: complete the student join cutover to class instances.
--
-- The live function still writes to legacy classes/class_memberships, while
-- the active Player runtime resolves membership through
-- class_instance_memberships. The intended earlier repair migration
-- 20260930100000 is absent from the remote migration history, so this is a
-- new forward migration rather than a replay or edit of historical SQL.
--
-- The RPC signature is unchanged; the Player join page can continue calling
-- join_class_as_student after authentication.

create or replace function public.join_class_as_student(
  p_access_code text,
  p_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $function$
declare
  v_instance_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Nicht authentifiziert'
      using errcode = '42501';
  end if;

  if nullif(trim(coalesce(p_access_code, '')), '') is null then
    raise exception 'Bitte gib einen Zugangscode ein';
  end if;

  if nullif(trim(coalesce(p_display_name, '')), '') is null then
    raise exception 'Bitte gib einen Anzeigenamen ein';
  end if;

  select ci.id
    into v_instance_id
  from public.class_instances ci
  where ci.access_code = upper(trim(p_access_code))
    and ci.is_active = true
  limit 1;

  if v_instance_id is null then
    raise exception 'Ungültiger oder inaktiver Zugangscode';
  end if;

  insert into public.user_profiles (id, display_name)
  values (v_user_id, trim(p_display_name))
  on conflict (id) do update
    set display_name = excluded.display_name;

  insert into public.class_instance_memberships (
    class_instance_id,
    user_id,
    role
  )
  values (
    v_instance_id,
    v_user_id,
    'student'::public.user_role
  )
  on conflict (class_instance_id, user_id) do update
    set role = excluded.role,
        left_at = null;

  return v_instance_id;
end;
$function$;

comment on function public.join_class_as_student(text, text) is
  'Authenticated student self-join by class-instance access code. Creates the active class_instance_memberships row used by the current Player runtime; does not write legacy class_memberships.';
