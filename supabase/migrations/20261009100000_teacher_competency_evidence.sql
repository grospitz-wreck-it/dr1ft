-- DR1FT: separate RPC for stored competency evidence.
-- Existing teacher competency RPC contract remains unchanged.

create or replace function public.get_class_student_competency_evidence(
  p_class_id uuid
)
returns table(
  user_id uuid,
  competency_id uuid,
  evidence jsonb
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
    ucp.user_id::uuid,
    ucp.competency_id::uuid,
    coalesce(ucp.evidence, '[]'::jsonb)
  from public.user_competency_progress ucp
  join public.class_instance_memberships cim
    on cim.user_id = ucp.user_id
   and cim.class_instance_id = p_class_id
   and cim.role = 'student'
   and cim.left_at is null
  where ucp.class_instance_id = p_class_id;
end;
$function$;

grant execute on function
  public.get_class_student_competency_evidence(uuid)
to authenticated;
