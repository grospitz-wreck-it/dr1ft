-- ============================================================
-- DR1FT — Teacher Dashboard / Report RPCs
-- Migration: 0030
--
-- Move teacher analytics completely to class_instance scope.
-- Legacy classes / class_memberships are no longer used here.
-- ============================================================


-- ============================================================
-- 1. STUDENT COMPETENCY PROGRESS
-- ============================================================

create or replace function public.get_class_student_competency_progress(
  p_class_id uuid
)
returns table(
  user_id uuid,
  display_name text,
  competency_id uuid,
  competency_title text,
  level integer
)
language plpgsql
stable
security definer
set search_path = public
as $function$
begin

  if not public.is_teacher_of_class_instance(p_class_id) then
    raise exception 'Keine Berechtigung für diese Klasseninstanz';
  end if;

  return query
  select
    cim.user_id,
    up.display_name,
    ucp.competency_id,
    c.title,
    ucp.level
  from public.class_instance_memberships cim
  join public.user_profiles up
    on up.id = cim.user_id
  left join public.user_competency_progress ucp
    on ucp.user_id = cim.user_id
   and ucp.class_instance_id = p_class_id
  left join public.competencies c
    on c.id = ucp.competency_id
  where cim.class_instance_id = p_class_id
    and cim.role = 'student'
    and cim.left_at is null
  order by
    up.display_name,
    c.title;

end;
$function$;


-- ============================================================
-- 2. STUDENT MISSION PROGRESS
-- ============================================================

create or replace function public.get_class_student_mission_progress(
  p_class_id uuid
)
returns table(
  user_id uuid,
  display_name text,
  missions_completed bigint,
  missions_total bigint
)
language plpgsql
stable
security definer
set search_path = public
as $function$
begin

  if not public.is_teacher_of_class_instance(p_class_id) then
    raise exception 'Keine Berechtigung für diese Klasseninstanz';
  end if;

  return query
  select
    cim.user_id,
    up.display_name,
    count(*) filter (
      where ump.status = 'completed'
    )::bigint as missions_completed,
    count(m.id)::bigint as missions_total
  from public.class_instance_memberships cim

  join public.user_profiles up
    on up.id = cim.user_id

  join public.class_instance_scenario_assignments csa
    on csa.class_instance_id = p_class_id

  join public.missions m
    on m.scenario_id = csa.scenario_id
   and m.status = 'live'

  left join public.user_mission_progress ump
    on ump.user_id = cim.user_id
   and ump.mission_id = m.id
   and ump.class_instance_id = p_class_id

  where cim.class_instance_id = p_class_id
    and cim.role = 'student'
    and cim.left_at is null

  group by
    cim.user_id,
    up.display_name

  order by
    up.display_name;

end;
$function$;


-- ============================================================
-- 3. CLASS MISSION BOTTLENECKS
-- ============================================================

create or replace function public.get_class_mission_bottlenecks(
  p_class_id uuid
)
returns table(
  mission_id uuid,
  mission_title text,
  completed_count bigint,
  student_count bigint,
  completion_rate numeric
)
language plpgsql
stable
security definer
set search_path = public
as $function$
begin

  if not public.is_teacher_of_class_instance(p_class_id) then
    raise exception 'Keine Berechtigung für diese Klasseninstanz';
  end if;

  return query
  select
    m.id,
    m.title,

    count(*) filter (
      where ump.status = 'completed'
    )::bigint as completed_count,

    count(distinct cim.user_id)::bigint as student_count,

    case
      when count(distinct cim.user_id) = 0
        then 0::numeric
      else round(
        (
          count(*) filter (
            where ump.status = 'completed'
          )::numeric
          /
          count(distinct cim.user_id)::numeric
        ),
        2
      )
    end as completion_rate

  from public.class_instance_memberships cim

  join public.class_instance_scenario_assignments csa
    on csa.class_instance_id = p_class_id

  join public.missions m
    on m.scenario_id = csa.scenario_id
   and m.status = 'live'

  left join public.user_mission_progress ump
    on ump.user_id = cim.user_id
   and ump.mission_id = m.id
   and ump.class_instance_id = p_class_id

  where cim.class_instance_id = p_class_id
    and cim.role = 'student'
    and cim.left_at is null

  group by
    m.id,
    m.title

  order by
    completion_rate asc,
    m.title;

end;
$function$;


-- ============================================================
-- 4. EXPLICIT EXECUTE GRANTS
-- ============================================================

grant execute on function
  public.get_class_student_competency_progress(uuid)
to authenticated;

grant execute on function
  public.get_class_student_mission_progress(uuid)
to authenticated;

grant execute on function
  public.get_class_mission_bottlenecks(uuid)
to authenticated;


-- ============================================================
-- END
-- ============================================================
