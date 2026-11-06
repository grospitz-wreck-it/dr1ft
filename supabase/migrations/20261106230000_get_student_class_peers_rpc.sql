-- DR1FT: provide a minimal, class-scoped peer list for student sharing.
--
-- The raw interaction table is becoming private to each learner. The Player
-- share dialog previously inferred classmates from other users' interaction
-- rows, which is no longer compatible with least-privilege event visibility.
-- This RPC exposes only active student profile identifiers and display names
-- to another active student in the same class instance.

create or replace function public.get_student_class_peers(
  p_class_instance_id uuid
)
returns table (
  peer_user_id uuid,
  display_name text,
  username text
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Nicht authentifiziert'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.class_instance_memberships own
    join public.class_instances ci on ci.id = own.class_instance_id
    where own.class_instance_id = p_class_instance_id
      and own.user_id = v_user_id
      and own.role = 'student'::public.user_role
      and own.left_at is null
      and ci.is_active = true
  ) then
    raise exception 'Keine aktive Schülermitgliedschaft in dieser Klasseninstanz'
      using errcode = '42501';
  end if;

  return query
  select
    up.id,
    coalesce(up.display_name, up.username, 'DR1FT User')::text,
    coalesce(up.username, 'user')::text
  from public.class_instance_memberships peer
  join public.user_profiles up on up.id = peer.user_id
  where peer.class_instance_id = p_class_instance_id
    and peer.role = 'student'::public.user_role
    and peer.left_at is null
    and peer.user_id <> v_user_id
  order by coalesce(up.display_name, up.username, 'DR1FT User'), up.id;
end;
$function$;

revoke all on function public.get_student_class_peers(uuid)
  from public, anon, authenticated;
grant execute on function public.get_student_class_peers(uuid)
  to authenticated, service_role;

comment on function public.get_student_class_peers(uuid) is
  'Returns only active student peer IDs and display names to a student with active membership in the same class instance. Used by the Player share dialog.';
