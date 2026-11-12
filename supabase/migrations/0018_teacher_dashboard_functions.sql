-- ============================================================
-- DR1FT — Lehrer-Dashboard: sichere Funktionen statt Views
--
-- BEFUND: Die bisherigen Aggregat-Views (class_competency_overview etc.,
-- siehe 0003) sind normale SQL-Views. Da user_competency_progress /
-- user_interactions RLS nur "auth.uid() = user_id" erlauben, ist nicht
-- garantiert, dass eine Lehrkraft beim Abfragen der View tatsächlich
-- die Zeilen ANDERER Nutzer (ihrer Schüler:innen) sieht. Um das nicht
-- dem Zufall zu überlassen: alle klassenübergreifenden Abfragen laufen
-- jetzt über SECURITY DEFINER-Funktionen mit eingebauter Berechtigungs-
-- prüfung — das bereits bewährte Muster von is_teacher_of_class().
-- ============================================================

drop view if exists class_competency_overview;
drop view if exists class_mission_overview;
drop view if exists class_activity_overview;
drop view if exists grade_competency_overview;
drop view if exists grade_mission_overview;
drop view if exists grade_class_overview;

-- ---------- Klassen-Ebene ----------

create or replace function get_class_competency_overview(p_class_id uuid)
returns table(competency_id uuid, competency_title text, avg_level numeric, student_count bigint)
language plpgsql security definer stable as $$
begin
  if not is_teacher_of_class(p_class_id) then
    raise exception 'Keine Berechtigung für diese Klasse';
  end if;
  return query
    select ucp.competency_id, c.title, round(avg(ucp.level)::numeric, 2), count(distinct cm.user_id)
    from class_memberships cm
    join user_competency_progress ucp on ucp.user_id = cm.user_id
    join competencies c on c.id = ucp.competency_id
    where cm.class_id = p_class_id and cm.role = 'student'
    group by ucp.competency_id, c.title;
end;
$$;

create or replace function get_class_mission_overview(p_class_id uuid)
returns table(mission_id uuid, mission_title text, completed_count bigint, student_count bigint)
language plpgsql security definer stable as $$
begin
  if not is_teacher_of_class(p_class_id) then
    raise exception 'Keine Berechtigung für diese Klasse';
  end if;
  return query
    select m.id, m.title,
      count(*) filter (where ump.status = 'completed'),
      count(distinct cm.user_id)
    from class_memberships cm
    join class_scenario_assignments csa on csa.class_id = cm.class_id
    join missions m on m.scenario_id = csa.scenario_id
    left join user_mission_progress ump on ump.mission_id = m.id and ump.user_id = cm.user_id
    where cm.class_id = p_class_id and cm.role = 'student'
    group by m.id, m.title;
end;
$$;

create or replace function get_class_activity_overview(p_class_id uuid)
returns table(interactions_last_30_days bigint, active_students bigint)
language plpgsql security definer stable as $$
begin
  if not is_teacher_of_class(p_class_id) then
    raise exception 'Keine Berechtigung für diese Klasse';
  end if;
  return query
    select count(*), count(distinct cm.user_id)
    from class_memberships cm
    join user_interactions ui on ui.user_id = cm.user_id and ui.created_at > now() - interval '30 days'
    where cm.class_id = p_class_id and cm.role = 'student';
end;
$$;

-- ---------- NEU: Pro-Schüler-Übersicht ("Notenbuch") ----------
-- Bewusst kein "Gotcha" (welcher Post wurde geliked) — nur Kompetenz-
-- Level und Missions-Fortschritt, wie ein normales Lehrkraft-Notenbuch.

create or replace function get_class_student_competency_progress(p_class_id uuid)
returns table(user_id uuid, display_name text, competency_id uuid, competency_title text, level int)
language plpgsql security definer stable as $$
begin
  if not is_teacher_of_class(p_class_id) then
    raise exception 'Keine Berechtigung für diese Klasse';
  end if;
  return query
    select cm.user_id, up.display_name, ucp.competency_id, c.title, ucp.level
    from class_memberships cm
    join user_profiles up on up.id = cm.user_id
    left join user_competency_progress ucp on ucp.user_id = cm.user_id
    left join competencies c on c.id = ucp.competency_id
    where cm.class_id = p_class_id and cm.role = 'student';
end;
$$;

