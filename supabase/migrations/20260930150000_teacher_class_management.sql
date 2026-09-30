-- DR1FT: enforce exactly one active module per class instance.
-- Assigning a new module atomically replaces the previous active assignment.

create or replace function public.upsert_class_instance_scenario_assignment(
  p_instance_id uuid,
  p_scenario_id uuid,
  p_pacing_mode text default 'compact'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_teacher_of_class_instance(p_instance_id) then
    raise exception 'Keine Berechtigung für diese Klasseninstanz';
  end if;

  if p_pacing_mode not in ('compact', 'as_designed') then
    raise exception 'Ungültiger Pacing-Modus';
  end if;

  delete from public.class_instance_scenario_assignments
  where class_instance_id = p_instance_id
    and scenario_id <> p_scenario_id;

  insert into public.class_instance_scenario_assignments (
    class_instance_id, scenario_id, assigned_by, pacing_mode
  )
  values (
    p_instance_id, p_scenario_id, auth.uid(), p_pacing_mode
  )
  on conflict (class_instance_id, scenario_id)
  do update set
    assigned_by = excluded.assigned_by,
    assigned_at = now(),
    pacing_mode = excluded.pacing_mode
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.upsert_class_instance_scenario_assignment(uuid, uuid, text) to authenticated;
