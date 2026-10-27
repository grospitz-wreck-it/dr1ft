-- Secure server-side scoring for the structured comparison decision.
-- The browser submits only its choice. This function validates class membership,
-- the configured interaction, the actual relation, and derives the outcome itself.

create or replace function public.record_comparison_assessment(
  p_class_instance_id uuid,
  p_content_item_id uuid,
  p_compared_content_item_id uuid,
  p_selected text
)
returns table (
  event_id uuid,
  outcome text,
  expected_choice text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_scenario_id uuid;
  v_relation_type text;
  v_expected text;
  v_outcome text;
  v_event_kind text;
  v_event_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_selected not in ('support', 'contradict') then
    raise exception 'Invalid comparison choice' using errcode = '22023';
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

  -- The task must explicitly configure comparison as a learning interaction.
  select ci.scenario_id, related.extra #>> '{relation,type}'
    into v_scenario_id, v_relation_type
  from public.content_items ci
  join public.content_items related
    on related.id = p_compared_content_item_id
   and related.extra #>> '{relation,relatedContentId}' = ci.id::text
  where ci.id = p_content_item_id
    and ci.status = 'live'
    and related.status = 'live'
    and ci.scenario_id is not null
    and related.scenario_id = ci.scenario_id
    and exists (
      select 1
      from public.class_instance_scenario_assignments cisa
      where cisa.class_instance_id = p_class_instance_id
        and cisa.scenario_id = ci.scenario_id
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
      where interaction ->> 'id' = 'compare_information'
    );

  if not found then
    raise exception 'Configured live comparison pair not found' using errcode = '22023';
  end if;

  v_expected := case
    when v_relation_type in ('supports', 'corroborates') then 'support'
    when v_relation_type = 'contradicts' then 'contradict'
    else null
  end;

  if v_expected is null then
    raise exception 'Comparison relation is not assessable' using errcode = '22023';
  end if;

  v_outcome := case when p_selected = v_expected then 'success' else 'not_yet' end;
  v_event_kind := case when p_selected = v_expected
    then 'requirement_satisfied'
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
    'compare_information',
    v_event_kind,
    'compare_information:decision',
    v_outcome,
    1,
    jsonb_build_object(
      'compared_content_item_id', p_compared_content_item_id,
      'selected', p_selected,
      'expected', v_expected
    )
  )
  returning id into v_event_id;

  return query select v_event_id, v_outcome, v_expected;
end;
$$;

revoke all on function public.record_comparison_assessment(uuid, uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.record_comparison_assessment(uuid, uuid, uuid, text)
  to authenticated;

comment on function public.record_comparison_assessment(uuid, uuid, uuid, text) is
  'Validates a configured comparison decision against the stored content relation and records a server-derived learning outcome.';
