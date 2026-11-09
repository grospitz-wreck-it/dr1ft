-- DR1FT: persist the username during self-service class joining.
-- The existing two-argument RPC is retained for older deployed clients.
-- New Player clients call this overload so every new student account has
-- a durable username in user_profiles before the class membership is added.

create or replace function public.join_class_as_student(
  p_access_code text,
  p_display_name text,
  p_username text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $function$
declare
  v_instance_id uuid;
  v_user_id uuid := auth.uid();
  v_username text := trim(coalesce(p_username, ''));
  v_existing_username text;
begin
  if v_user_id is null then
    raise exception 'Nicht authentifiziert' using errcode = '42501';
  end if;

  if nullif(trim(coalesce(p_access_code, '')), '') is null then
    raise exception 'Bitte gib einen Zugangscode ein';
  end if;

  if nullif(trim(coalesce(p_display_name, '')), '') is null then
    raise exception 'Bitte gib einen Anzeigenamen ein';
  end if;

  if v_username !~ '^[A-Za-z0-9]{2,32}$' then
    raise exception 'Der Nutzername darf 2 bis 32 Buchstaben oder Zahlen enthalten';
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

  if exists (
    select 1
    from public.class_instance_memberships cim
    where cim.user_id = v_user_id
      and cim.role = 'student'::public.user_role
      and cim.left_at is null
      and cim.class_instance_id <> v_instance_id
  ) then
    raise exception 'Du bist bereits einer anderen aktiven Klasse zugeordnet. Bitte wende dich an deine Lehrkraft.'
      using errcode = '23505';
  end if;

  if exists (
    select 1
    from public.class_instance_memberships cim
    where cim.user_id = v_user_id
      and cim.class_instance_id = v_instance_id
      and cim.role <> 'student'::public.user_role
  ) then
    raise exception 'Dieser Zugang ist bereits einer anderen Rolle zugeordnet.'
      using errcode = '42501';
  end if;

  select up.username
    into v_existing_username
  from public.user_profiles up
  where up.id = v_user_id;

  if v_existing_username is not null and lower(v_existing_username) <> lower(v_username) then
    raise exception 'Für dieses Konto ist bereits ein anderer Nutzername hinterlegt.'
      using errcode = '23505';
  end if;

  if exists (
    select 1
    from public.user_profiles up
    where lower(up.username) = lower(v_username)
      and up.id <> v_user_id
  ) then
    raise exception 'Dieser Nutzername ist bereits vergeben.'
      using errcode = '23505';
  end if;

  insert into public.user_profiles (id, display_name, username)
  values (v_user_id, trim(p_display_name), v_username)
  on conflict (id) do update
    set display_name = excluded.display_name,
        username = coalesce(user_profiles.username, excluded.username);

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
    set left_at = null;

  return v_instance_id;
end;
$function$;

revoke all on function public.join_class_as_student(text, text, text) from public, anon;
grant execute on function public.join_class_as_student(text, text, text) to authenticated;

comment on function public.join_class_as_student(text, text, text) is
  'Authenticated student self-join. Persists the globally unique username and creates the active class-instance membership.';
