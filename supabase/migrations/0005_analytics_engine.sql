-- ============================================================
-- DR1FT — Analytics Engine
--
-- Prinzip (03_EDUCATIONAL_PHILOSOPHY): Fortschritt entsteht aus Evidenz
-- über Zeit, nicht aus Punkten für Einzelaktionen. Deshalb hängt sich
-- die Analytics Engine an MISSION-Abschlüsse (reflektierte, bewusste
-- Lerneinheiten), nicht an jede einzelne Interaktion wie "PostViewed" —
-- sonst würde bloßes Scrollen fälschlich als Kompetenzgewinn zählen.
-- ============================================================

-- Missionen brauchen eine explizite Verknüpfung zu den Kompetenzen,
-- die sie fördern (bisher nur implizit über den Reflexions-Content).
alter table missions
  add column target_competencies uuid[] not null default '{}';

-- ---------- LEVEL-BERECHNUNG ----------
-- Bewusst simpel und in einer eigenen Funktion gekapselt, damit die
-- Formel später verfeinert werden kann (z.B. Gewichtung nach
-- Mission-Schwierigkeit), ohne den Trigger anzufassen.
create or replace function compute_competency_level(p_evidence_count int)
returns smallint
language sql
immutable
as $$
  select least(5, greatest(1, 1 + floor(p_evidence_count / 2.0)))::smallint;
$$;

-- ---------- TRIGGER: Kompetenz-Fortschritt nach Mission-Abschluss ----------

create or replace function update_competency_progress_after_mission()
returns trigger
language plpgsql
security definer
as $$
declare
  v_mission missions%rowtype;
  v_competency_id uuid;
  v_current_evidence jsonb;
  v_new_evidence jsonb;
  v_new_count int;
  v_new_level smallint;
begin
  -- nur reagieren, wenn der Status neu auf 'completed' wechselt
  if new.status <> 'completed' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'completed' then
    return new; -- bereits verarbeitet, kein doppeltes Update
  end if;

  select * into v_mission from missions where id = new.mission_id;
  if v_mission.id is null then
    return new;
  end if;

  foreach v_competency_id in array v_mission.target_competencies
  loop
    select evidence into v_current_evidence
      from user_competency_progress
      where user_id = new.user_id and competency_id = v_competency_id;

    v_current_evidence := coalesce(v_current_evidence, '[]'::jsonb);
    v_new_evidence := v_current_evidence || jsonb_build_array(
      jsonb_build_object(
        'missionId', v_mission.id,
        'missionSlug', v_mission.slug,
        'completedAt', now()
      )
    );
    v_new_count := jsonb_array_length(v_new_evidence);
    v_new_level := compute_competency_level(v_new_count);

    insert into user_competency_progress (user_id, competency_id, evidence, level, updated_at)
    values (new.user_id, v_competency_id, v_new_evidence, v_new_level, now())
    on conflict (user_id, competency_id)
      do update set
        evidence = v_new_evidence,
        level = v_new_level,
        updated_at = now();

    insert into domain_events (event_type, user_id, payload)
    values (
      'CompetencyUpdated',
      new.user_id,
      jsonb_build_object('competencyId', v_competency_id, 'level', v_new_level)
    );
  end loop;

  return new;
end;
$$;

create trigger trg_update_competency_progress_after_mission
  after insert or update on user_mission_progress
  for each row
  execute function update_competency_progress_after_mission();
