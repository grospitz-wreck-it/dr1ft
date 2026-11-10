-- DR1FT Scenario Assessment v1: immutable per-assignment requirement snapshots
-- and server-side scenario completion results.
--
-- This migration is additive. It does not backfill existing assignments because
-- their original editorial configuration at assignment time cannot be proven.
-- New assignments (and explicitly reactivated assignments) receive a snapshot.

create table if not exists public.scenario_assessment_snapshots (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.class_instance_scenario_assignments(id) on delete cascade,
  snapshot_version integer not null check (snapshot_version > 0),
  scoring_version smallint not null default 1 check (scoring_version > 0),
  status text not null check (status in ('ready', 'not_assessable')),
  requirements jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (assignment_id, snapshot_version),
  check (jsonb_typeof(requirements) = 'array')
);

create index if not exists scenario_assessment_snapshots_assignment_latest_idx
  on public.scenario_assessment_snapshots (assignment_id, snapshot_version desc);

alter table public.scenario_assessment_snapshots enable row level security;
revoke all on table public.scenario_assessment_snapshots from public, anon, authenticated;

create table if not exists public.scenario_assessment_results (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.scenario_assessment_snapshots(id) on delete cascade,
  assignment_id uuid not null references public.class_instance_scenario_assignments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  class_instance_id uuid not null references public.class_instances(id) on delete cascade,
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  requirement_result jsonb not null,
  completed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (snapshot_id, user_id)
);

create index if not exists scenario_assessment_results_student_idx
  on public.scenario_assessment_results (user_id, class_instance_id, completed_at desc);

alter table public.scenario_assessment_results enable row level security;
revoke all on table public.scenario_assessment_results from public, anon, authenticated;

create or replace function public.capture_scenario_assessment_snapshot_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_should_capture boolean := false;
  v_cards jsonb := '[]'::jsonb;
  v_card jsonb;
  v_content record;
  v_assessment jsonb;
  v_assessed_actions jsonb;
  v_acceptable_actions jsonb;
  v_requirement_mode text;
  v_base_key text;
  v_action_id text;
  v_requirements jsonb := '[]'::jsonb;
  v_snapshot_version integer;
  v_status text;
