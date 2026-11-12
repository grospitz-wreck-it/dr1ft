-- Class metadata is managed centrally in the school administration portal.
-- Teachers may still choose the class visual through the validated RPC, but
-- must not update class name, grade, school year, or other class instance data.
drop policy if exists "authorized staff update class instances"
  on public.class_instances;

drop policy if exists "school admins update class instances"
  on public.class_instances;

create policy "school admins update class instances"
  on public.class_instances
  for update
  to authenticated
  using (
    public.is_platform_admin()
    or exists (
      select 1
      from public.school_memberships sm
      where sm.school_id = class_instances.school_id
        and sm.user_id = (select auth.uid())
        and sm.active = true
        and sm.role = 'school_admin'
    )
  )
  with check (
    public.is_platform_admin()
    or exists (
      select 1
      from public.school_memberships sm
      where sm.school_id = class_instances.school_id
        and sm.user_id = (select auth.uid())
        and sm.active = true
        and sm.role = 'school_admin'
    )
  );
