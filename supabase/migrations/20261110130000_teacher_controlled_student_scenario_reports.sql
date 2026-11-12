-- Student-facing scenario reports are an explicit teacher-controlled release.
-- Keep this separate from show_reports_at_end, which controls teacher report timing.
alter table public.class_instance_scenario_assignments
  add column if not exists student_reports_enabled boolean not null default false;

comment on column public.class_instance_scenario_assignments.student_reports_enabled is
  'When true, students may see their own finalized scenario assessment. Defaults to false; controlled only by an authorized teacher.';

-- Preserve the existing finalization implementation and wrap its result at the
-- server boundary. The internal function still persists every result; students
-- receive only a hidden status until the teacher enables student reporting.
alter function public.finalize_scenario_assessment_v1(uuid, uuid)
  rename to finalize_scenario_assessment_internal_v1;

revoke all on function public.finalize_scenario_assessment_internal_v1(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.finalize_scenario_assessment_v1(
  p_class_instance_id uuid,
  p_scenario_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_result jsonb;
  v_student_reports_enabled boolean := false;
begin
  -- The internal function validates authentication, active student membership,
  -- assignment availability and persists the calculated result.
  v_result := public.finalize_scenario_assessment_internal_v1(
    p_class_instance_id,
    p_scenario_id
  );

  select coalesce(a.student_reports_enabled, false)
    into v_student_reports_enabled
  from public.class_instance_scenario_assignments a
  where a.class_instance_id = p_class_instance_id
    and a.scenario_id = p_scenario_id
    and a.is_active = true
    and a.archived_at is null
  limit 1;

  if not coalesce(v_student_reports_enabled, false) then
    return jsonb_build_object(
      'status', 'hidden',
      'percentage', null,
      'message', 'Deine Lehrkraft hat die Ergebnisanzeige noch nicht freigegeben.'
    );
  end if;

  return v_result;
end;
$function$;

revoke all on function public.finalize_scenario_assessment_v1(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.finalize_scenario_assessment_v1(uuid, uuid)
  to authenticated;

comment on function public.finalize_scenario_assessment_v1(uuid, uuid) is
  'Persists the authenticated student scenario result but returns detailed results only when the teacher enabled student_reports_enabled for the assignment.';


-- Teachers can inspect the persisted result in the existing individual report.
-- Students receive no direct table privileges; the student RPC applies the
-- assignment-level visibility gate independently.
drop policy if exists scenario_assessment_results_teacher_read
  on public.scenario_assessment_results;

create policy scenario_assessment_results_teacher_read
  on public.scenario_assessment_results
  for select
  to authenticated
  using (
    public.is_teacher_of_class_instance(class_instance_id)
    or public.can_view_class_individual_reports(class_instance_id)
  );

grant select on table public.scenario_assessment_results to authenticated;
