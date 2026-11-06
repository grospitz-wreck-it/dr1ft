-- DR1FT: write learner interactions through a validated server-side RPC.
--
-- Player code uses the shared recordInteraction() helper. The live table
-- policy currently permits clients to INSERT/UPDATE/DELETE their own raw
-- interaction rows. Since INSERT fires mission-evaluation triggers, direct
-- writes can forge or alter the event stream used for mission completion.
--
-- This RPC binds identity to auth.uid(), validates active student membership,
-- content visibility and class-instance scenario assignment, and writes the
-- timestamp/user id server-side. Browser roles receive SELECT only.

create or replace function public.record_user_interaction(
  p_content_item_id uuid,
  p_interaction_type text,
  p_class_instance_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_scenario_id uuid;
  v_content_instance_id uuid;
  v_content_status text;
  v_interaction_id uuid;
  v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
begin
  if v_user_id is null then
    raise exception 'Nicht authentifiziert'
      using errcode = '42501';
  end if;

  if p_content_item_id is null or p_class_instance_id is null then
    raise exception 'Content und Klasseninstanz sind erforderlich'
      using errcode = '22023';
  end if;

  if p_interaction_type is null or p_interaction_type not in (
    'view', 'like', 'share', 'report', 'ignore', 'comment', 'follow', 'block',
    'inspect_source', 'inspect_media', 'inspect_context', 'inspect_profile',
    'compare_information', 'learning_task_response'
  ) then
    raise exception 'Ungültiger Interaktionstyp'
      using errcode = '22023';
  end if;

  if jsonb_typeof(v_metadata) <> 'object'
     or octet_length(v_metadata::text) > 16384 then
    raise exception 'Ungültige oder zu große Interaktionsmetadaten'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.class_instances ci
    join public.class_instance_memberships cim
      on cim.class_instance_id = ci.id
    where ci.id = p_class_instance_id
      and ci.is_active = true
      and cim.user_id = v_user_id
      and cim.role = 'student'::public.user_role
      and cim.left_at is null
  ) then
    raise exception 'Keine aktive Schülermitgliedschaft in dieser Klasseninstanz'
      using errcode = '42501';
  end if;

  select ci.scenario_id, ci.class_instance_id, ci.status::text
    into v_scenario_id, v_content_instance_id, v_content_status
  from public.content_items ci
  where ci.id = p_content_item_id;

  if not found or v_content_status <> 'live' then
    raise exception 'Content ist nicht verfügbar'
      using errcode = '42501';
  end if;

  if v_content_instance_id is not null
     and v_content_instance_id <> p_class_instance_id then
    raise exception 'Content gehört zu einer anderen Klasseninstanz'
      using errcode = '42501';
  end if;

  if v_scenario_id is not null and not exists (
    select 1
    from public.class_instance_scenario_assignments csa
    where csa.class_instance_id = p_class_instance_id
      and csa.scenario_id = v_scenario_id
      and (csa.scheduled_start_at is null or csa.scheduled_start_at <= now())
      and (csa.scheduled_end_at is null or csa.scheduled_end_at > now())
  ) then
    raise exception 'Szenario ist dieser Klasseninstanz aktuell nicht zugewiesen'
      using errcode = '42501';
  end if;

  -- A view is a once-per-learner/content/class observation. Repeated
  -- visibility callbacks or client retries must not inflate mission counts.
  if p_interaction_type = 'view' then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        v_user_id::text || ':' || p_class_instance_id::text || ':' || p_content_item_id::text,
        0
      )
    );

    select ui.id
      into v_interaction_id
    from public.user_interactions ui
    where ui.user_id = v_user_id
      and ui.content_item_id = p_content_item_id
      and ui.class_instance_id = p_class_instance_id
      and ui.interaction_type = 'view'
    limit 1;

    if v_interaction_id is not null then
      return v_interaction_id;
    end if;
  end if;

  insert into public.user_interactions (
    user_id,
    content_item_id,
    interaction_type,
    class_instance_id,
    metadata
  )
  values (
    v_user_id,
    p_content_item_id,
    p_interaction_type,
    p_class_instance_id,
    v_metadata
  )
  returning id into v_interaction_id;

  return v_interaction_id;
end;
$function$;

revoke all on function public.record_user_interaction(uuid, text, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.record_user_interaction(uuid, text, uuid, jsonb)
  to authenticated, service_role;

drop policy if exists "members manage own scoped interactions"
  on public.user_interactions;

create policy "users read own scoped interactions"
  on public.user_interactions
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and class_instance_id is not null
    and public.is_member_of_class_instance(class_instance_id)
  );

revoke insert, update, delete on table public.user_interactions
  from anon, authenticated;
grant select on table public.user_interactions
  to authenticated;

comment on function public.record_user_interaction(uuid, text, uuid, jsonb) is
  'Authenticated student interaction ingestion. Binds user identity to auth.uid(), validates active class-instance membership and live/assigned content, then writes the immutable raw event used by mission evaluation.';
