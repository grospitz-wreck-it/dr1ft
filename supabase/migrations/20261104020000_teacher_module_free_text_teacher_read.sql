-- Teachers may read only the free-text responses for modules assigned to their own class.
drop policy if exists teacher_module_post_votes_teacher_read on public.teacher_module_post_votes;
create policy teacher_module_post_votes_teacher_read
on public.teacher_module_post_votes
for select
to authenticated
using (
  exists (
    select 1
    from public.teacher_module_class_assignments a
    join public.class_instance_memberships cim
      on cim.class_instance_id = a.class_instance_id
    where a.module_id = teacher_module_post_votes.module_id
      and a.class_instance_id = teacher_module_post_votes.class_instance_id
      and cim.user_id = auth.uid()
      and cim.role = 'teacher'
      and cim.left_at is null
  )
  or exists (
    select 1
    from public.teacher_module_class_assignments a
    join public.school_memberships sm
      on sm.school_id = a.school_id
    where a.module_id = teacher_module_post_votes.module_id
      and a.class_instance_id = teacher_module_post_votes.class_instance_id
      and sm.user_id = auth.uid()
      and sm.active = true
      and sm.role = 'school_admin'
  )
);
