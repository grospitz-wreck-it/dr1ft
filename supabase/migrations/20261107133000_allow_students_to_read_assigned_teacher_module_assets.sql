-- Allow enrolled students to read images belonging to active teacher-created modules
-- assigned to their own class. Teacher/admin access remains unchanged.
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
        m.created_by = (select auth.uid())
        or public.can_manage_school(m.school_id)
        or exists (
          select 1
          from public.teacher_module_class_assignments a
          join public.class_instance_memberships cim
            on cim.class_instance_id = a.class_instance_id
          where a.module_id = m.id
            and a.is_active = true
            and a.archived_at is null
            and cim.user_id = (select auth.uid())
            and cim.left_at is null
        )
      )
  )
);
