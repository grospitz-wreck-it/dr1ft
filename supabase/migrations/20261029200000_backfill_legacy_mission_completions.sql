-- Backfill legacy mission completions into their class instance when the
-- domain event recorded the originating class. Older progress rows may have
-- been created before instance-scoped mission progress was introduced.
with legacy_completion_scope as (
  select
    ump.user_id,
    ump.mission_id,
    de.payload->>'classInstanceId' as class_instance_id,
    row_number() over (
      partition by ump.user_id, ump.mission_id
      order by de.created_at desc
    ) as rn
  from public.user_mission_progress ump
  join public.domain_events de
    on de.user_id = ump.user_id
   and de.event_type = 'MissionCompleted'
   and de.payload->>'missionId' = ump.mission_id::text
   and nullif(de.payload->>'classInstanceId', '') is not null
  where ump.class_instance_id is null
    and ump.status = 'completed'
),
eligible_backfill as (
  select l.user_id, l.mission_id, l.class_instance_id::uuid as class_instance_id
  from legacy_completion_scope l
  where l.rn = 1
    and exists (
      select 1
      from public.class_instance_memberships cim
      where cim.user_id = l.user_id
        and cim.class_instance_id = l.class_instance_id::uuid
    )
)
update public.user_mission_progress ump
set class_instance_id = b.class_instance_id
from eligible_backfill b
where ump.user_id = b.user_id
  and ump.mission_id = b.mission_id
  and ump.class_instance_id is null
  and not exists (
    select 1
    from public.user_mission_progress already_scoped
    where already_scoped.user_id = b.user_id
      and already_scoped.mission_id = b.mission_id
      and already_scoped.class_instance_id = b.class_instance_id
  );

-- If a legacy completed row has no class-scoped event, only backfill it when
-- the learner has exactly one class-instance membership, avoiding guesses.
with single_membership as (
  select cim.user_id, min(cim.class_instance_id::text)::uuid as class_instance_id
  from public.class_instance_memberships cim
  where cim.left_at is null
  group by cim.user_id
  having count(distinct cim.class_instance_id) = 1
)
update public.user_mission_progress ump
set class_instance_id = sm.class_instance_id
from single_membership sm
where ump.user_id = sm.user_id
  and ump.class_instance_id is null
  and ump.status = 'completed'
  and not exists (
    select 1
    from public.user_mission_progress already_scoped
    where already_scoped.user_id = ump.user_id
      and already_scoped.mission_id = ump.mission_id
      and already_scoped.class_instance_id = sm.class_instance_id
  );
