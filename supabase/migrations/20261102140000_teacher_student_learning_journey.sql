-- DR1FT Learning Intelligence: teacher-authorized, student-level learning journey.
-- Returns only activity and assessment evidence for the selected student in one class instance.
-- Private direct messages are deliberately excluded. No inferred competency score is generated here.

create or replace function public.get_teacher_student_learning_journey_v1(
  p_class_id uuid,
  p_student_id uuid
)
returns table (
  event_id text,
  source_type text,
  event_label text,
  content_id uuid,
  scenario_id uuid,
  title text,
  description text,
  scenario_title text,
  outcome text,
  occurred_at timestamptz,
  metadata jsonb
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

  if not exists (
    select 1
    from public.class_instance_memberships cim
    where cim.class_instance_id = p_class_id
      and cim.user_id = p_student_id
      and cim.role = 'student'
      and cim.left_at is null
  ) then
    raise exception 'Schüler:in gehört nicht aktiv zu dieser Klasseninstanz'
      using errcode = '42501';
  end if;

  return query
  with journey as (
    select
      ui.id::text as event_id,
      'interaction'::text as source_type,
      case ui.interaction_type
        when 'inspect_source' then 'Quelle geprüft'
        when 'inspect_media' then 'Bild oder Medium geprüft'
        when 'inspect_context' then 'Kontext geprüft'
        when 'compare_information' then 'Informationen verglichen'
        when 'learning_task_response' then 'Lernaufgabe beantwortet'
        when 'like' then 'Beitrag markiert'
        when 'comment' then 'Kommentar verfasst'
        when 'share' then 'Beitrag geteilt'
        when 'ignore' then 'Beitrag bewusst übersprungen'
        when 'report' then 'Beitrag gemeldet'
        else 'Interaktion'
      end as event_label,
      ui.content_item_id as content_id,
      ci.scenario_id,
      coalesce(nullif(ci.title, ''), case when ci.type::text = 'comment' then 'Kommentar' else 'Beitrag im Feed' end) as title,
      case
        when ui.interaction_type = 'learning_task_response'
          then left(coalesce(ui.metadata ->> 'response', ''), 280)
        when ui.interaction_type in ('inspect_source', 'inspect_media', 'inspect_context', 'compare_information')
          then nullif(concat_ws(' · ', nullif(ui.metadata ->> 'phase', ''), nullif(ui.metadata ->> 'result', '')), '')
        else null
      end as description,
      s.title as scenario_title,
      null::text as outcome,
      ui.created_at as occurred_at,
      jsonb_build_object('interaction_type', ui.interaction_type) as metadata
    from public.user_interactions ui
    left join public.content_items ci on ci.id = ui.content_item_id
    left join public.scenarios s on s.id = ci.scenario_id
    where ui.user_id = p_student_id
      and ui.class_instance_id = p_class_id
      and ui.interaction_type in (
        'inspect_source', 'inspect_media', 'inspect_context',
        'compare_information', 'learning_task_response',
        'like', 'comment', 'share', 'ignore', 'report'
      )

    union all

    select
      slcr.id::text,
      'learning_card',
      'Lernkarte beantwortet',
      null::uuid,
      slcr.scenario_id,
      coalesce(card.value ->> 'title', 'Szenario-Lernkarte'),
      coalesce(nullif(slcr.answer_label, ''), card.value ->> 'prompt'),
      s.title,
      slcr.outcome,
      slcr.occurred_at,
      jsonb_build_object(
        'card_id', slcr.card_id,
        'objective_id', slcr.learning_objective_id,
        'assessment_type', slcr.metadata ->> 'assessment_type'
      )
    from public.scenario_learning_card_responses slcr
    join public.scenarios s on s.id = slcr.scenario_id
    left join lateral jsonb_array_elements(coalesce(s.learning_cards, '[]'::jsonb)) card(value)
      on card.value ->> 'id' = slcr.card_id
    where slcr.user_id = p_student_id
      and slcr.class_instance_id = p_class_id

    union all

    select
      lre.id::text,
      'assessment',
      case lre.event_kind
        when 'requirement_satisfied' then 'Anforderung erfüllt'
        when 'requirement_not_satisfied' then 'Anforderung noch nicht erfüllt'
        when 'discovery_confirmed' then 'Erkenntnis dokumentiert'
        when 'not_assessable' then 'Noch nicht bewertbar'
        else 'Lernaktivität dokumentiert'
      end,
      lre.content_item_id,
      lre.scenario_id,
      coalesce(nullif(ci.title, ''), 'Lernnachweis'),
      coalesce(nullif(lre.metadata ->> 'requirement_title', ''), nullif(lre.metadata ->> 'description', '')),
      s.title,
      lre.outcome,
      lre.occurred_at,
      jsonb_build_object('event_kind', lre.event_kind, 'evidence_key', lre.evidence_key)
    from public.learning_result_events lre
    left join public.content_items ci on ci.id = lre.content_item_id
    left join public.scenarios s on s.id = lre.scenario_id
    where lre.user_id = p_student_id
      and lre.class_instance_id = p_class_id

    union all

    select
      ump.id::text,
      'mission',
      'Mission abgeschlossen',
      null::uuid,
      m.scenario_id,
      m.title,
      m.description,
      s.title,
      'success'::text,
      coalesce(ump.completed_at, ump.started_at),
      jsonb_build_object('mission_id', m.id)
    from public.user_mission_progress ump
    join public.missions m on m.id = ump.mission_id
    left join public.scenarios s on s.id = m.scenario_id
    where ump.user_id = p_student_id
      and ump.class_instance_id = p_class_id
      and ump.status = 'completed'
  )
  select
    j.event_id,
    j.source_type,
    j.event_label,
    j.content_id,
    j.scenario_id,
    j.title,
    j.description,
    j.scenario_title,
    j.outcome,
    j.occurred_at,
    j.metadata
  from journey j
  order by j.occurred_at desc;
end;
$function$;

revoke all on function public.get_teacher_student_learning_journey_v1(uuid, uuid)
  from public, anon;
grant execute on function public.get_teacher_student_learning_journey_v1(uuid, uuid)
  to authenticated;

comment on function public.get_teacher_student_learning_journey_v1(uuid, uuid) is
  'Returns a teacher-authorized, class-scoped learning journey for one active student. Includes public feed interactions, task/card responses, validated assessment events and completed missions; excludes private direct messages and does not infer competency scores.';
