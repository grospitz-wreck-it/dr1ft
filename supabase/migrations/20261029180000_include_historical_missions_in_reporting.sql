-- Include completed historical missions from this class instance in reports.
-- The currently assigned module is only one part of a student's class history.
create or replace function public.get_class_student_mission_progress(p_class_id uuid)
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
  with students as (
    select cim.user_id, up.display_name
    from public.class_instance_memberships cim
    join public.user_profiles up on up.id = cim.user_id
    where cim.class_instance_id = p_class_id
      and cim.role = 'student'
      and cim.left_at is null
  ),
  mission_scope as (
    select distinct m.id as mission_id
    from public.class_instance_scenario_assignments csa
    join public.missions m on m.scenario_id = csa.scenario_id
    where csa.class_instance_id = p_class_id
      and m.status = 'live'
    union
    select distinct ump.mission_id
    from public.user_mission_progress ump
    where ump.class_instance_id = p_class_id
  )
  select
    s.user_id,
    s.display_name,
    count(*) filter (where ump.status = 'completed')::bigint,
    count(ms.mission_id)::bigint
  from students s
  left join mission_scope ms on true
  left join public.user_mission_progress ump
    on ump.user_id = s.user_id
   and ump.mission_id = ms.mission_id
   and ump.class_instance_id = p_class_id
  group by s.user_id, s.display_name
  order by s.display_name;
end;
$function$;

grant execute on function public.get_class_student_mission_progress(uuid) to authenticated;
