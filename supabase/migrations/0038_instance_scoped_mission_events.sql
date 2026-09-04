-- ============================================================
-- DR1FT — Instance-scoped mission runtime
--
-- Closes the remaining cross-instance gap in the DB mission engine:
-- interaction counting, mission progress and emitted domain events
-- must all belong to the same class instance.
-- ============================================================

-- A mission may be completed once per class instance, not once for a
-- user globally. This preserves the same scenario's runtime semantics
-- when a learner participates again in a later school year/class.
alter table public.user_mission_progress
  drop constraint if exists user_mission_progress_user_id_mission_id_key;

create unique index if not exists idx_user_mission_progress_instance_unique
  on public.user_mission_progress(user_id, mission_id, class_instance_id);

-- Instance-scoped mission progress must not be readable/writable outside
-- an instance the current user belongs to.
drop policy if exists "users manage own mission progress" on public.user_mission_progress;
drop policy if exists "members manage own scoped mission progress" on public.user_mission_progress;

create policy "members manage own scoped mission progress"
  on public.user_mission_progress for all
  using (
    user_id = auth.uid()
    and class_instance_id is not null
    and exists (
      select 1
      from public.class_instance_memberships cim
      where cim.class_instance_id = user_mission_progress.class_instance_id
        and cim.user_id = auth.uid()
        and cim.left_at is null
    )
  )
  with check (
    user_id = auth.uid()
    and class_instance_id is not null
    and exists (
      select 1
      from public.class_instance_memberships cim
      where cim.class_instance_id = user_mission_progress.class_instance_id
        and cim.user_id = auth.uid()
        and cim.left_at is null
    )
  );

-- Count only interactions from the active class instance.
create or replace function public.count_matching_interactions(
  p_user_id uuid,
  p_mission_id uuid,
  p_class_instance_id uuid
)
returns int
language plpgsql
stable
as $$
declare
  v_condition jsonb;
  v_scenario_id uuid;
  v_interaction_type text;
  v_technique_filter text[];
  v_count int;
begin
  select trigger_condition, scenario_id
    into v_condition, v_scenario_id
    from public.missions
    where id = p_mission_id;

  v_interaction_type := public.mission_event_to_interaction_type(v_condition->>'event');
  if v_interaction_type is null then
    return 0;
  end if;

  v_technique_filter := case
    when v_condition ? 'technique_filter'
      then array(select jsonb_array_elements_text(v_condition->'technique_filter'))
    else null
  end;

  select count(*) into v_count
  from public.user_interactions ui
  join public.content_items ci on ci.id = ui.content_item_id
  where ui.user_id = p_user_id
    and ui.class_instance_id = p_class_instance_id
    and ui.interaction_type = v_interaction_type
    and ci.scenario_id = v_scenario_id
    and (
      v_technique_filter is null
      or ci.manipulation_techniques && v_technique_filter
    );

  return v_count;
end;
$$;

-- Replace the legacy trigger function with the instance-aware version.
create or replace function public.evaluate_missions_after_interaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scenario_id uuid;
  v_mission record;
  v_required_count int;
  v_actual_count int;
  v_already_done boolean;
begin
  -- Legacy/null-scoped interactions cannot advance the instance runtime.
  if new.class_instance_id is null then
    return new;
  end if;

  select scenario_id into v_scenario_id
    from public.content_items
    where id = new.content_item_id;

  if v_scenario_id is null then
    return new;
  end if;

  for v_mission in
    select * from public.missions
    where scenario_id = v_scenario_id
      and status = 'live'
  loop
    select exists (
      select 1
      from public.user_mission_progress
      where user_id = new.user_id
        and mission_id = v_mission.id
        and class_instance_id = new.class_instance_id
        and status = 'completed'
    ) into v_already_done;

    if v_already_done then
      continue;
    end if;

    v_required_count := coalesce((v_mission.trigger_condition->>'count')::int, 1);
    v_actual_count := public.count_matching_interactions(
      new.user_id,
      v_mission.id,
      new.class_instance_id
    );

    if v_actual_count >= v_required_count then
      insert into public.user_mission_progress (
        user_id, mission_id, class_instance_id, status, completed_at
      )
      values (
        new.user_id, v_mission.id, new.class_instance_id, 'completed', now()
      )
      on conflict (user_id, mission_id, class_instance_id)
        do update set status = 'completed', completed_at = now();

      insert into public.domain_events (event_type, user_id, payload)
      values (
        'MissionCompleted',
        new.user_id,
        jsonb_build_object(
          'missionId', v_mission.id,
          'scenarioId', v_scenario_id,
          'classInstanceId', new.class_instance_id,
          'reflectionContentId', v_mission.reflection_content_id
        )
      );
    end if;
  end loop;

  return new;
end;
$$;

-- Domain events are private runtime data. Keep reads user-scoped and
-- require the event payload to identify its class instance in the client.
create index if not exists idx_domain_events_instance
  on public.domain_events((payload->>'classInstanceId'), created_at desc);