create or replace function get_class_student_mission_progress(p_class_id uuid)
returns table(user_id uuid, display_name text, missions_completed bigint, missions_total bigint)
language plpgsql security definer stable as $$
begin
  if not is_teacher_of_class(p_class_id) then
    raise exception 'Keine Berechtigung für diese Klasse';
  end if;
  return query
    select
      cm.user_id,
      up.display_name,
      count(*) filter (where ump.status = 'completed'),
      count(m.id)
    from class_memberships cm
    join user_profiles up on up.id = cm.user_id
    join class_scenario_assignments csa on csa.class_id = cm.class_id
    join missions m on m.scenario_id = csa.scenario_id and m.status = 'live'
    left join user_mission_progress ump on ump.mission_id = m.id and ump.user_id = cm.user_id
    where cm.class_id = p_class_id and cm.role = 'student'
    group by cm.user_id, up.display_name;
end;
$$;

-- ---------- NEU: Engpass-Analyse ("wo gibt es Schwierigkeiten") ----------
-- Missionen mit der niedrigsten Abschlussquote zuerst — zeigt der
-- Lehrkraft, wo die Klasse als Ganzes hängen bleibt (Curriculum-Problem,
-- nicht Einzelperson-Bloßstellung).

create or replace function get_class_mission_bottlenecks(p_class_id uuid)
returns table(
  mission_id uuid,
  mission_title text,
  completed_count bigint,
  student_count bigint,
  completion_rate numeric
)
language plpgsql security definer stable as $$
begin
  if not is_teacher_of_class(p_class_id) then
    raise exception 'Keine Berechtigung für diese Klasse';
  end if;
  return query
    select
      m.id,
      m.title,
      count(*) filter (where ump.status = 'completed'),
      count(distinct cm.user_id),
      case when count(distinct cm.user_id) = 0 then 0
        else round(count(*) filter (where ump.status = 'completed')::numeric / count(distinct cm.user_id), 2)
      end
    from class_memberships cm
    join class_scenario_assignments csa on csa.class_id = cm.class_id
    join missions m on m.scenario_id = csa.scenario_id and m.status = 'live'
    left join user_mission_progress ump on ump.mission_id = m.id and ump.user_id = cm.user_id
    where cm.class_id = p_class_id and cm.role = 'student'
    group by m.id, m.title
    order by 5 asc;
end;
$$;

-- ---------- Jahrgangs-Ebene (analog, ersetzt die Views aus 0011) ----------

create or replace function get_grade_competency_overview(p_school_id uuid, p_grade_level int)
returns table(competency_id uuid, competency_title text, avg_level numeric, student_count bigint)
language plpgsql security definer stable as $$
begin
  if not is_teacher_of_grade(p_school_id, p_grade_level) then
    raise exception 'Keine Berechtigung für diesen Jahrgang';
  end if;
  return query
    select ucp.competency_id, c.title, round(avg(ucp.level)::numeric, 2), count(distinct cm.user_id)
    from classes cl
    join class_memberships cm on cm.class_id = cl.id and cm.role = 'student'
    join user_competency_progress ucp on ucp.user_id = cm.user_id
    join competencies c on c.id = ucp.competency_id
    where cl.school_id = p_school_id and cl.grade_level = p_grade_level
    group by ucp.competency_id, c.title;
end;
$$;

create or replace function get_grade_mission_overview(p_school_id uuid, p_grade_level int)
returns table(mission_id uuid, mission_title text, completed_count bigint, student_count bigint)
language plpgsql security definer stable as $$
begin
  if not is_teacher_of_grade(p_school_id, p_grade_level) then
    raise exception 'Keine Berechtigung für diesen Jahrgang';
  end if;
  return query
    select m.id, m.title,
      count(*) filter (where ump.status = 'completed'),
      count(distinct cm.user_id)
    from classes cl
    join class_memberships cm on cm.class_id = cl.id and cm.role = 'student'
    join class_scenario_assignments csa on csa.class_id = cl.id
    join missions m on m.scenario_id = csa.scenario_id
    left join user_mission_progress ump on ump.mission_id = m.id and ump.user_id = cm.user_id
    where cl.school_id = p_school_id and cl.grade_level = p_grade_level
    group by m.id, m.title;
end;
$$;

create or replace function get_grade_class_overview(p_school_id uuid, p_grade_level int)
returns table(class_count bigint)
language plpgsql security definer stable as $$
begin
  if not is_teacher_of_grade(p_school_id, p_grade_level) then
    raise exception 'Keine Berechtigung für diesen Jahrgang';
  end if;
  return query
    select count(*) from classes
    where school_id = p_school_id and grade_level = p_grade_level;
end;
$$;
