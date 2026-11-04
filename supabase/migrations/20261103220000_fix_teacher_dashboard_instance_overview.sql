-- Replace legacy class-scoped dashboard checks with class-instance scope.
create or replace function public.get_class_competency_overview(p_class_id uuid)
returns table(competency_id uuid, competency_title text, avg_level numeric, student_count bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_teacher_of_class_instance(p_class_id) then
    raise exception 'Keine Berechtigung für diese Klasseninstanz';
  end if;
  return query
  select ucp.competency_id, c.title, round(avg(ucp.level)::numeric, 2), count(distinct cim.user_id)::bigint
  from public.class_instance_memberships cim
  join public.user_competency_progress ucp on ucp.user_id = cim.user_id and ucp.class_instance_id = p_class_id
  join public.competencies c on c.id = ucp.competency_id
  where cim.class_instance_id = p_class_id and cim.role = 'student' and cim.left_at is null
  group by ucp.competency_id, c.title;
end;
$$;

create or replace function public.get_class_mission_overview(p_class_id uuid)
returns table(mission_id uuid, mission_title text, completed_count bigint, student_count bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_teacher_of_class_instance(p_class_id) then
    raise exception 'Keine Berechtigung für diese Klasseninstanz';
  end if;
  return query
  select m.id, m.title, count(*) filter (where ump.status = 'completed')::bigint, count(distinct cim.user_id)::bigint
  from public.class_instance_memberships cim
  join public.class_instance_scenario_assignments csa on csa.class_instance_id = p_class_id
  join public.missions m on m.scenario_id = csa.scenario_id
  left join public.user_mission_progress ump on ump.user_id = cim.user_id and ump.mission_id = m.id and ump.class_instance_id = p_class_id
  where cim.class_instance_id = p_class_id and cim.role = 'student' and cim.left_at is null
  group by m.id, m.title;
end;
$$;

create or replace function public.get_class_activity_overview(p_class_id uuid)
returns table(interactions_last_30_days bigint, active_students bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_teacher_of_class_instance(p_class_id) then
    raise exception 'Keine Berechtigung für diese Klasseninstanz';
  end if;
  return query
  select count(*)::bigint, count(distinct cim.user_id)::bigint
  from public.class_instance_memberships cim
  join public.user_interactions ui on ui.user_id = cim.user_id and ui.created_at > now() - interval '30 days'
  where cim.class_instance_id = p_class_id and cim.role = 'student' and cim.left_at is null;
end;
$$;

grant execute on function public.get_class_competency_overview(uuid) to authenticated;
grant execute on function public.get_class_mission_overview(uuid) to authenticated;
grant execute on function public.get_class_activity_overview(uuid) to authenticated;
