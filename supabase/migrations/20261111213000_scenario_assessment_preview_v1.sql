-- Read-only preview of the current scenario assessment.
-- Used before the student confirms completion; unlike the finalizer it writes no result.
create or replace function public.preview_scenario_assessment_v1(
  p_class_instance_id uuid,
  p_scenario_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_assignment_id uuid;
  v_snapshot_id uuid;
  v_snapshot_status text;
  v_requirements jsonb;
  v_attempts jsonb;
  v_result jsonb;
  v_feedback jsonb;
  v_percentage numeric;
  v_low_threshold numeric;
  v_middle_threshold numeric;
  v_message text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_class_instance_id is null or p_scenario_id is null then
    raise exception 'Class instance and scenario are required' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.class_instance_memberships cim
    where cim.user_id = v_user_id
      and cim.class_instance_id = p_class_instance_id
      and cim.role::text = 'student'
      and cim.left_at is null
  ) then
    raise exception 'Active student membership required' using errcode = '42501';
  end if;

  select a.id into v_assignment_id
  from public.class_instance_scenario_assignments a
  where a.class_instance_id = p_class_instance_id
    and a.scenario_id = p_scenario_id
    and a.is_active = true
    and a.archived_at is null
    and (a.scheduled_start_at is null or a.scheduled_start_at <= now())
    and (a.scheduled_end_at is null or a.scheduled_end_at > now())
  limit 1;
  if v_assignment_id is null then
    raise exception 'Scenario is not currently assigned to this class' using errcode = '42501';
  end if;

  select snap.id, snap.status, snap.requirements
    into v_snapshot_id, v_snapshot_status, v_requirements
  from public.scenario_assessment_snapshots snap
  where snap.assignment_id = v_assignment_id
  order by snap.snapshot_version desc
  limit 1;

  select coalesce(snap.completion_feedback, s.completion_feedback)
    into v_feedback
  from public.scenarios s
  left join public.scenario_assessment_snapshots snap
    on snap.id = v_snapshot_id
  where s.id = p_scenario_id;

  if v_snapshot_id is null then
    return jsonb_build_object(
      'status', 'snapshot_missing',
      'completion_message', 'Für dieses Szenario liegt noch keine auswertbare Bewertungsgrundlage vor. Du kannst es trotzdem beenden; deine Lehrkraft sieht den entsprechenden Hinweis.'
    );
  end if;
  if v_snapshot_status <> 'ready' then
    return jsonb_build_object(
      'status', 'not_assessable',
      'completion_message', 'Für dieses Szenario sind aktuell keine bewertbaren Pflichtabfragen hinterlegt. Du kannst es trotzdem beenden.'
    );
  end if;

  select coalesce(
    jsonb_agg(jsonb_build_object('requirement_id', attempts.requirement_id, 'outcome', attempts.outcome)
      order by attempts.occurred_at, attempts.event_id),
    '[]'::jsonb
  )
  into v_attempts
  from (
    select
      'feed:' || lre.content_item_id::text || ':' || lre.evidence_key as requirement_id,
      lre.outcome, lre.occurred_at, lre.id::text as event_id
    from public.learning_result_events lre
    where lre.user_id = v_user_id
      and lre.class_instance_id = p_class_instance_id
      and lre.scenario_id = p_scenario_id
      and lre.occurred_at >= (select snap.created_at from public.scenario_assessment_snapshots snap where snap.id = v_snapshot_id)
      and lre.event_kind in ('requirement_satisfied', 'requirement_not_satisfied')
      and lre.outcome in ('success', 'partial', 'not_yet')
    union all
    select
      'card:' || r.card_id as requirement_id,
      r.outcome, r.occurred_at, r.id::text as event_id
    from public.scenario_learning_card_responses r
    where r.user_id = v_user_id
      and r.class_instance_id = p_class_instance_id
      and r.scenario_id = p_scenario_id
      and r.occurred_at >= (select snap.created_at from public.scenario_assessment_snapshots snap where snap.id = v_snapshot_id)
  ) attempts
  where exists (
    select 1 from jsonb_array_elements(v_requirements) requirement(value)
    where requirement.value ->> 'id' = attempts.requirement_id
  );

  v_result := public.calculate_scenario_requirement_score_v1(v_requirements, v_attempts);
  v_percentage := nullif(v_result ->> 'percentage', '')::numeric;
  v_low_threshold := coalesce((v_feedback ->> 'low_threshold_percent')::numeric, 25);
  v_middle_threshold := coalesce((v_feedback ->> 'middle_threshold_percent')::numeric, 75);

  if v_percentage is null then
    v_message := 'Für dieses Szenario sind aktuell keine bewertbaren Pflichtabfragen hinterlegt. Du kannst es trotzdem beenden.';
  elsif v_percentage < v_low_threshold then
    v_message := coalesce(v_feedback ->> 'low_message', 'Bist du sicher? Du hast bisher kaum etwas entdeckt. Schau dich noch einmal um.');
  elsif v_percentage < v_middle_threshold then
    v_message := coalesce(v_feedback ->> 'middle_message', 'Willst du DR1FT wirklich schon beenden? Es gibt noch Hinweise zu finden.');
  else
    v_message := coalesce(v_feedback ->> 'high_message', 'Du hast das Thema bereits gut erfasst. Deine Auswertung wird jetzt erstellt.');
  end if;

  -- Do not return the numeric score or report details here: the teacher's
  -- student_reports_enabled gate applies to the final report, not this nudge.
  return jsonb_build_object(
    'status', 'preview',
    'completion_message', v_message
  );
end;
$function$;

revoke all on function public.preview_scenario_assessment_v1(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.preview_scenario_assessment_v1(uuid, uuid)
  to authenticated;

comment on function public.preview_scenario_assessment_v1(uuid, uuid) is
  'Read-only preview of the authenticated student assessment against the current assignment snapshot. Returns scenario-level completion feedback configuration and writes no result.';
