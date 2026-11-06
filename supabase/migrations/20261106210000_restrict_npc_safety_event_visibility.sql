-- DR1FT: keep NPC safety/moderation events out of student-visible class data.
--
-- The existing policy exposed every NPC safety event for a class instance to
-- every active member of that instance. These records are operational safety
-- signals, not peer-facing learning content. Restrict reads to assigned
-- teachers/school admins for that instance and platform staff/admins.

drop policy if exists "npc safety members readable"
  on public.npc_safety_events;

create policy "npc safety assigned staff readable"
  on public.npc_safety_events
  for select
  to authenticated
  using (
    public.is_teacher_of_class_instance(class_instance_id)
    or public.is_platform_staff()
    or public.is_platform_admin()
  );
