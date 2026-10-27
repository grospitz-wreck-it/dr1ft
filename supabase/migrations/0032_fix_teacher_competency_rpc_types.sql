-- ============================================================
-- DR1FT — Fix teacher competency RPC result types
-- Migration: 0031
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
    cim.user_id::uuid,
    up.display_name::text,
    ucp.competency_id::uuid,
    c.title::text,
    ucp.level::integer
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

grant execute on function
  public.get_class_student_competency_progress(uuid)
to authenticated;
