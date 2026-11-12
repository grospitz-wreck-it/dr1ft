-- Return aggregate social activity for a teacher's active student report.
-- Direct message bodies, recipients and conversation details are never exposed.
create or replace function public.get_teacher_student_social_pulse_v1(
  p_class_id uuid,
  p_student_id uuid
)
returns table (
  week_start date,
  likes_sent bigint,
  comments_sent bigint,
  shares_sent bigint,
  direct_messages_sent bigint
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
    select 1 from public.class_instance_memberships cim
    where cim.class_instance_id = p_class_id
      and cim.user_id = p_student_id
      and cim.role::text = 'student'
      and cim.left_at is null
  ) then
    raise exception 'Schüler:in gehört nicht aktiv zu dieser Klasseninstanz'
      using errcode = '42501';
  end if;

  return query
  with weeks as (
    select generate_series(
      date_trunc('week', now()) - interval '5 weeks',
      date_trunc('week', now()),
      interval '1 week'
    )::date as week_start
  ),
  feed_activity as (
    select
      date_trunc('week', ui.created_at)::date as week_start,
      count(*) filter (where ui.interaction_type = 'like') as likes_sent,
      count(*) filter (where ui.interaction_type = 'comment') as comments_sent,
      count(*) filter (where ui.interaction_type = 'share') as shares_sent
    from public.user_interactions ui
    where ui.user_id = p_student_id
      and ui.class_instance_id = p_class_id
      and ui.interaction_type in ('like', 'comment', 'share')
      and ui.created_at >= date_trunc('week', now()) - interval '5 weeks'
      and ui.created_at < date_trunc('week', now()) + interval '1 week'
    group by 1
  ),
  message_activity as (
    select date_trunc('week', dm.created_at)::date as week_start, count(*) as direct_messages_sent
    from public.student_direct_messages dm
    where dm.sender_id = p_student_id
      and dm.class_instance_id = p_class_id
      and dm.created_at >= date_trunc('week', now()) - interval '5 weeks'
      and dm.created_at < date_trunc('week', now()) + interval '1 week'
    group by 1
  )
  select
    w.week_start,
    coalesce(f.likes_sent, 0),
    coalesce(f.comments_sent, 0),
    coalesce(f.shares_sent, 0),
    coalesce(m.direct_messages_sent, 0)
  from weeks w
  left join feed_activity f using (week_start)
  left join message_activity m using (week_start)
  order by w.week_start;
end;
$function$;

revoke all on function public.get_teacher_student_social_pulse_v1(uuid, uuid)
  from public, anon;
grant execute on function public.get_teacher_student_social_pulse_v1(uuid, uuid)
  to authenticated;

comment on function public.get_teacher_student_social_pulse_v1(uuid, uuid) is
  'Teacher-authorized weekly aggregate counts for likes, comments, shares and sent direct messages. Never returns message content or conversation metadata.';
