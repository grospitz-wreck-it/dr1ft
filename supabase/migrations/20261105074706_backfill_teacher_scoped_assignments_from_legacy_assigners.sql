
with legacy_assigners as (
  select distinct ci.school_id, a.class_instance_id, a.assigned_by as teacher_user_id, ci.school_year
  from public.class_instance_scenario_assignments a
  join public.class_instances ci on ci.id=a.class_instance_id
  join public.school_memberships sm on sm.school_id=ci.school_id and sm.user_id=a.assigned_by
    and sm.active=true and sm.role in ('teacher','school_admin','school_lead')
  where a.archived_at is null and a.is_active=true
  union
  select distinct a.school_id, a.class_instance_id, a.assigned_by, ci.school_year
  from public.teacher_module_class_assignments a
  join public.class_instances ci on ci.id=a.class_instance_id and ci.school_id=a.school_id
  join public.school_memberships sm on sm.school_id=a.school_id and sm.user_id=a.assigned_by
    and sm.active=true and sm.role in ('teacher','school_admin','school_lead')
  where a.archived_at is null and a.is_active=true
),
subscriptions as (
  insert into public.teacher_class_subscriptions
    (school_id,class_instance_id,teacher_user_id,school_year,is_active,subscribed_at)
  select school_id,class_instance_id,teacher_user_id,school_year,true,now()
  from legacy_assigners
  on conflict (class_instance_id,teacher_user_id)
  do update set is_active=true, ended_at=null
  returning id,school_id,class_instance_id,teacher_user_id,school_year
),
legacy_scenarios as (
  select ci.school_id,a.class_instance_id,a.assigned_by teacher_user_id,ci.school_year,
    a.scenario_id module_id
  from public.class_instance_scenario_assignments a
  join public.class_instances ci on ci.id=a.class_instance_id
  join public.school_memberships sm on sm.school_id=ci.school_id and sm.user_id=a.assigned_by
    and sm.active=true and sm.role in ('teacher','school_admin','school_lead')
  where a.archived_at is null and a.is_active=true
),
legacy_modules as (
  select a.school_id,a.class_instance_id,a.assigned_by teacher_user_id,ci.school_year,
    a.module_id
  from public.teacher_module_class_assignments a
  join public.class_instances ci on ci.id=a.class_instance_id and ci.school_id=a.school_id
  join public.school_memberships sm on sm.school_id=a.school_id and sm.user_id=a.assigned_by
    and sm.active=true and sm.role in ('teacher','school_admin','school_lead')
  where a.archived_at is null and a.is_active=true
)
insert into public.teacher_class_module_assignments
(subscription_id,school_id,class_instance_id,teacher_user_id,school_year,module_type,module_id,assigned_by,is_active,assigned_at)
select s.id,x.school_id,x.class_instance_id,x.teacher_user_id,x.school_year,x.module_type,x.module_id,x.teacher_user_id,true,now()
from (
  select school_id,class_instance_id,teacher_user_id,school_year,'scenario'::text module_type,module_id from legacy_scenarios
  union all
  select school_id,class_instance_id,teacher_user_id,school_year,'teacher_module'::text,module_id from legacy_modules
) x
join public.teacher_class_subscriptions s on s.class_instance_id=x.class_instance_id and s.teacher_user_id=x.teacher_user_id
on conflict (teacher_user_id,class_instance_id,module_type,module_id)
do update set is_active=true,archived_at=null;

