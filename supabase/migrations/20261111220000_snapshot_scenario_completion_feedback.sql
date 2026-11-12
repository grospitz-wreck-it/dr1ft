-- Freeze scenario completion messages and thresholds with the assignment's
-- requirement snapshot, so later Editorial edits do not change an active run.
alter table public.scenario_assessment_snapshots
  add column if not exists completion_feedback jsonb;

create or replace function public.capture_scenario_completion_feedback_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
begin
  if new.completion_feedback is null then
    select s.completion_feedback
      into new.completion_feedback
    from public.scenarios s
    where s.id = new.scenario_id;
  end if;
  return new;
end;
$function$;

revoke all on function public.capture_scenario_completion_feedback_v1()
  from public, anon, authenticated;

drop trigger if exists trg_capture_scenario_completion_feedback
  on public.scenario_assessment_snapshots;

create trigger trg_capture_scenario_completion_feedback
before insert on public.scenario_assessment_snapshots
for each row
execute function public.capture_scenario_completion_feedback_v1();

comment on column public.scenario_assessment_snapshots.completion_feedback is
  'Immutable scenario-level completion messages and thresholds captured at assignment snapshot creation.';
