-- Store standalone scenario learning-card answers independently from competency evidence.
-- These responses are participation/assessment records only; they do not update competency progress.

create table if not exists public.scenario_learning_card_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_instance_id uuid not null references public.class_instances(id) on delete cascade,
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  learning_design_id uuid references public.learning_designs(id) on delete set null,
  learning_objective_id uuid references public.learning_objectives(id) on delete set null,
  card_id text not null,
  option_id text not null,
  outcome text not null check (outcome in ('success', 'partial', 'not_yet')),
  answer_label text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists scenario_learning_card_responses_student_context_idx
  on public.scenario_learning_card_responses (user_id, class_instance_id, occurred_at desc);

create index if not exists scenario_learning_card_responses_scenario_idx
  on public.scenario_learning_card_responses (scenario_id, user_id, occurred_at desc);

alter table public.scenario_learning_card_responses enable row level security;

-- Writes are performed only through the validating SECURITY DEFINER RPC.
-- No direct client policies are intentionally created.
revoke all on table public.scenario_learning_card_responses from public, anon, authenticated;

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
  v_label text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_class_instance_id is null or p_scenario_id is null
     or p_card_id is null or length(trim(p_card_id)) = 0 or length(p_card_id) > 100
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

  if v_outcome not in ('success', 'partial', 'not_yet') then
    raise exception 'Learning card has no valid assessed outcome' using errcode = '22023';
  end if;

  select ld.id into v_design_id
  from public.learning_designs ld
  where ld.scenario_id = p_scenario_id
  order by ld.version desc
  limit 1;

  if v_design_id is null then
    raise exception 'Scenario has no learning design' using errcode = '22023';
  end if;

  if v_objective_id is not null and not exists (
    select 1 from public.learning_objectives lo
    where lo.id = v_objective_id
      and lo.learning_design_id = v_design_id
  ) then
    raise exception 'Learning objective is not part of the current learning design' using errcode = '22023';
  end if;

  insert into public.scenario_learning_card_responses (
    user_id,
    class_instance_id,
    scenario_id,
    learning_design_id,
    learning_objective_id,
    card_id,
    option_id,
    outcome,
    answer_label,
    metadata,
    occurred_at
  ) values (
    v_user_id,
    p_class_instance_id,
    p_scenario_id,
    v_design_id,
    v_objective_id,
    p_card_id,
    p_option_id,
    v_outcome,
    v_label,
    jsonb_build_object(
      'assessment_type', 'editorial_scenario_learning_card',
      'competency_progress_updated', false
    ),
    now()
  );

  -- Keep the existing RPC response contract for the current client.
  -- No learning_evidence_events are written and no competency progress is changed.
  return query select v_outcome, 0;
end;
$$;

revoke all on function public.submit_scenario_learning_card(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_scenario_learning_card(uuid, uuid, text, text)
  to authenticated;

comment on table public.scenario_learning_card_responses is
  'Append-only answers to standalone scenario learning cards. These records do not by themselves count as competency evidence.';
comment on function public.submit_scenario_learning_card(uuid, uuid, text, text) is
  'Validates the assigned scenario and selected learning-card option, stores the response, and deliberately does not update competency progress.';
