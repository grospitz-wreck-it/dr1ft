-- DR1FT Scenario Assessment v1: pure, deterministic requirement scoring.
--
-- This function intentionally does not read or write application tables. It is
-- an isolated calculation primitive that can be tested before any runtime path
-- is connected to it. Requirements and attempts are supplied by a trusted
-- caller after authorization and source validation.
--
-- Requirements:
--   [{"id":"source_check","required":true,"weight":1}, ...]
-- Attempts (oldest first; last valid attempt wins):
--   [{"requirement_id":"source_check","outcome":"success"}, ...]
--
-- Missing attempts score zero for required requirements, but are returned as
-- "unobserved" so callers must not interpret them as negative competency evidence.

create or replace function public.calculate_scenario_requirement_score_v1(
  p_requirements jsonb,
  p_attempts jsonb
)
returns jsonb
language plpgsql
immutable
set search_path = pg_catalog
as $function$
declare
  v_requirement record;
  v_attempt record;
  v_required_count integer;
  v_total_weight numeric := 0;
  v_weighted_points numeric := 0;
  v_completed_count integer := 0;
  v_partial_count integer := 0;
  v_not_yet_count integer := 0;
  v_unobserved_count integer := 0;
  v_percentage numeric;
  v_details jsonb;
begin
  if jsonb_typeof(p_requirements) is distinct from 'array' then
    raise exception 'Requirements must be a JSON array'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_attempts) is distinct from 'array' then
    raise exception 'Attempts must be a JSON array'
      using errcode = '22023';
  end if;

  for v_requirement in
    select item.value
    from jsonb_array_elements(p_requirements) as item(value)
  loop
    if jsonb_typeof(v_requirement.value) is distinct from 'object'
       or nullif(btrim(v_requirement.value ->> 'id'), '') is null
       or jsonb_typeof(v_requirement.value -> 'required') is distinct from 'boolean'
       or (
         v_requirement.value ? 'weight'
         and (
           jsonb_typeof(v_requirement.value -> 'weight') is distinct from 'number'
           or (v_requirement.value ->> 'weight')::numeric <= 0
         )
       ) then
      raise exception 'Invalid requirement definition'
        using errcode = '22023';
    end if;
  end loop;

  if exists (
    select 1
    from jsonb_array_elements(p_requirements) as item(value)
    group by item.value ->> 'id'
    having count(*) > 1
  ) then
    raise exception 'Requirement IDs must be unique'
      using errcode = '22023';
  end if;

  for v_attempt in
    select item.value
    from jsonb_array_elements(p_attempts) as item(value)
  loop
    if jsonb_typeof(v_attempt.value) is distinct from 'object'
       or nullif(btrim(v_attempt.value ->> 'requirement_id'), '') is null
       or coalesce(v_attempt.value ->> 'outcome', '') not in ('success', 'partial', 'not_yet') then
      raise exception 'Invalid requirement attempt'
        using errcode = '22023';
    end if;

    if not exists (
      select 1
      from jsonb_array_elements(p_requirements) as req(value)
      where req.value ->> 'id' = v_attempt.value ->> 'requirement_id'
    ) then
      raise exception 'Attempt references an unknown requirement ID'
        using errcode = '22023';
    end if;
  end loop;

  select count(*)::integer
    into v_required_count
  from jsonb_array_elements(p_requirements) as item(value)
  where (item.value ->> 'required')::boolean;

  if v_required_count = 0 then
    return jsonb_build_object(
      'status', 'not_assessable',
      'percentage', null,
      'required_count', 0,
      'completed_count', 0,
      'partial_count', 0,
      'not_yet_count', 0,
      'unobserved_count', 0,
      'weighted_points', 0,
      'total_weight', 0,
      'requirements', '[]'::jsonb
    );
  end if;

  with requirements as (
    select
      item.value ->> 'id' as requirement_id,
      (item.value ->> 'required')::boolean as required,
      coalesce((item.value ->> 'weight')::numeric, 1::numeric) as weight,
      item.ordinality
    from jsonb_array_elements(p_requirements) with ordinality as item(value, ordinality)
  ),
  latest_attempts as (
    select distinct on (item.value ->> 'requirement_id')
      item.value ->> 'requirement_id' as requirement_id,
      item.value ->> 'outcome' as outcome,
      item.ordinality
    from jsonb_array_elements(p_attempts) with ordinality as item(value, ordinality)
    order by item.value ->> 'requirement_id', item.ordinality desc
  ),
  evaluated as (
    select
      r.requirement_id,
      r.required,
      r.weight,
      coalesce(a.outcome, 'unobserved') as outcome,
      case coalesce(a.outcome, 'unobserved')
        when 'success' then 1::numeric
        when 'partial' then 0.5::numeric
        else 0::numeric
      end as points
    from requirements r
    left join latest_attempts a using (requirement_id)
  )
  select
    coalesce(sum(e.weight * e.points) filter (where e.required), 0),
    coalesce(sum(e.weight) filter (where e.required), 0),
    count(*) filter (where e.required and e.outcome = 'success')::integer,
    count(*) filter (where e.required and e.outcome = 'partial')::integer,
    count(*) filter (where e.required and e.outcome = 'not_yet')::integer,
    count(*) filter (where e.required and e.outcome = 'unobserved')::integer,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'requirement_id', e.requirement_id,
          'required', e.required,
          'weight', e.weight,
          'outcome', case when e.required then e.outcome else 'optional' end,
          'points', case when e.required then e.points else null end
        )
        order by e.requirement_id
      ),
      '[]'::jsonb
    )
  into
    v_weighted_points,
    v_total_weight,
    v_completed_count,
    v_partial_count,
    v_not_yet_count,
    v_unobserved_count,
    v_details
  from evaluated e;

  v_percentage := round((100 * v_weighted_points / nullif(v_total_weight, 0)), 4);

  return jsonb_build_object(
    'status', 'assessed',
    'percentage', v_percentage,
    'required_count', v_required_count,
    'completed_count', v_completed_count,
    'partial_count', v_partial_count,
    'not_yet_count', v_not_yet_count,
    'unobserved_count', v_unobserved_count,
    'weighted_points', v_weighted_points,
    'total_weight', v_total_weight,
    'requirements', v_details
  );
