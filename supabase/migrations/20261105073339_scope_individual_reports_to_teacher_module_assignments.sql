
-- Individual student reports must be scoped to the teacher's own active module assignment.
create or replace function public.get_teacher_student_scenario_report_scoped_v1(
  p_class_id uuid,
  p_student_id uuid,
  p_scenario_id uuid
)
returns table(
  response_id uuid,
  scenario_id uuid,
  scenario_title text,
  card_id text,
  card_title text,
  card_prompt text,
  objective_id uuid,
  objective_title text,
  selected_option_id text,
  selected_option_label text,
  selected_option_feedback text,
  recommended_option_label text,
  outcome text,
  occurred_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Anmeldung erforderlich' using errcode = '42501';
  end if;

  if not public.has_teacher_module_assignment(p_class_id, 'scenario', p_scenario_id) then
    raise exception 'Kein aktiver Modulauftrag für dieses Szenario in dieser Klasse'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.class_instance_memberships cim
    where cim.class_instance_id = p_class_id
      and cim.user_id = p_student_id
      and cim.role::text = 'student'
      and cim.left_at is null
  ) then
    raise exception 'Schüler:in gehört nicht aktiv zu dieser Klasseninstanz'
      using errcode = '42501';
  end if;

  return query
  select r.response_id, r.scenario_id, r.scenario_title, r.card_id,
         r.card_title, r.card_prompt, r.objective_id, r.objective_title,
         r.selected_option_id, r.selected_option_label,
         r.selected_option_feedback, r.recommended_option_label,
         r.outcome, r.occurred_at
  from public.get_teacher_student_scenario_report_v1(p_class_id, p_student_id) r
  where r.scenario_id = p_scenario_id;
end;
$$;

revoke all on function public.get_teacher_student_scenario_report_scoped_v1(uuid,uuid,uuid) from public, anon;
grant execute on function public.get_teacher_student_scenario_report_scoped_v1(uuid,uuid,uuid) to authenticated;

-- Retire unscoped individual-report RPCs. The replacement endpoint above
-- requires the exact assigned scenario and active student membership.
revoke execute on function public.get_teacher_student_scenario_report_v1(uuid,uuid) from public, anon, authenticated;
revoke execute on function public.get_teacher_student_activity_time_v1(uuid,uuid) from public, anon, authenticated;
revoke execute on function public.get_teacher_student_learning_journey_v1(uuid,uuid) from public, anon, authenticated;
revoke execute on function public.get_teacher_student_social_pulse_v1(uuid,uuid) from public, anon, authenticated;

-- These legacy functions return student-level rows for the whole class.
-- Keep them unavailable until class-teacher and module-scoped replacements exist.
revoke execute on function public.get_class_student_learning_evidence(uuid) from public, anon, authenticated;
revoke execute on function public.get_class_student_learning_evidence_v1(uuid) from public, anon, authenticated;
revoke execute on function public.get_class_student_mission_progress(uuid) from public, anon, authenticated;

-- A student may read their own interaction/arc data, not classmates' activity.
drop policy if exists "members view instance interactions" on public.user_interactions;
create policy "users read own scoped interactions"
on public.user_interactions for select to authenticated
using (user_id = (select auth.uid()) and class_instance_id is not null
  and is_member_of_class_instance(class_instance_id));

drop policy if exists "members view instance arc progress" on public.user_story_arc_progress;
create policy "users read own scoped arc progress"
on public.user_story_arc_progress for select to authenticated
using (user_id = (select auth.uid()) and class_instance_id is not null
  and is_member_of_class_instance(class_instance_id));

drop policy if exists "members view instance unlocked missions" on public.user_unlocked_missions;

