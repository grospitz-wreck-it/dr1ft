-- Trusted assessment and evidence capture for standalone scenario learning cards.
-- The learner submits only card/option IDs; outcome and evidence mapping are read from DB.
create or replace function public.submit_scenario_learning_card(
  p_class_instance_id uuid,
  p_scenario_id uuid,
  p_card_id text,
  p_option_id text
)
returns table (outcome text, evidence_events_created integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_cards jsonb;
  v_card jsonb;
  v_option jsonb;
  v_design_id uuid;
  v_objective_id uuid;
  v_outcome text;
  v_value numeric;
  v_label text;
  v_count integer := 0;
  v_indicator record;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_card_id is null or length(trim(p_card_id)) = 0 or length(p_card_id) > 100
     or p_option_id is null or length(trim(p_option_id)) = 0 or length(p_option_id) > 100 then
    raise exception 'Invalid learning card selection' using errcode = '22023';
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

  if not exists (
    select 1 from public.class_instance_scenario_assignments a
    where a.class_instance_id = p_class_instance_id
      and a.scenario_id = p_scenario_id
      and a.is_active = true
      and a.archived_at is null
      and (a.scheduled_start_at is null or a.scheduled_start_at <= now())
      and (a.scheduled_end_at is null or a.scheduled_end_at > now())
  ) then
    raise exception 'Scenario is not currently assigned to this class' using errcode = '42501';
  end if;

  select s.learning_cards into v_cards
  from public.scenarios s
  where s.id = p_scenario_id;
  if not found then
    raise exception 'Scenario not found' using errcode = '22023';
  end if;

  select card.value into v_card
  from jsonb_array_elements(coalesce(v_cards, '[]'::jsonb)) card(value)
  where card.value ->> 'id' = p_card_id
  limit 1;
  if v_card is null then
    raise exception 'Learning card not found' using errcode = '22023';
  end if;

  if coalesce(v_card ->> 'type', '') = 'reflection' then
    raise exception 'Reflection answers are not scored as competency evidence' using errcode = '22023';
  end if;

  select option.value into v_option
  from jsonb_array_elements(coalesce(v_card -> 'options', '[]'::jsonb)) option(value)
  where option.value ->> 'id' = p_option_id
  limit 1;
  if v_option is null then
    raise exception 'Answer option not found on this learning card' using errcode = '22023';
  end if;

  v_outcome := v_option ->> 'outcome';
  v_label := v_option ->> 'label';
  v_objective_id := nullif(v_card ->> 'objectiveId', '')::uuid;
  if v_outcome not in ('success', 'partial', 'not_yet') or v_objective_id is null then
    raise exception 'Learning card has no valid assessed learning objective' using errcode = '22023';
  end if;
  v_value := case v_outcome when 'success' then 1.0 when 'partial' then 0.5 else 0.0 end;

  select ld.id into v_design_id
  from public.learning_designs ld
  where ld.scenario_id = p_scenario_id
  order by ld.version desc
  limit 1;
  if v_design_id is null or not exists (
    select 1 from public.learning_objectives lo
    where lo.id = v_objective_id and lo.learning_design_id = v_design_id
  ) then
    raise exception 'Learning objective is not part of the current learning design' using errcode = '22023';
  end if;

  for v_indicator in
    select ei.id as indicator_id, ei.learning_step_id
    from public.evidence_indicators ei
    join public.learning_steps ls on ls.id = ei.learning_step_id
    where ei.objective_id = v_objective_id
      and ls.learning_design_id = v_design_id
  loop
    insert into public.learning_evidence_events (
      user_id, class_instance_id, scenario_id, learning_design_id,
      learning_step_id, evidence_indicator_id, event_type, evidence_value,
      evidence_label, metadata, occurred_at
    ) values (
      v_user_id, p_class_instance_id, p_scenario_id, v_design_id,
      v_indicator.learning_step_id, v_indicator.indicator_id,
      'learning_card_response', v_value, v_label,
      jsonb_build_object(
        'card_id', p_card_id,
        'option_id', p_option_id,
        'outcome', v_outcome,
        'objective_id', v_objective_id,
        'assessment_type', 'editorial_scenario_learning_card'
      ),
      now()
    );
    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    raise exception 'No evidence indicator is mapped to this learning objective; no progress was changed' using errcode = '22023';
  end if;

  return query select v_outcome, v_count;
end;
$$;

revoke all on function public.submit_scenario_learning_card(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_scenario_learning_card(uuid, uuid, text, text)
  to authenticated;

comment on function public.submit_scenario_learning_card(uuid, uuid, text, text) is
  'Validates assigned scenario, card, option and objective server-side, then appends granular learning_evidence_events. Reflection cards are excluded; the client cannot submit an outcome.';