end;
$function$;

comment on function public.calculate_scenario_requirement_score_v1(jsonb, jsonb) is
  'Pure scenario requirement calculation. Counts each required requirement once, ignores optional requirements, treats missing required attempts as zero while preserving unobserved status, and uses the last attempt in input order. Does not assess competency levels or confidence.';

-- Migration-local regression checks for the agreed arithmetic and edge cases.
do $test$
declare
  v_result jsonb;
begin
  v_result := public.calculate_scenario_requirement_score_v1(
    '[{"id":"source","required":true},{"id":"context","required":true}]'::jsonb,
    '[{"requirement_id":"source","outcome":"success"}]'::jsonb
  );
  if (v_result ->> 'percentage')::numeric <> 50
     or (v_result ->> 'unobserved_count')::integer <> 1 then
    raise exception 'Scenario scoring regression: one of two requirements must equal 50%%';
  end if;

  v_result := public.calculate_scenario_requirement_score_v1(
    '[{"id":"decision","required":true}]'::jsonb,
    '[{"requirement_id":"decision","outcome":"partial"}]'::jsonb
  );
  if (v_result ->> 'percentage')::numeric <> 50 then
    raise exception 'Scenario scoring regression: partial outcome must equal 50%%';
  end if;

  v_result := public.calculate_scenario_requirement_score_v1(
    '[{"id":"decision","required":true},{"id":"optional","required":false}]'::jsonb,
    '[{"requirement_id":"decision","outcome":"success"},{"requirement_id":"optional","outcome":"not_yet"}]'::jsonb
  );
  if (v_result ->> 'percentage')::numeric <> 100
     or (v_result ->> 'required_count')::integer <> 1 then
    raise exception 'Scenario scoring regression: optional requirements must not affect the denominator';
  end if;

  v_result := public.calculate_scenario_requirement_score_v1(
    '[{"id":"decision","required":true}]'::jsonb,
    '[{"requirement_id":"decision","outcome":"success"},{"requirement_id":"decision","outcome":"not_yet"}]'::jsonb
  );
  if (v_result ->> 'percentage')::numeric <> 0 then
    raise exception 'Scenario scoring regression: the last attempt must determine the result';
  end if;

  v_result := public.calculate_scenario_requirement_score_v1(
    '[{"id":"optional","required":false}]'::jsonb,
    '[]'::jsonb
  );
  if v_result ->> 'status' <> 'not_assessable'
     or v_result -> 'percentage' <> 'null'::jsonb then
    raise exception 'Scenario scoring regression: no required requirements must be not assessable';
  end if;
end;
$test$;
