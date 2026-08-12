-- ============================================================
-- DR1FT — Narrative Engine
--
-- Verknüpft Mission-, NPC- und Feed-Engine zeitlich: eine Story-Arc
-- ist eine geordnete Folge von Missionen innerhalb eines Szenarios.
-- Missionen OHNE Zuordnung zu einer Arc bleiben wie bisher frei
-- verfügbar (kein Bruch mit 0004/0005) — Narrative ist ein optionales
-- Gating, kein Zwang für jede Mission.
-- ============================================================

create table story_arcs (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid references scenarios(id) on delete cascade,
  slug text unique not null,
  title text not null,
  description text,
  status content_status not null default 'draft',
  created_at timestamptz not null default now()
);

create table story_arc_steps (
  id uuid primary key default gen_random_uuid(),
  arc_id uuid references story_arcs(id) on delete cascade,
  order_index int not null,
  mission_id uuid references missions(id) on delete cascade,
  unique (arc_id, order_index),
  unique (arc_id, mission_id)
);

-- Fortschritt eines Nutzers innerhalb einer Arc
create table user_story_arc_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_profiles(id) on delete cascade,
  arc_id uuid references story_arcs(id) on delete cascade,
  current_step_index int not null default 0,
  status text not null default 'in_progress', -- 'in_progress' | 'completed'
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, arc_id)
);

-- Explizite Freischaltung: welche Missionen sind für welchen Nutzer
-- durch Narrative-Fortschritt bereits sichtbar. Missionen, die zu
-- KEINER Arc gehören, brauchen hier keinen Eintrag (bleiben frei).
create table user_unlocked_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_profiles(id) on delete cascade,
  mission_id uuid references missions(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, mission_id)
);

alter table user_story_arc_progress enable row level security;
alter table user_unlocked_missions enable row level security;

create policy "users manage own arc progress"
  on user_story_arc_progress for all
  using (auth.uid() = user_id);

create policy "users manage own unlocked missions"
  on user_unlocked_missions for all
  using (auth.uid() = user_id);

-- ---------- HELPER: Mission für Nutzer freischalten ----------

create or replace function unlock_mission_for_user(p_user_id uuid, p_mission_id uuid)
returns void
language plpgsql
as $$
begin
  insert into user_unlocked_missions (user_id, mission_id)
  values (p_user_id, p_mission_id)
  on conflict (user_id, mission_id) do nothing;

  insert into domain_events (event_type, user_id, payload)
  values ('MissionStarted', p_user_id, jsonb_build_object('missionId', p_mission_id));
end;
$$;

-- ---------- HELPER: Arc für Nutzer starten (idempotent) ----------

create or replace function start_arc_for_user(p_user_id uuid, p_arc_id uuid)
returns void
language plpgsql
as $$
declare
  v_first_mission_id uuid;
begin
  insert into user_story_arc_progress (user_id, arc_id, current_step_index, status)
  values (p_user_id, p_arc_id, 0, 'in_progress')
  on conflict (user_id, arc_id) do nothing;

  select mission_id into v_first_mission_id
    from story_arc_steps
    where arc_id = p_arc_id and order_index = 0;

  if v_first_mission_id is not null then
    perform unlock_mission_for_user(p_user_id, v_first_mission_id);
  end if;
end;
$$;

-- ---------- TRIGGER: Arc-Fortschritt nach Mission-Abschluss ----------

create or replace function advance_story_arc_after_mission()
returns trigger
language plpgsql
security definer
as $$
declare
  v_step record;
  v_next_mission_id uuid;
  v_next_step_exists boolean;
begin
  if new.status <> 'completed' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'completed' then
    return new;
  end if;

  -- Ist diese Mission Teil einer Arc, in der der Nutzer sich gerade befindet?
  for v_step in
    select sas.arc_id, sas.order_index
    from story_arc_steps sas
    join user_story_arc_progress uap
      on uap.arc_id = sas.arc_id and uap.user_id = new.user_id
    where sas.mission_id = new.mission_id
      and uap.current_step_index = sas.order_index
      and uap.status = 'in_progress'
  loop
    select mission_id into v_next_mission_id
      from story_arc_steps
      where arc_id = v_step.arc_id and order_index = v_step.order_index + 1;

    if v_next_mission_id is not null then
      perform unlock_mission_for_user(new.user_id, v_next_mission_id);
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

create trigger trg_advance_story_arc_after_mission
  after insert or update on user_mission_progress
  for each row
  execute function advance_story_arc_after_mission();

-- ---------- BOOTSTRAP: Arc starten, sobald Szenario einer Klasse zugewiesen wird ----------

create or replace function bootstrap_arcs_for_class_scenario()
returns trigger
language plpgsql
security definer
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
      select user_id from class_memberships
      where class_id = new.class_id and role = 'student'
    loop
      perform start_arc_for_user(v_student.user_id, v_arc.id);
    end loop;
  end loop;
  return new;
end;
$$;

create trigger trg_bootstrap_arcs_for_class_scenario
  after insert on class_scenario_assignments
  for each row
  execute function bootstrap_arcs_for_class_scenario();

-- ---------- BOOTSTRAP: Arc starten, wenn Schüler:in später der Klasse beitritt ----------

create or replace function bootstrap_arcs_for_new_member()
returns trigger
language plpgsql
security definer
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
    join class_scenario_assignments csa on csa.scenario_id = sa.scenario_id
    where csa.class_id = new.class_id and sa.status = 'live'
  loop
    perform start_arc_for_user(new.user_id, v_arc.id);
  end loop;
  return new;
end;
$$;

create trigger trg_bootstrap_arcs_for_new_member
  after insert on class_memberships
  for each row
  execute function bootstrap_arcs_for_new_member();

-- ---------- GATING: bestehende Mission-Trigger-Auswertung erweitern ----------
-- Missionen, die Teil einer Arc sind, zählen nur, wenn sie für den
-- Nutzer freigeschaltet wurden. Missionen ohne Arc-Zuordnung bleiben
-- unverändert frei (Rückwärtskompatibilität zu 0004).

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
        where user_id = new.user_id and mission_id = v_mission.id
      ) into v_is_unlocked;

      if not v_is_unlocked then
        continue; -- narrativ noch nicht freigeschaltet -> überspringen
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
