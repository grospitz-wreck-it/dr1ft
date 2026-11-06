-- Prevent direct RPC callers from using the membership helper to enumerate
-- whether an arbitrary user belongs to a class instance.
-- RLS policies call this helper with the authenticated user's own identity.
-- Internal arc/mission bootstrap functions perform their own target-user
-- membership validation and no longer rely on the client-facing helper.

create or replace function public.is_member_of_class_instance(
  p_instance_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_user_id = auth.uid()
    and exists (
      select 1
      from public.class_instance_memberships cim
      where cim.class_instance_id = p_instance_id
        and cim.user_id = auth.uid()
        and cim.left_at is null
    );
$$;

create or replace function public.start_arc_for_user(
  p_user_id uuid,
  p_arc_id uuid,
  p_class_instance_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first_mission_id uuid;
begin
  if not exists (
    select 1
    from public.class_instance_memberships cim
    where cim.class_instance_id = p_class_instance_id
      and cim.user_id = p_user_id
      and cim.left_at is null
  ) then
    raise exception 'User ist kein Mitglied der Klasseninstanz'
      using errcode = '42501';
  end if;

  insert into public.user_story_arc_progress (
    user_id, arc_id, class_instance_id, current_step_index, status
  )
  values (
    p_user_id, p_arc_id, p_class_instance_id, 0, 'in_progress'
  )
  on conflict (user_id, arc_id, class_instance_id) do nothing;

  select mission_id
    into v_first_mission_id
  from public.story_arc_steps
  where arc_id = p_arc_id
    and order_index = 0;

  if v_first_mission_id is not null then
    perform public.unlock_mission_for_user(
      p_user_id, v_first_mission_id, p_class_instance_id
    );
  end if;
end;
$$;

create or replace function public.unlock_mission_for_user(
  p_user_id uuid,
  p_mission_id uuid,
  p_class_instance_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.class_instance_memberships cim
    where cim.class_instance_id = p_class_instance_id
      and cim.user_id = p_user_id
      and cim.left_at is null
  ) then
    raise exception 'User ist kein Mitglied der Klasseninstanz'
      using errcode = '42501';
  end if;

  insert into public.user_unlocked_missions (
    user_id, mission_id, class_instance_id
  )
  values (
    p_user_id, p_mission_id, p_class_instance_id
  )
  on conflict (user_id, mission_id, class_instance_id) do nothing;

  insert into public.domain_events (
    event_type, user_id, class_instance_id, payload
  )
  values (
    'MissionStarted',
    p_user_id,
    p_class_instance_id,
    jsonb_build_object(
      'missionId', p_mission_id,
      'classInstanceId', p_class_instance_id
    )
  );
end;
$$;

revoke all privileges on function public.start_arc_for_user(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke all privileges on function public.unlock_mission_for_user(uuid, uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.start_arc_for_user(uuid, uuid, uuid)
  to service_role;
grant execute on function public.unlock_mission_for_user(uuid, uuid, uuid)
  to service_role;
