
create policy "subscribed teachers read class student memberships"
on public.class_instance_memberships
for select to authenticated
using (
  role::text = 'student'
  and left_at is null
  and exists (
    select 1
    from public.teacher_class_subscriptions s
    where s.class_instance_id = class_instance_memberships.class_instance_id
      and s.teacher_user_id = (select auth.uid())
      and s.is_active = true
  )
);

