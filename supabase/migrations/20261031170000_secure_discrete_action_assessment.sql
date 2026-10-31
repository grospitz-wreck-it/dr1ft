-- Trusted assessment for ordinary in-feed actions (report, ignore, inspect, etc.).
-- Editorial stores one shared rule on learningTask.assessment. The learner submits
-- only the action already persisted in user_interactions; the server derives outcome.

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
  v_assessment jsonb;
  v_assessed_actions jsonb;
  v_acceptable_actions jsonb;
  v_action_aliases text[];
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

  -- Normalize the legacy fact_check action to the Player's inspect_context event.
  v_action_aliases := case p_action_id
    when 'inspect_context' then array['inspect_context', 'fact_check']
    else array[p_action_id]
  end;

  -- Require that the action was actually persisted by the Player first.
  if not exists (
    select 1
    from public.user_interactions ui
    where ui.user_id = v_user_id
      and ui.class_instance_id = p_class_instance_id
      and ui.content_item_id = p_content_item_id
      and ui.interaction_type = p_action_id
  ) then
    raise exception 'Persisted learner interaction required' using errcode = '42501';
  end if;

  -- Content must be live, assigned to this class, and explicitly assessed
  -- in the shared Editorial learningTask configuration.
  select ci.scenario_id,
         ci.extra #> '{learningTask,assessment}'
    into v_scenario_id, v_assessment
  from public.content_items ci
  where ci.id = p_content_item_id
    and ci.status = 'live'
    and ci.scenario_id is not null
    and exists (
      select 1
      from public.class_instance_scenario_assignments cisa
      where cisa.class_instance_id = p_class_instance_id
        and cisa.scenario_id = ci.scenario_id
        and cisa.archived_at is null
        and cisa.is_active = true
    )
    and exists (
      select 1
      from jsonb_array_elements(
        case
          when jsonb_typeof(ci.extra #> '{learningTask,interactions}') = 'array'
            then ci.extra #> '{learningTask,interactions}'
          else '[]'::jsonb
        end
      ) interaction
      where interaction ->> 'id' = any(v_action_aliases)
    );

  if not found then
    raise exception 'Live assigned content interaction not found' using errcode = '22023';
  end if;

  v_assessed_actions := v_assessment -> 'assessedActions';
  v_acceptable_actions := v_assessment -> 'acceptableActions';

  if jsonb_typeof(v_assessed_actions) is distinct from 'array'
     or jsonb_typeof(v_acceptable_actions) is distinct from 'array' then
    raise exception 'No explicit in-feed assessment rule configured' using errcode = '22023';
  end if;

  if jsonb_array_length(v_assessed_actions) = 0 then
    raise exception 'No assessed actions configured' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_assessed_actions) action(value)
    where jsonb_typeof(action.value) <> 'string'
       or length(trim(action.value #>> '{}')) = 0
  ) or exists (
    select 1
    from jsonb_array_elements(v_acceptable_actions) action(value)
    where jsonb_typeof(action.value) <> 'string'
       or length(trim(action.value #>> '{}')) = 0
  ) then
    raise exception 'Invalid action assessment configuration' using errcode = '22023';
  end if;

  -- A selected action must be in the editorial assessment scope.
  if not exists (
    select 1
    from jsonb_array_elements_text(v_assessed_actions) as assessed(action_id)
    where assessed.action_id = any(v_action_aliases)
  ) then
    raise exception 'Action is not part of the assessment scope' using errcode = '22023';
  end if;

  -- Every acceptable action must also be in the assessed action set.
  if exists (
    select 1
    from jsonb_array_elements_text(v_acceptable_actions) as accepted(accepted_id)
    where not (v_assessed_actions @> jsonb_build_array(accepted.accepted_id))
  ) then
    raise exception 'Acceptable actions must be assessed actions' using errcode = '22023';
  end if;

  v_evidence_key := nullif(trim(v_assessment ->> 'evidenceKey'), '');
  if v_evidence_key is null then
    v_evidence_key := 'in_feed_decision';
  end if;

  v_outcome := case
    when exists (
      select 1
      from jsonb_array_elements_text(v_acceptable_actions) as accepted(accepted_id)
      where accepted.accepted_id = any(v_action_aliases)
    ) then 'success'
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
      'action_aliases', to_jsonb(v_action_aliases),
      'assessed_actions', v_assessed_actions,
      'acceptable_actions', v_acceptable_actions,
      'assessment_type', 'editorial_in_feed_action'
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
  'Records a server-derived outcome for a persisted in-feed action using the shared Editorial learningTask.assessment rule. Multiple acceptable alternatives satisfy the same evidenceKey requirement; the client cannot submit an outcome.';