begin
  if tg_op = 'INSERT' then
    v_should_capture := new.is_active = true and new.archived_at is null;
  else
    v_should_capture :=
      new.is_active = true
      and new.archived_at is null
      and (
        old.is_active is distinct from true
        or old.archived_at is not null
      );
  end if;

  if not v_should_capture then
    return new;
  end if;

  select coalesce(s.learning_cards, '[]'::jsonb)
    into v_cards
  from public.scenarios s
  where s.id = new.scenario_id;

  -- Only explicitly required, scoreable cards enter the requirement denominator.
  -- Legacy cards with required = NULL are deliberately not guessed to be required.
  for v_card in
    select item.value
    from jsonb_array_elements(
      case when jsonb_typeof(v_cards) = 'array' then v_cards else '[]'::jsonb end
    ) as item(value)
  loop
    if v_card ->> 'type' <> 'reflection'
       and jsonb_typeof(v_card -> 'required') = 'boolean'
       and v_card ->> 'required' = 'true'
       and nullif(btrim(v_card ->> 'id'), '') is not null then
      v_requirements := v_requirements || jsonb_build_array(
        jsonb_build_object(
          'id', 'card:' || (v_card ->> 'id'),
          'kind', 'learning_card',
          'source_id', v_card ->> 'id',
          'source_key', v_card ->> 'id',
          'objective_id', v_card ->> 'objectiveId',
          'competency_ids', '[]'::jsonb,
          'title', coalesce(nullif(v_card ->> 'title', ''), 'Lernkarte'),
          'required', true,
          'weight', 1
        )
      );
    end if;
  end loop;

  -- Snapshot currently live feed assessments. Legacy "any" content remains one
  -- requirement; "all_acceptable" creates one independent requirement per
  -- acceptable action.
  for v_content in
    select ci.id, ci.extra -> 'learningTask' as learning_task
    from public.content_items ci
    where ci.scenario_id = new.scenario_id
      and ci.status = 'live'
      and jsonb_typeof(ci.extra -> 'learningTask') = 'object'
  loop
    v_assessment := v_content.learning_task -> 'assessment';
    v_assessed_actions := v_assessment -> 'assessedActions';
    v_acceptable_actions := v_assessment -> 'acceptableActions';
    v_requirement_mode := coalesce(v_assessment ->> 'requirementMode', 'any');
    v_base_key := coalesce(
      nullif(btrim(v_assessment ->> 'evidenceKey'), ''),
      'in_feed_decision'
    );

    if jsonb_typeof(v_assessed_actions) <> 'array'
       or jsonb_typeof(v_acceptable_actions) <> 'array'
       or jsonb_array_length(v_acceptable_actions) = 0 then
      continue;
    end if;

    if v_requirement_mode = 'any' then
      v_requirements := v_requirements || jsonb_build_array(
        jsonb_build_object(
          'id', 'feed:' || v_content.id::text || ':' || v_base_key,
          'kind', 'feed_action',
          'source_id', v_content.id,
          'source_key', v_base_key,
          'objective_id', null,
          'competency_ids', case
            when jsonb_typeof(v_content.learning_task -> 'competencyIds') = 'array'
              then v_content.learning_task -> 'competencyIds'
            else '[]'::jsonb
          end,
          'title', 'Feed-Aktion',
          'required', true,
          'weight', 1,
          'acceptable_actions', v_acceptable_actions
        )
      );
    elsif v_requirement_mode = 'all_acceptable' then
      for v_action_id in
        select jsonb_array_elements_text(v_acceptable_actions)
      loop
        if v_assessed_actions @> jsonb_build_array(v_action_id) then
          v_requirements := v_requirements || jsonb_build_array(
            jsonb_build_object(
              'id', 'feed:' || v_content.id::text || ':' || v_base_key || ':' || v_action_id,
              'kind', 'feed_action',
              'source_id', v_content.id,
              'source_key', v_base_key || ':' || v_action_id,
              'objective_id', null,
              'competency_ids', case
                when jsonb_typeof(v_content.learning_task -> 'competencyIds') = 'array'
                  then v_content.learning_task -> 'competencyIds'
                else '[]'::jsonb
              end,
              'title', 'Feed-Aktion',
              'required', true,
              'weight', 1,
              'acceptable_action', v_action_id
            )
          );
        end if;
      end loop;
    end if;
  end loop;

  select coalesce(max(snap.snapshot_version), 0) + 1
    into v_snapshot_version
  from public.scenario_assessment_snapshots snap
  where snap.assignment_id = new.id;

  v_status := case
    when jsonb_array_length(v_requirements) > 0 then 'ready'
    else 'not_assessable'
  end;

  insert into public.scenario_assessment_snapshots (
    assignment_id,
    snapshot_version,
    scoring_version,
    status,
    requirements
  ) values (
    new.id,
    v_snapshot_version,
    1,
    v_status,
    v_requirements
  );

  return new;
end;
$function$;

revoke all on function public.capture_scenario_assessment_snapshot_v1()
  from public, anon, authenticated;

drop trigger if exists trg_capture_scenario_assessment_snapshot
  on public.class_instance_scenario_assignments;

create trigger trg_capture_scenario_assessment_snapshot
after insert or update of is_active, archived_at
on public.class_instance_scenario_assignments
for each row
execute function public.capture_scenario_assessment_snapshot_v1();

