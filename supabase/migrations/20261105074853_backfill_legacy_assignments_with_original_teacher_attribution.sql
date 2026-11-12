
drop trigger if exists trg_validate_teacher_class_module_assignment on public.teacher_class_module_assignments;

insert into public.teacher_class_module_assignments
(subscription_id,school_id,class_instance_id,teacher_user_id,school_year,module_type,module_id,assigned_by,is_active,assigned_at)
select s.id,ci.school_id,a.class_instance_id,a.assigned_by,ci.school_year,'scenario',a.scenario_id,a.assigned_by,true,coalesce(a.assigned_at,now())
from public.class_instance_scenario_assignments a
join public.class_instances ci on ci.id=a.class_instance_id
join public.teacher_class_subscriptions s on s.class_instance_id=a.class_instance_id and s.teacher_user_id=a.assigned_by
join public.school_memberships sm on sm.school_id=ci.school_id and sm.user_id=a.assigned_by and sm.active=true
where a.archived_at is null and a.is_active=true
on conflict (teacher_user_id,class_instance_id,module_type,module_id)
do update set is_active=true,archived_at=null;

insert into public.teacher_class_module_assignments
(subscription_id,school_id,class_instance_id,teacher_user_id,school_year,module_type,module_id,assigned_by,is_active,assigned_at)
select s.id,a.school_id,a.class_instance_id,a.assigned_by,ci.school_year,'teacher_module',a.module_id,a.assigned_by,true,coalesce(a.assigned_at,now())
from public.teacher_module_class_assignments a
join public.class_instances ci on ci.id=a.class_instance_id and ci.school_id=a.school_id
join public.teacher_class_subscriptions s on s.class_instance_id=a.class_instance_id and s.teacher_user_id=a.assigned_by
join public.school_memberships sm on sm.school_id=a.school_id and sm.user_id=a.assigned_by and sm.active=true
where a.archived_at is null and a.is_active=true
on conflict (teacher_user_id,class_instance_id,module_type,module_id)
do update set is_active=true,archived_at=null;

create trigger trg_validate_teacher_class_module_assignment
before insert or update on public.teacher_class_module_assignments
for each row execute function public.validate_teacher_class_module_assignment();

