-- ============================================================
-- DR1FT — Pacing-Modus: eine Schulstunde vs. mehrere Tage
--
-- Dieselbe Story-Arc soll sowohl kompakt (eine Unterrichtsstunde, alle
-- Schritte sofort nacheinander) als auch verteilt (über mehrere Tage,
-- mit Wartezeiten zwischen den Schritten) spielbar sein — ohne dass
-- Redaktion die Arc zweimal anlegen muss. Die Lehrkraft entscheidet das
-- bei der Zuweisung pro Klasse.
-- ============================================================

-- Wie lange nach dem Vorgänger-Schritt wird der nächste Schritt
-- freigeschaltet (nur relevant im pacing_mode 'as_designed', siehe unten).
alter table story_arc_steps
  add column unlock_delay_hours int not null default 0;

-- Pro Klassen-Zuweisung: 'compact' ignoriert alle Verzögerungen
-- (sofortige Freischaltung, geeignet für eine Schulstunde), 'as_designed'
-- respektiert die von der Redaktion hinterlegten unlock_delay_hours.
alter table class_scenario_assignments
  add column pacing_mode text not null default 'compact'
  check (pacing_mode in ('compact', 'as_designed'));

-- Freischaltung kann jetzt in der Zukunft liegen (verzögert)
alter table user_unlocked_missions
  add column available_at timestamptz not null default now();

-- ---------- unlock_mission_for_user: jetzt mit optionaler Verzögerung ----------

create or replace function unlock_mission_for_user(
  p_user_id uuid,
  p_mission_id uuid,
  p_delay_hours int default 0
)
returns void
language plpgsql
as $$
begin
  insert into user_unlocked_missions (user_id, mission_id, available_at)
  values (p_user_id, p_mission_id, now() + (p_delay_hours || ' hours')::interval)
  on conflict (user_id, mission_id) do nothing;

  -- Event wird trotzdem sofort gemeldet (App kann z.B. "neue Mission in
  -- 2 Tagen verfügbar" anzeigen) — available_at steuert nur, ob die
  -- Mission tatsächlich abschließbar ist, nicht ob sie sichtbar ist.
  insert into domain_events (event_type, user_id, payload)
  values (
    'MissionStarted',
    p_user_id,
    jsonb_build_object('missionId', p_mission_id, 'availableInHours', p_delay_hours)
  );
end;
$$;

-- ---------- advance_story_arc_after_mission: Pacing-Modus berücksichtigen ----------

create or replace function advance_story_arc_after_mission()
returns trigger
language plpgsql
security definer
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
      on uap.arc_id = sas.arc_id and uap.user_id = new.user_id
    where sas.mission_id = new.mission_id
      and uap.current_step_index = sas.order_index
      and uap.status = 'in_progress'
  loop
    select mission_id, unlock_delay_hours into v_next_step
      from story_arc_steps
      where arc_id = v_step.arc_id and order_index = v_step.order_index + 1;

    if v_next_step.mission_id is not null then
      -- Pacing-Modus der Klasse ermitteln, in der der Nutzer dieses
      -- Szenario zugewiesen bekommen hat (bei mehreren Treffern: erster).
      select csa.pacing_mode into v_pacing_mode
        from class_memberships cm
        join class_scenario_assignments csa on csa.class_id = cm.class_id
        join story_arcs sa on sa.scenario_id = csa.scenario_id
        where cm.user_id = new.user_id and sa.id = v_step.arc_id
        limit 1;

      v_delay_hours := case
        when v_pacing_mode = 'as_designed' then coalesce(v_next_step.unlock_delay_hours, 0)
        else 0
      end;

      perform unlock_mission_for_user(new.user_id, v_next_step.mission_id, v_delay_hours);
      update user_story_arc_progress
        set current_step_index = v_step.order_index + 1, updated_at = now()
        where user_id = new.user_id and arc_id = v_step.arc_id;
    else
      update user_story_arc_progress
        set status = 'completed', updated_at = now()
        where user_id = new.user_id and arc_id = v_step.arc_id;
    end if;
  end loop;

  return new;
end;
$$;

-- ---------- Gating-Prüfung: jetzt auch available_at respektieren ----------

create or replace function evaluate_missions_after_interaction()
returns trigger
language plpgsql
security definer
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
          and available_at <= now()  -- NEU: respektiert Pacing-Verzögerung
      ) into v_is_unlocked;

      if not v_is_unlocked then
        continue;
      end if;
    end if;

    select exists (
      select 1 from user_mission_progress
      where user_id = new.user_id
        and mission_id = v_mission.id
        and status = 'completed'
    ) into v_already_done;

    if v_already_done then
      continue;
    end if;

    v_required_count := coalesce((v_mission.trigger_condition->>'count')::int, 1);
    v_actual_count := count_matching_interactions(new.user_id, v_mission.id);

    if v_actual_count >= v_required_count then
      insert into user_mission_progress (user_id, mission_id, status, completed_at)
      values (new.user_id, v_mission.id, 'completed', now())
      on conflict (user_id, mission_id)
        do update set status = 'completed', completed_at = now();

      insert into domain_events (event_type, user_id, payload)
      values (
        'MissionCompleted',
        new.user_id,
        jsonb_build_object(
          'missionId', v_mission.id,
          'scenarioId', v_scenario_id,
          'reflectionContentId', v_mission.reflection_content_id
        )
      );
    end if;
  end loop;

  return new;
end;
$$;
