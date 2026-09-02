-- ============================================================
-- DR1FT — Class Instance Runtime
--
-- 0014 introduced the isolation boundary. This migration moves the
-- existing mission/narrative trigger functions onto that boundary while
-- preserving the old class-less behaviour when class_instance_id is NULL.
-- ============================================================

-- ---------- RLS HELPERS ----------
-- Avoid recursive RLS policies on class_instance_memberships.

create or replace function user_is_instance_staff(
  p_instance_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from class_instance_memberships cim
    where cim.class_instance_id = p_instance_id
      and cim.user_id = p_user_id
      and cim.role in ('teacher', 'school_admin')
      and (cim.left_at is null or cim.left_at > now())
  );
$$;

drop policy if exists "instance staff manage instance" on class_instances;
create policy "instance staff manage instance"
  on class_instances for all
  using (user_is_instance_staff(id));

drop policy if exists "instance staff manage memberships" on class_instance_memberships;
create policy "instance staff manage memberships"
  on class_instance_memberships for all
  using (user_is_instance_staff(class_instance_id));

drop policy if exists "instance staff manage scenario assignments" on class_instance_scenario_assignments;
create policy "instance staff manage scenario assignments"
  on class_instance_scenario_assignments for all
  using (user_is_instance_staff(class_instance_id));

-- ---------- INSTANCE-AWARE INTERACTION COUNT ----------

