-- ============================================================
-- DR1FT — Jahrgangs-Auswertung
--
-- Analog zu 0003_teacher_dashboard_views.sql, aber über alle Klassen
-- eines Jahrgangs (school_id + grade_level) aggregiert statt nur eine
-- einzelne Klasse. Zugriff: Lehrkraft muss mindestens eine Klasse in
-- genau diesem Jahrgang unterrichten (is_teacher_of_grade()).
-- ============================================================

create or replace function is_teacher_of_grade(p_school_id uuid, p_grade_level int)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from class_memberships cm
    join classes cl on cl.id = cm.class_id
    where cm.user_id = auth.uid()
      and cm.role in ('teacher', 'school_admin')
      and cl.school_id = p_school_id
      and cl.grade_level = p_grade_level
  );
$$;

create view grade_competency_overview as
select
  cl.school_id,
  cl.grade_level,
  ucp.competency_id,
  c.slug as competency_slug,
  c.title as competency_title,
  round(avg(ucp.level)::numeric, 2) as avg_level,
  count(distinct cm.user_id) as student_count
from classes cl
join class_memberships cm on cm.class_id = cl.id and cm.role = 'student'
join user_competency_progress ucp on ucp.user_id = cm.user_id
join competencies c on c.id = ucp.competency_id
where cl.grade_level is not null
group by cl.school_id, cl.grade_level, ucp.competency_id, c.slug, c.title;

create view grade_mission_overview as
select
  cl.school_id,
  cl.grade_level,
  m.id as mission_id,
  m.title as mission_title,
  count(*) filter (where ump.status = 'completed') as completed_count,
  count(distinct cm.user_id) as student_count
from classes cl
join class_memberships cm on cm.class_id = cl.id and cm.role = 'student'
join class_scenario_assignments csa on csa.class_id = cl.id
join missions m on m.scenario_id = csa.scenario_id
left join user_mission_progress ump on ump.mission_id = m.id and ump.user_id = cm.user_id
where cl.grade_level is not null
group by cl.school_id, cl.grade_level, m.id, m.title;

-- Wie viele Klassen dieses Jahrgangs gibt es überhaupt (Kontext fürs Dashboard)
create view grade_class_overview as
select school_id, grade_level, count(*) as class_count
from classes
where grade_level is not null
group by school_id, grade_level;