create or replace function public.finalize_scenario_assessment_v1(
  p_class_instance_id uuid,
  p_scenario_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_assignment_id uuid;
  v_snapshot_id uuid;
  v_snapshot_status text;
  v_requirements jsonb;
  v_attempts jsonb;
  v_result jsonb;
  v_completed_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_class_instance_id is null or p_scenario_id is null then
    raise exception 'Class instance and scenario are required' using errcode = '22023';
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

  select a.id
    into v_assignment_id
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

  if v_snapshot_id is null then
    return jsonb_build_object(
      'status', 'snapshot_missing',
      'percentage', null,
      'message', 'Für diese Zuweisung existiert noch keine gültige Bewertungsgrundlage.'
    );
  end if;

  if v_snapshot_status <> 'ready' then
    return jsonb_build_object(
      'status', 'not_assessable',
      'percentage', null,
      'message', 'Dieses Szenario enthält noch keine bewertbaren Pflichtanforderungen.'
    );
  end if;

  -- Merge append-only attempts from the two existing assessment sources.
  -- Filter to requirement IDs in this immutable snapshot; unrelated telemetry
  -- and non-acceptable interaction signals cannot inflate or reduce the score.
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'requirement_id', attempts.requirement_id,
        'outcome', attempts.outcome
      )
      order by attempts.occurred_at, attempts.event_id
    ),
    '[]'::jsonb
  )
  into v_attempts
  from (
    select
      'feed:' || lre.content_item_id::text || ':' || lre.evidence_key as requirement_id,
      lre.outcome,
      lre.occurred_at,
      lre.id::text as event_id
    from public.learning_result_events lre
    where lre.user_id = v_user_id
      and lre.class_instance_id = p_class_instance_id
      and lre.scenario_id = p_scenario_id
      and lre.occurred_at >= (
        select snap.created_at
        from public.scenario_assessment_snapshots snap
        where snap.id = v_snapshot_id
      )
      and lre.event_kind in ('requirement_satisfied', 'requirement_not_satisfied')
      and lre.outcome in ('success', 'partial', 'not_yet')

    union all

    select
      'card:' || r.card_id as requirement_id,
      r.outcome,
      r.occurred_at,
      r.id::text as event_id
    from public.scenario_learning_card_responses r
    where r.user_id = v_user_id
      and r.class_instance_id = p_class_instance_id
      and r.scenario_id = p_scenario_id
      and r.occurred_at >= (
        select snap.created_at
        from public.scenario_assessment_snapshots snap
        where snap.id = v_snapshot_id
      )
  ) attempts
  where exists (
    select 1
    from jsonb_array_elements(v_requirements) requirement(value)
    where requirement.value ->> 'id' = attempts.requirement_id
  );

  v_result := public.calculate_scenario_requirement_score_v1(
    v_requirements,
    v_attempts
  );

  insert into public.scenario_assessment_results (
    snapshot_id,
    assignment_id,
    user_id,
    class_instance_id,
    scenario_id,
    requirement_result
  ) values (
    v_snapshot_id,
    v_assignment_id,
    v_user_id,
    p_class_instance_id,
    p_scenario_id,
    v_result
  )
  on conflict (snapshot_id, user_id) do update
    set requirement_result = excluded.requirement_result,
        updated_at = now()
  returning completed_at into v_completed_at;

  return v_result || jsonb_build_object(
    'snapshot_id', v_snapshot_id,
    'completed_at', v_completed_at
  );
end;
$function$;

revoke all on function public.finalize_scenario_assessment_v1(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.finalize_scenario_assessment_v1(uuid, uuid)
  to authenticated;

comment on table public.scenario_assessment_snapshots is
  'Immutable requirement configuration captured when a scenario is assigned or explicitly reactivated. Existing assignments are not backfilled because historical editorial configuration cannot be reconstructed safely.';
comment on table public.scenario_assessment_results is
  'Per-student scenario requirement result calculated from append-only feed assessment and scenario learning-card attempts against one immutable assignment snapshot.';
comment on function public.finalize_scenario_assessment_v1(uuid, uuid) is
  'Finalizes the authenticated student scenario result against the current assignment snapshot. Does not derive or update long-term competency progress.';
