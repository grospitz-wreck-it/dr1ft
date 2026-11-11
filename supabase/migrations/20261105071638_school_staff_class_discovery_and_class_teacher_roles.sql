
drop policy if exists school_staff_view_school_class_instances on public.class_instances;
create policy school_staff_view_school_class_instances
on public.class_instances for select to authenticated
using (
  exists (
    select 1 from public.school_memberships sm
    where sm.school_id = class_instances.school_id
      and sm.user_id = (select auth.uid())
      and sm.active = true
      and sm.role in ('teacher','school_admin','school_lead')
  )
);

drop policy if exists teacher_class_subscriptions_school_admin_read on public.teacher_class_subscriptions;
create policy teacher_class_subscriptions_school_admin_read
on public.teacher_class_subscriptions for select to authenticated
using (
  exists (
    select 1 from public.school_memberships sm
    where sm.school_id = teacher_class_subscriptions.school_id
      and sm.user_id = (select auth.uid())
      and sm.active = true
      and sm.role in ('school_admin','school_lead')
  )
);

drop policy if exists class_instance_teacher_roles_school_admin_read on public.class_instance_teacher_roles;
create policy class_instance_teacher_roles_school_admin_read
on public.class_instance_teacher_roles for select to authenticated
using (
  teacher_user_id = (select auth.uid())
  or exists (
    select 1 from public.school_memberships sm
    where sm.school_id = class_instance_teacher_roles.school_id
      and sm.user_id = (select auth.uid())
      and sm.active = true
      and sm.role in ('school_admin','school_lead')
  )
);

drop policy if exists class_instance_teacher_roles_school_admin_manage on public.class_instance_teacher_roles;
create policy class_instance_teacher_roles_school_admin_manage
on public.class_instance_teacher_roles for all to authenticated
using (
  exists (
    select 1 from public.school_memberships sm
    where sm.school_id = class_instance_teacher_roles.school_id
      and sm.user_id = (select auth.uid())
      and sm.active = true
      and sm.role in ('school_admin','school_lead')
  )
)
with check (
  exists (
    select 1 from public.school_memberships sm
    where sm.school_id = class_instance_teacher_roles.school_id
      and sm.user_id = (select auth.uid())
      and sm.active = true
      and sm.role in ('school_admin','school_lead')
  )
  and exists (
    select 1 from public.class_instances ci
    join public.school_memberships teacher_sm on teacher_sm.school_id = ci.school_id
    where ci.id = class_instance_teacher_roles.class_instance_id
      and ci.school_id = class_instance_teacher_roles.school_id
      and teacher_sm.user_id = class_instance_teacher_roles.teacher_user_id
      and teacher_sm.active = true
      and teacher_sm.role = 'teacher'
  )
);

