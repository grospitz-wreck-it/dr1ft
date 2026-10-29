-- Teacher reporting: expose submitted challenge responses separately from
-- validated assessment outcomes. No free-text answer is copied into reports.
create or replace function public.get_class_student_learning_evidence(p_class_id uuid)
returns table (
  user_id uuid,
  challenge_responses_submitted bigint,
  assessed_requirements bigint,
  successful_requirements bigint,
  not_yet_requirements bigint,
  last_learning_activity_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_teacher_of_class_instance(p_class_id) then
    raise exception 'Keine Berechtigung für diese Klasseninstanz';
  end if;

  return query
  with students as (
    select cim.user_id
    from public.class_instance_memberships cim
    where cim.class_instance_id = p_class_id
      and cim.role::text = 'student'
      and cim.left_at is null
  ),
  responses as (
    select ui.user_id,
      count(*)::bigint as response_count,
      max(ui.created_at) as last_response_at
    from public.user_interactions ui
    join students s on s.user_id = ui.user_id
    where ui.class_instance_id = p_class_id
      and ui.interaction_type = 'learning_task_response'
      and nullif(btrim(ui.metadata->>'response'), '') is not null
    group by ui.user_id
  ),
  latest_assessments as (
    select distinct on (lre.user_id, lre.class_instance_id, lre.content_item_id, lre.evidence_key)
      lre.user_id, lre.content_item_id, lre.evidence_key, lre.outcome, lre.occurred_at
    from public.learning_result_events lre
    join students s on s.user_id = lre.user_id
    where lre.class_instance_id = p_class_id
      and lre.evidence_key is not null
      and lre.event_kind in ('requirement_satisfied', 'requirement_not_satisfied')
    order by lre.user_id, lre.class_instance_id, lre.content_item_id, lre.evidence_key, lre.occurred_at desc, lre.created_at desc
  ),
  assessments as (
    select la.user_id,
      count(*)::bigint as assessed_count,
      count(*) filter (where la.outcome = 'success')::bigint as successful_count,
      count(*) filter (where la.outcome = 'not_yet')::bigint as not_yet_count,
      max(la.occurred_at) as last_assessment_at
    from latest_assessments la
    group by la.user_id
  )
  select s.user_id,
    coalesce(r.response_count, 0)::bigint,
    coalesce(a.assessed_count, 0)::bigint,
    coalesce(a.successful_count, 0)::bigint,
    coalesce(a.not_yet_count, 0)::bigint,
    greatest(r.last_response_at, a.last_assessment_at)
  from students s
  left join responses r on r.user_id = s.user_id
  left join assessments a on a.user_id = s.user_id;
end;
$$;

revoke all on function public.get_class_student_learning_evidence(uuid) from public, anon;
grant execute on function public.get_class_student_learning_evidence(uuid) to authenticated;

comment on function public.get_class_student_learning_evidence(uuid) is
  'Class-scoped teacher report: counts submitted challenge responses and latest validated outcomes without exposing free-text responses.';
