-- DR1FT Learning Results: teacher-facing evidence aggregation v1.
--
-- Keep raw interactions separate from validated assessment outcomes:
-- submitted free-text responses are activity, while only trusted evaluator
-- events count as assessed requirements. Aggregate by requirement so retries
-- do not inflate the report totals.

create or replace function public.get_class_student_learning_evidence_v1(
  p_class_id uuid
)
returns table (
  user_id uuid,
  challenge_responses_submitted bigint,
  assessed_requirements bigint,
  successful_requirements bigint,
  not_yet_requirements bigint
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
  with students as (
    select cim.user_id
    from public.class_instance_memberships cim
    where cim.class_instance_id = p_class_id
      and cim.role = 'student'
      and cim.left_at is null
  ),
  response_counts as (
    select
      ui.user_id,
      count(*)::bigint as responses
    from public.user_interactions ui
    join students s on s.user_id = ui.user_id
    where ui.class_instance_id = p_class_id
      and ui.interaction_type = 'learning_task_response'
      and nullif(btrim(ui.metadata ->> 'response'), '') is not null
    group by ui.user_id
  ),
  requirement_attempts as (
    select
      lre.user_id,
      lre.content_item_id,
      lre.evidence_key,
      bool_or(lre.outcome = 'success') as has_success,
      bool_or(lre.outcome = 'not_yet') as has_not_yet
    from public.learning_result_events lre
    join students s on s.user_id = lre.user_id
    where lre.class_instance_id = p_class_id
      and lre.event_kind in ('requirement_satisfied', 'requirement_not_satisfied')
      and lre.outcome in ('success', 'not_yet')
      and lre.evidence_key is not null
    group by lre.user_id, lre.content_item_id, lre.evidence_key
  ),
  assessment_counts as (
    select
      ra.user_id,
      count(*)::bigint as assessed,
      count(*) filter (where ra.has_success)::bigint as successful,
      count(*) filter (where not ra.has_success and ra.has_not_yet)::bigint as not_yet
    from requirement_attempts ra
    group by ra.user_id
  )
  select
    s.user_id,
    coalesce(rc.responses, 0)::bigint,
    coalesce(ac.assessed, 0)::bigint,
    coalesce(ac.successful, 0)::bigint,
    coalesce(ac.not_yet, 0)::bigint
  from students s
  left join response_counts rc on rc.user_id = s.user_id
  left join assessment_counts ac on ac.user_id = s.user_id
  order by s.user_id;
end;
$function$;

revoke all on function public.get_class_student_learning_evidence_v1(uuid)
  from public, anon;
grant execute on function public.get_class_student_learning_evidence_v1(uuid)
  to authenticated;

comment on function public.get_class_student_learning_evidence_v1(uuid) is
  'Returns class-scoped teacher reporting totals. Free-text submissions are activity; validated assessment outcomes are counted once per content/evidence key, using the best successful attempt.';