create or replace function count_matching_interactions(
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
    from missions where id = p_mission_id;

  v_interaction_type := mission_event_to_interaction_type(v_condition->>'event');
  if v_interaction_type is null then
    return 0;
  end if;

  v_technique_filter := case
    when v_condition ? 'technique_filter'
      then array(select jsonb_array_elements_text(v_condition->'technique_filter'))
    else null
  end;

  select count(*) into v_count
  from user_interactions ui
  join content_items ci on ci.id = ui.content_item_id
  where ui.user_id = p_user_id
    and ui.interaction_type = v_interaction_type
    and ci.scenario_id = v_scenario_id
    and (p_class_instance_id is null or ui.class_instance_id = p_class_instance_id)
    and (
      v_technique_filter is null
      or ci.manipulation_techniques && v_technique_filter
    );

  return v_count;
end;
$$;

-- ---------- INSTANCE-AWARE MISSION UNLOCK ----------

create or replace function unlock_mission_for_instance(
  p_user_id uuid,
  p_mission_id uuid,
  p_class_instance_id uuid,
  p_delay_hours int default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into user_unlocked_missions (
    user_id, mission_id, class_instance_id, available_at
  )
  values (
    p_user_id,
    p_mission_id,
    p_class_instance_id,
    now() + (p_delay_hours || ' hours')::interval
  )
  on conflict (class_instance_id, user_id, mission_id) do nothing;

  insert into domain_events (event_type, user_id, class_instance_id, payload)
  values (
    'MissionStarted',
    p_user_id,
    p_class_instance_id,
    jsonb_build_object(
      'missionId', p_mission_id,
      'classInstanceId', p_class_instance_id,
      'availableInHours', p_delay_hours
    )
  );
end;
$$;

-- ---------- INSTANCE-AWARE MISSION EVALUATION ----------

create or replace function evaluate_missions_after_interaction()
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
  v_is_gated boolean;
  v_is_unlocked boolean;
begin
  select scenario_id into v_scenario_id
    from content_items where id = new.content_item_id;

  if v_scenario_id is null then
    return new;
  end if;

  for v_mission in
    select * from missions
    where scenario_id = v_scenario_id
      and status = 'live'
  loop
    select exists (
      select 1 from story_arc_steps where mission_id = v_mission.id
    ) into v_is_gated;

    if v_is_gated then
      select exists (
        select 1 from user_unlocked_missions
        where user_id = new.user_id
          and mission_id = v_mission.id
          and (new.class_instance_id is null or class_instance_id = new.class_instance_id)
          and available_at <= now()
      ) into v_is_unlocked;

      if not v_is_unlocked then
        continue;
      end if;
    end if;

    select exists (
      select 1 from user_mission_progress
      where user_id = new.user_id
        and mission_id = v_mission.id
        and (new.class_instance_id is null or class_instance_id = new.class_instance_id)
        and status = 'completed'
    ) into v_already_done;

    if v_already_done then
      continue;
    end if;

    v_required_count := coalesce((v_mission.trigger_condition->>'count')::int, 1);
    v_actual_count := count_matching_interactions(
      new.user_id,
      v_mission.id,
      new.class_instance_id
    );

    if v_actual_count >= v_required_count then
      insert into user_mission_progress (
        user_id, mission_id, class_instance_id, status, completed_at
      )
      values (
        new.user_id, v_mission.id, new.class_instance_id, 'completed', now()
      )
      on conflict (class_instance_id, user_id, mission_id)
        do update set status = 'completed', completed_at = now();

      insert into domain_events (
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

-- ---------- INSTANCE-AWARE NARRATIVE ADVANCEMENT ----------

create or replace function advance_story_arc_after_mission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_step record;
  v_next_step record;
  v_pacing_mode text;
  v_delay_hours int;
begin
  if new.status <> 'completed' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'completed' then
    return new;
  end if;

  for v_step in
    select sas.arc_id, sas.order_index
    from story_arc_steps sas
    join user_story_arc_progress uap
      on uap.arc_id = sas.arc_id
     and uap.user_id = new.user_id
     and (new.class_instance_id is null or uap.class_instance_id = new.class_instance_id)
    where sas.mission_id = new.mission_id
      and uap.current_step_index = sas.order_index
      and uap.status = 'in_progress'
  loop
    select mission_id, unlock_delay_hours into v_next_step
      from story_arc_steps
      where arc_id = v_step.arc_id
        and order_index = v_step.order_index + 1;

    if v_next_step.mission_id is not null then
      if new.class_instance_id is not null then
        select pacing_mode into v_pacing_mode
        from class_instance_scenario_assignments cisa
        join story_arcs sa on sa.scenario_id = cisa.scenario_id
        where cisa.class_instance_id = new.class_instance_id
          and sa.id = v_step.arc_id
        limit 1;
      else
        select csa.pacing_mode into v_pacing_mode
        from class_memberships cm
        join class_scenario_assignments csa on csa.class_id = cm.class_id
        join story_arcs sa on sa.scenario_id = csa.scenario_id
        where cm.user_id = new.user_id and sa.id = v_step.arc_id
        limit 1;
      end if;

      v_delay_hours := case
        when v_pacing_mode = 'as_designed' then coalesce(v_next_step.unlock_delay_hours, 0)
        else 0
      end;

      if new.class_instance_id is not null then
        perform unlock_mission_for_instance(
          new.user_id,
          v_next_step.mission_id,
          new.class_instance_id,
          v_delay_hours
        );
      else
        perform unlock_mission_for_user(
          new.user_id,
          v_next_step.mission_id,
          v_delay_hours
        );
      end if;

      update user_story_arc_progress
        set current_step_index = v_step.order_index + 1, updated_at = now()
        where user_id = new.user_id
          and arc_id = v_step.arc_id
          and (new.class_instance_id is null or class_instance_id = new.class_instance_id);
    else
      update user_story_arc_progress
        set status = 'completed', updated_at = now()
        where user_id = new.user_id
          and arc_id = v_step.arc_id
          and (new.class_instance_id is null or class_instance_id = new.class_instance_id);
    end if;
  end loop;

  return new;
end;
$$;

-- ---------- INSTANCE ARC START ----------

create or replace function start_arc_for_instance(
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
  insert into user_story_arc_progress (
    user_id, arc_id, class_instance_id, current_step_index, status
  )
  values (
    p_user_id, p_arc_id, p_class_instance_id, 0, 'in_progress'
  )
  on conflict (class_instance_id, user_id, arc_id) do nothing;

  select mission_id into v_first_mission_id
    from story_arc_steps
    where arc_id = p_arc_id and order_index = 0;

  if v_first_mission_id is not null then
    perform unlock_mission_for_instance(
      p_user_id,
      v_first_mission_id,
      p_class_instance_id,
      0
    );
  end if;
end;
$$;

-- ---------- INSTANCE BOOTSTRAP TRIGGERS ----------

create or replace function bootstrap_arcs_for_instance_scenario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_arc record;
  v_student record;
begin
  for v_arc in
    select id from story_arcs
    where scenario_id = new.scenario_id and status = 'live'
  loop
    for v_student in
      select user_id
      from class_instance_memberships
      where class_instance_id = new.class_instance_id
        and role = 'student'
        and (left_at is null or left_at > now())
    loop
      perform start_arc_for_instance(
        v_student.user_id,
        v_arc.id,
        new.class_instance_id
      );
    end loop;
  end loop;
  return new;
end;
$$;

create trigger trg_bootstrap_arcs_for_instance_scenario
  after insert on class_instance_scenario_assignments
  for each row
  execute function bootstrap_arcs_for_instance_scenario();

create or replace function bootstrap_arcs_for_instance_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_arc record;
begin
  if new.role <> 'student' then
    return new;
  end if;

  for v_arc in
    select sa.id
    from story_arcs sa
    join class_instance_scenario_assignments cisa
      on cisa.scenario_id = sa.scenario_id
    where cisa.class_instance_id = new.class_instance_id
      and sa.status = 'live'
  loop
    perform start_arc_for_instance(
      new.user_id,
      v_arc.id,
      new.class_instance_id
    );
  end loop;
  return new;
end;
$$;

create trigger trg_bootstrap_arcs_for_instance_member
  after insert on class_instance_memberships
  for each row
  execute function bootstrap_arcs_for_instance_member();
