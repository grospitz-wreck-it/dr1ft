-- Allow school administrators to create and assign modules within their own school.
-- Class teachers still require an active teacher membership in the target class.
-- Every policy remains bound to the module/class school_id.

drop policy if exists teacher_modules_assigned_class_read on public.teacher_modules;
create policy teacher_modules_assigned_class_read
on public.teacher_modules for select to authenticated
using (
  status = 'published'
  and (
    public.is_school_admin_of(teacher_modules.school_id)
    or exists (
      select 1
      from public.teacher_module_class_assignments a
      join public.class_instance_memberships cim on cim.class_instance_id = a.class_instance_id
      where a.module_id = teacher_modules.id
        and a.is_active = true
        and cim.user_id = auth.uid()
        and cim.left_at is null
    )
  )
);

drop policy if exists teacher_module_assignments_members_read on public.teacher_module_class_assignments;
create policy teacher_module_assignments_members_read
on public.teacher_module_class_assignments for select to authenticated
using (
  public.is_school_admin_of(teacher_module_class_assignments.school_id)
  or exists (
    select 1 from public.class_instance_memberships cim
    where cim.class_instance_id = teacher_module_class_assignments.class_instance_id
      and cim.user_id = auth.uid()
      and cim.left_at is null
  )
);

drop policy if exists teacher_module_assignments_teacher_manage on public.teacher_module_class_assignments;
create policy teacher_module_assignments_teacher_manage
on public.teacher_module_class_assignments for all to authenticated
using (
  assigned_by = auth.uid()
  and (
    public.is_school_admin_of(teacher_module_class_assignments.school_id)
    or exists (
      select 1 from public.class_instance_memberships cim
      where cim.class_instance_id = teacher_module_class_assignments.class_instance_id
        and cim.user_id = auth.uid()
        and cim.role = 'teacher'
        and cim.left_at is null
    )
  )
)
with check (
  assigned_by = auth.uid()
  and (
    public.is_school_admin_of(teacher_module_class_assignments.school_id)
    or exists (
      select 1 from public.class_instance_memberships cim
      where cim.class_instance_id = teacher_module_class_assignments.class_instance_id
        and cim.user_id = auth.uid()
        and cim.role = 'teacher'
        and cim.left_at is null
    )
  )
);

drop policy if exists teacher_module_posts_assigned_read on public.teacher_module_posts;
create policy teacher_module_posts_assigned_read
on public.teacher_module_posts for select to authenticated
using (
  exists (
    select 1
    from public.teacher_modules m
    join public.teacher_module_class_assignments a on a.module_id = m.id
    where m.id = teacher_module_posts.module_id
      and m.status = 'published'
      and a.is_active = true
      and (
        public.is_school_admin_of(m.school_id)
        or exists (
          select 1 from public.class_instance_memberships cim
          where cim.class_instance_id = a.class_instance_id
            and cim.user_id = auth.uid()
            and cim.left_at is null
        )
      )
  )
);

drop policy if exists teacher_module_assets_read on storage.objects;
create policy teacher_module_assets_read
on storage.objects for select to authenticated
using (
  bucket_id = 'teacher-module-assets'
  and exists (
    select 1
    from public.teacher_modules m
    where m.id::text = (storage.foldername(name))[2]
      and m.school_id::text = (storage.foldername(name))[1]
      and (
        m.created_by = auth.uid()
        or public.is_school_admin_of(m.school_id)
        or exists (
          select 1
          from public.teacher_module_class_assignments a
          join public.class_instance_memberships cim on cim.class_instance_id = a.class_instance_id
          where a.module_id = m.id and a.is_active = true
            and cim.user_id = auth.uid() and cim.left_at is null
        )
      )
  )
);
