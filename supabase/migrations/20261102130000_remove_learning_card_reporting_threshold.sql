-- DR1FT test-mode reporting: remove the minimum-participant threshold for scenario learning cards.
-- The teacher dashboard remains access-controlled by is_teacher_of_class_instance.
-- Aggregate standalone scenario learning-card responses for the class-level teacher report.
-- Only the latest answer per learner/card is counted; no learner identifiers are returned.
create or replace function public.get_class_scenario_learning_card_insights_v1(
  p_class_id uuid
)
returns table (
  scenario_id uuid,
  scenario_title text,
  card_id text,
  card_title text,
  card_prompt text,
  objective_title text,
  response_count bigint,
  participant_count bigint,
  success_count bigint,
  partial_count bigint,
  not_yet_count bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
begin
  if not public.is_teacher_of_class_instance(p_class_id) then
    raise exception 'Keine Berechtigung für diese Klasseninstanz'
      using errcode = '42501';
  end if;

  return query
  with latest_responses as (
    select distinct on (r.user_id, r.scenario_id, r.card_id)
      r.user_id,
      r.scenario_id,
      r.card_id,
      r.outcome
    from public.scenario_learning_card_responses r
    join public.class_instance_memberships cim
      on cim.user_id = r.user_id
     and cim.class_instance_id = p_class_id
     and cim.role = 'student'
     and cim.left_at is null
    where r.class_instance_id = p_class_id
    order by r.user_id, r.scenario_id, r.card_id, r.occurred_at desc, r.id desc
  ),
  card_catalog as (
    select
      s.id as scenario_id,
      s.title as scenario_title,
      card.value ->> 'id' as card_id,
      coalesce(card.value ->> 'title', 'Lernkarte') as card_title,
      coalesce(card.value ->> 'prompt', '') as card_prompt,
      coalesce(
        card.value ->> 'objective',
        lo.title,
        'Nicht zugeordnetes Lernziel'
      ) as objective_title
    from public.scenarios s
    cross join lateral jsonb_array_elements(coalesce(s.learning_cards, '[]'::jsonb)) card(value)
    left join public.learning_objectives lo
      on lo.id = nullif(card.value ->> 'objectiveId', '')::uuid
  )
  select
    c.scenario_id,
    c.scenario_title,
    c.card_id,
    c.card_title,
    c.card_prompt,
    c.objective_title,
    count(lr.user_id)::bigint,
    count(lr.user_id)::bigint,
    count(*) filter (where lr.outcome = 'success')::bigint,
    count(*) filter (where lr.outcome = 'partial')::bigint,
    count(*) filter (where lr.outcome = 'not_yet')::bigint
  from card_catalog c
  join latest_responses lr
    on lr.scenario_id = c.scenario_id
   and lr.card_id = c.card_id
  group by c.scenario_id, c.scenario_title, c.card_id,
           c.card_title, c.card_prompt, c.objective_title
  order by c.scenario_title, c.card_title;
end;
$function$;

revoke all on function public.get_class_scenario_learning_card_insights_v1(uuid)
  from public, anon;
grant execute on function public.get_class_scenario_learning_card_insights_v1(uuid)
  to authenticated;

comment on function public.get_class_scenario_learning_card_insights_v1(uuid) is
  'Returns class-level learning-card outcome distributions without a minimum participant threshold. Counts only each learner latest answer per card and never returns learner identifiers.';
