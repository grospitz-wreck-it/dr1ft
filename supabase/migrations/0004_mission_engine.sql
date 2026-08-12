-- ============================================================
-- DR1FT — Mission Engine
--
-- Architektur-Entscheidung: Die Trigger-Auswertung läuft direkt in
-- Postgres (ausgelöst durch INSERT auf user_interactions), statt in
-- separatem Anwendungscode. Begründung: die Bedingung braucht ohnehin
-- einen DB-Query (Zählen von Interaktionen), ein externer Round-Trip
-- (Edge Function) würde nur Latenz und eine zweite Quelle der Wahrheit
-- für dieselbe Logik hinzufügen.
--
-- Die Brücke zum app-seitigen Event-Bus (packages/engine-core) läuft
-- über die neue Tabelle `domain_events`: DB schreibt hinein, die App
-- abonniert sie per Supabase Realtime und speist die Events in den
-- lokalen EventBus ein -> Analytics-, NPC-, Narrative-Engine reagieren
-- darauf, ohne selbst SQL zu kennen.
-- ============================================================

-- ---------- DOMAIN EVENTS (Brücke DB <-> App-EventBus) ----------

create table domain_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,                 -- entspricht DomainEvent["type"] in shared-types
  user_id uuid references user_profiles(id) on delete cascade,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_domain_events_user on domain_events(user_id, created_at desc);

alter table domain_events enable row level security;

create policy "users read own domain events"
  on domain_events for select
  using (auth.uid() = user_id);

-- ---------- TRIGGER CONDITION FORMAT ----------
-- missions.trigger_condition (jsonb), z.B.:
-- { "event": "PostViewed", "count": 3, "technique_filter": ["false_authority"] }
--
-- Bedeutung: Nutzer muss `count` Interaktionen vom Typ, der zu `event`
-- passt, mit Content gehabt haben, dessen manipulation_techniques mit
-- technique_filter überlappen (technique_filter optional -> dann zählt
-- jede Interaktion des Typs, unabhängig von der Technik).

-- Mapping DomainEvent-Typ -> user_interactions.interaction_type
create or replace function mission_event_to_interaction_type(p_event text)
returns text
language sql
immutable
as $$
  select case p_event
    when 'PostViewed' then 'view'
    when 'CommentCreated' then 'comment'
    else null
  end;
$$;

-- Zählt, wie oft der Nutzer die im trigger_condition beschriebene
-- Bedingung innerhalb des Szenarios der Mission bereits erfüllt hat.
create or replace function count_matching_interactions(
  p_user_id uuid,
  p_mission_id uuid
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
    return 0; -- unbekannter/nicht unterstützter Event-Typ -> nie erfüllt
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
    and (
      v_technique_filter is null
      or ci.manipulation_techniques && v_technique_filter  -- Array-Overlap
    );

  return v_count;
end;
$$;

-- Prüft nach jeder neuen Interaktion, ob dadurch eine Mission
-- abgeschlossen wird, und schreibt Fortschritt + domain_events-Eintrag.
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

create trigger trg_evaluate_missions_after_interaction
  after insert on user_interactions
  for each row
  execute function evaluate_missions_after_interaction();
