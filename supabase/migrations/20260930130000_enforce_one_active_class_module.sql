-- DR1FT: exactly one active module per class instance.
-- Existing duplicate assignments are collapsed deterministically to the newest row.
-- The trigger also protects against direct inserts outside the Teacher UI.

with ranked as (
  select id,
         row_number() over (
           partition by class_instance_id
           order by assigned_at desc, id desc
         ) as rn
  from public.class_instance_scenario_assignments
)
delete from public.class_instance_scenario_assignments a
using ranked r
where a.id = r.id
  and r.rn > 1;

create or replace function public.enforce_one_active_class_module()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(
    hashtextextended(new.class_instance_id::text, 0)
  );

  delete from public.class_instance_scenario_assignments
  where class_instance_id = new.class_instance_id
    and scenario_id <> new.scenario_id;

  return new;
end;
$$;

drop trigger if exists trg_one_active_class_module
  on public.class_instance_scenario_assignments;

create trigger trg_one_active_class_module
before insert or update of class_instance_id, scenario_id
on public.class_instance_scenario_assignments
for each row
execute function public.enforce_one_active_class_module();

create or replace function public.upsert_class_instance_scenario_assignment(
  p_instance_id uuid,
  p_scenario_id uuid,
  p_pacing_mode text default 'compact'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_teacher_of_class_instance(p_instance_id) then
    raise exception 'Keine Berechtigung für diese Klasseninstanz';
  end if;

  insert into public.class_instance_scenario_assignments (
    class_instance_id,
    scenario_id,
    assigned_by,
    pacing_mode
  )
  values (
    p_instance_id,
    p_scenario_id,
    auth.uid(),
    p_pacing_mode
  )
  on conflict (class_instance_id, scenario_id) do update
    set pacing_mode = excluded.pacing_mode,
        assigned_by = excluded.assigned_by;
end;
$$;
