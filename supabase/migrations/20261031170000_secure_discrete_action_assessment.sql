-- Trusted assessment for ordinary in-feed actions (report, ignore, inspect, etc.).
-- The learner submits only the action they performed. The server reads the
-- accepted alternatives from editorial content configuration and derives outcome.

create or replace function public.record_discrete_action_assessment(
  p_class_instance_id uuid,
  p_content_item_id uuid,
  p_action_id text
)
returns table (
  event_id uuid,
  outcome text,
  evidence_key text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_scenario_id uuid;
  v_interaction jsonb;
  v_assessment jsonb;
  v_acceptable_actions jsonb;
  v_evidence_key text;
  v_outcome text;
  v_event_kind text;
  v_event_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_action_id is null or length(trim(p_action_id)) = 0 or length(p_action_id) > 80 then
    raise exception 'Invalid action id' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.class_instance_memberships cim
    where cim.user_id = v_user_id
      and cim.class_instance_id = p_class_instance_id
      and cim.role::text = 'student'
      and cim.left_at is null
  ) then
    raise exception 'Active student membership required' using errcode = '42501';
  end if;

  -- The content must be live and assigned to this class through its scenario.
  select ci.scenario_id,
         interaction.value,
         interaction.value -> 'assessment'
    into v_scenario_id, v_interaction, v_assessment
  from public.content_items ci
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(ci.extra #> '{learningTask,interactions}') = 'array'
        then ci.extra #> '{learningTask,interactions}'
      else '[]'::jsonb
    end
  ) as interaction(value)
  where ci.id = p_content_item_id
    and ci.status = 'live'
    and ci.scenario_id is not null
    and interaction.value ->> 'id' = p_action_id
    and exists (
      select 1
      from public.class_instance_scenario_assignments cisa
      where cisa.class_instance_id = p_class_instance_id
        and cisa.scenario_id = ci.scenario_id
    );

  if not found then
    raise exception 'Live assigned content interaction not found' using errcode = '22023';
  end if;

  v_acceptable_actions := v_assessment -> 'acceptableActions';
  if jsonb_typeof(v_acceptable_actions) <> 'array'
     or jsonb_array_length(v_acceptable_actions) = 0 then
    raise exception 'Interaction has no explicit assessment rule' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_acceptable_actions) accepted(value)
    where jsonb_typeof(accepted.value) <> 'string'
       or length(trim(accepted.value #>> '{}')) = 0
  ) then
    raise exception 'Invalid acceptableActions configuration' using errcode = '22023';
  end if;

  v_evidence_key := nullif(trim(v_assessment ->> 'evidenceKey'), '');
  if v_evidence_key is null then
    v_evidence_key := 'interaction:' || p_action_id;
  end if;

  v_outcome := case
    when v_acceptable_actions @> jsonb_build_array(p_action_id) then 'success'
    else 'not_yet'
  end;
  v_event_kind := case
    when v_outcome = 'success' then 'requirement_satisfied'
    else 'requirement_not_satisfied'
  end;

  insert into public.learning_result_events (
    user_id,
    class_instance_id,
    scenario_id,
    content_item_id,
    interaction_type,
    event_kind,
    evidence_key,
    outcome,
    scoring_version,
    metadata
  ) values (
    v_user_id,
    p_class_instance_id,
    v_scenario_id,
    p_content_item_id,
    p_action_id,
    v_event_kind,
    v_evidence_key,
    v_outcome,
    1,
    jsonb_build_object(
      'action_id', p_action_id,
      'acceptable_actions', v_acceptable_actions,
      'assessment_type', 'editorial_discrete_action'
    )
  )
  returning id into v_event_id;

  return query select v_event_id, v_outcome, v_evidence_key;
end;
$$;

revoke all on function public.record_discrete_action_assessment(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.record_discrete_action_assessment(uuid, uuid, text)
  to authenticated;

comment on function public.record_discrete_action_assessment(uuid, uuid, text) is
  'Records a server-derived outcome for a configured in-feed action. Multiple acceptableActions satisfy the same evidenceKey requirement; the client cannot submit an outcome.';
