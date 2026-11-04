-- Let a currently assigned class teacher create and maintain their own
-- teacher modules even when the account has no separate school_memberships row.
-- School membership remains supported for existing school-level creators.

drop policy if exists teacher_modules_creator_manage on public.teacher_modules;

create policy teacher_modules_creator_manage
on public.teacher_modules
for all
to authenticated
using (
  created_by = auth.uid()
  and (
    exists (
      select 1
      from public.school_memberships sm
      where sm.school_id = teacher_modules.school_id
        and sm.user_id = auth.uid()
        and sm.active = true
    )
    or exists (
      select 1
      from public.class_instances ci
      join public.class_instance_memberships cim
        on cim.class_instance_id = ci.id
      where ci.school_id = teacher_modules.school_id
        and cim.user_id = auth.uid()
        and cim.role = 'teacher'
        and cim.left_at is null
    )
  )
)
with check (
  created_by = auth.uid()
  and (
    exists (
      select 1
      from public.school_memberships sm
      where sm.school_id = teacher_modules.school_id
        and sm.user_id = auth.uid()
        and sm.active = true
    )
    or exists (
      select 1
      from public.class_instances ci
      join public.class_instance_memberships cim
        on cim.class_instance_id = ci.id
      where ci.school_id = teacher_modules.school_id
        and cim.user_id = auth.uid()
        and cim.role = 'teacher'
        and cim.left_at is null
    )
  )
);

notify pgrst, 'reload schema';
