-- ============================================================
-- DR1FT — Lehrer-Dashboard: aggregierte Auswertungen
-- Grundsatz: Lehrkräfte sehen Klassen-Aggregate, keine anprangernden
-- Einzelauswertungen einzelner Schüler:innen-Fehlentscheidungen.
-- ============================================================

-- Durchschnittlicher Kompetenz-Level pro Klasse
create view class_competency_overview as
select
  cm.class_id,
  ucp.competency_id,
  c.slug as competency_slug,
  c.title as competency_title,
  round(avg(ucp.level)::numeric, 2) as avg_level,
  count(distinct cm.user_id) as student_count
from class_memberships cm
join user_competency_progress ucp on ucp.user_id = cm.user_id
join competencies c on c.id = ucp.competency_id
where cm.role = 'student'
group by cm.class_id, ucp.competency_id, c.slug, c.title;

-- Missionsfortschritt pro Klasse (wie viele Schüler:innen haben abgeschlossen)
create view class_mission_overview as
select
  cm.class_id,
  m.id as mission_id,
  m.title as mission_title,
  m.scenario_id,
  count(*) filter (where ump.status = 'completed') as completed_count,
  count(distinct cm.user_id) as student_count
from class_memberships cm
join missions m on true
left join user_mission_progress ump
  on ump.mission_id = m.id and ump.user_id = cm.user_id
where cm.role = 'student'
group by cm.class_id, m.id, m.title, m.scenario_id;

-- Aktivität pro Klasse (letzte 30 Tage) — grober Puls, kein Tracking-Overkill
create view class_activity_overview as
select
  cm.class_id,
  count(*) as interactions_last_30_days,
  count(distinct cm.user_id) as active_students
from class_memberships cm
join user_interactions ui
  on ui.user_id = cm.user_id and ui.created_at > now() - interval '30 days'
where cm.role = 'student'
group by cm.class_id;

-- RLS: nur Lehrkräfte/Admins der jeweiligen Klasse dürfen diese Views lesen.
-- Views erben nicht automatisch RLS der Basistabellen für JOIN-Zugriffe über
-- fremde user_ids, daher zusätzliche Policy-Funktion:

create or replace function is_teacher_of_class(target_class_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from class_memberships
    where class_id = target_class_id
      and user_id = auth.uid()
      and role in ('teacher', 'school_admin')
  );
$$;

-- Hinweis: Views selbst können in Postgres kein RLS haben; Zugriff wird
-- stattdessen über eine Wrapper-Funktion oder Supabase RPC mit der
-- is_teacher_of_class()-Prüfung serverseitig kontrolliert (siehe
-- supabase/functions/teacher-dashboard/ für die geprüfte Abfrage).
