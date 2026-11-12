-- Keep the denormalized class_instance_id column populated for every
-- MissionCompleted event. RLS and Realtime subscriptions filter on this
-- column; putting the value only inside payload is not sufficient.

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
    select m.*
    from public.missions m
    where m.scenario_id = v_scenario_id
      and m.status = 'live'
      and exists (
        select 1
        from public.class_instance_scenario_assignments csa
        where csa.class_instance_id = new.class_instance_id
          and csa.scenario_id = m.scenario_id
          and (csa.scheduled_start_at is null or csa.scheduled_start_at <= now())
          and (csa.scheduled_end_at is null or csa.scheduled_end_at > now())
      )
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

      insert into public.domain_events (
        event_type, user_id, class_instance_id, payload
      )
      values (
        'MissionCompleted',
        new.user_id,
        new.class_instance_id,
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

comment on function public.evaluate_missions_after_interaction() is
  'Completes assigned, in-window missions from class-instance interactions and writes class-scoped domain events.';
