-- DR1FT: expose only the visible class feed's aggregate like details.
--
-- user_interactions is now readable only by its owner. The feed still needs
-- class-scoped like counts and the display names of active classmates who
-- liked each visible post. This RPC returns only those fields for explicitly
-- supplied, live, currently visible post IDs in the caller's own class.

create or replace function public.get_class_instance_post_likes(
  p_class_instance_id uuid,
  p_content_item_ids uuid[]
)
returns table (
  content_item_id uuid,
  user_id uuid,
  display_name text,
  username text,
  avatar_seed text
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

  if p_class_instance_id is null or p_content_item_ids is null then
    raise exception 'Klasseninstanz und Beitragsliste sind erforderlich'
      using errcode = '22023';
  end if;

  if cardinality(p_content_item_ids) > 1000 then
    raise exception 'Zu viele Beiträge für eine Anfrage'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.class_instances ci
    join public.class_instance_memberships own
      on own.class_instance_id = ci.id
    where ci.id = p_class_instance_id
      and ci.is_active = true
      and own.user_id = v_user_id
      and own.role = 'student'::public.user_role
      and own.left_at is null
  ) then
    raise exception 'Keine aktive Schülermitgliedschaft in dieser Klasseninstanz'
      using errcode = '42501';
  end if;

  return query
  select
    ui.content_item_id,
    ui.user_id,
    coalesce(up.display_name, 'DR1FT User')::text,
    coalesce(up.username, 'user')::text,
    coalesce(up.avatar_seed, ui.user_id::text)::text
  from public.user_interactions ui
  join public.content_items ci
    on ci.id = ui.content_item_id
  join public.class_instance_memberships liker
    on liker.class_instance_id = p_class_instance_id
   and liker.user_id = ui.user_id
   and liker.role = 'student'::public.user_role
   and liker.left_at is null
  left join public.user_profiles up
    on up.id = ui.user_id
  where ui.class_instance_id = p_class_instance_id
    and ui.interaction_type = 'like'
    and ui.content_item_id = any(p_content_item_ids)
    and ci.status = 'live'::public.content_status
    and ci.type = 'post'::public.content_type
    and (ci.class_instance_id is null or ci.class_instance_id = p_class_instance_id)
    and (
      ci.scenario_id is null
      or exists (
        select 1
        from public.class_instance_scenario_assignments csa
        where csa.class_instance_id = p_class_instance_id
          and csa.scenario_id = ci.scenario_id
          and (csa.scheduled_start_at is null or csa.scheduled_start_at <= now())
          and (csa.scheduled_end_at is null or csa.scheduled_end_at > now())
      )
    );
end;
$function$;

revoke all on function public.get_class_instance_post_likes(uuid, uuid[])
  from public, anon, authenticated;
grant execute on function public.get_class_instance_post_likes(uuid, uuid[])
  to authenticated, service_role;

comment on function public.get_class_instance_post_likes(uuid, uuid[]) is
  'Returns only active student likes and display fields for explicitly supplied live posts visible in the caller''s active class instance. Does not expose raw interaction metadata or other event types.';
