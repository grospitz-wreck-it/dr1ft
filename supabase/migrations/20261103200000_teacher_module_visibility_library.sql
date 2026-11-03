-- Teacher module library visibility is separate from class activation.
alter table public.teacher_modules
  add column if not exists visibility_scope text not null default 'class';

alter table public.teacher_modules
  drop constraint if exists teacher_modules_visibility_scope_check;

alter table public.teacher_modules
  add constraint teacher_modules_visibility_scope_check
  check (visibility_scope in ('private', 'school', 'class'));

-- Creators can always find their own modules. School-visible modules can be
-- discovered by active teachers and school admins in the same tenant.
-- Class-only modules are visible to the teacher/admins of assigned classes.
drop policy if exists teacher_modules_teacher_library_read on public.teacher_modules;
create policy teacher_modules_teacher_library_read
on public.teacher_modules for select to authenticated
using (
  created_by = auth.uid()
  or (
    status = 'published'
    and visibility_scope = 'school'
    and exists (
      select 1 from public.school_memberships sm
      where sm.school_id = teacher_modules.school_id
        and sm.user_id = auth.uid()
        and sm.active = true
        and sm.role in ('teacher', 'school_admin')
    )
  )
  or (
    status = 'published'
    and visibility_scope = 'class'
    and exists (
      select 1
      from public.teacher_module_class_assignments a
      join public.class_instances ci on ci.id = a.class_instance_id
      where a.module_id = teacher_modules.id
        and ci.school_id = teacher_modules.school_id
        and (
          exists (
            select 1 from public.school_memberships sm
            where sm.school_id = ci.school_id
              and sm.user_id = auth.uid()
              and sm.active = true
              and sm.role = 'school_admin'
          )
          or exists (
            select 1 from public.class_instance_memberships cim
            where cim.class_instance_id = ci.id
              and cim.user_id = auth.uid()
              and cim.left_at is null
              and cim.role = 'teacher'
          )
        )
    )
  )
);

drop policy if exists teacher_module_posts_teacher_library_read on public.teacher_module_posts;
create policy teacher_module_posts_teacher_library_read
on public.teacher_module_posts for select to authenticated
using (
  exists (
    select 1 from public.teacher_modules m
    where m.id = teacher_module_posts.module_id
      and (
        m.created_by = auth.uid()
        or (
          m.status = 'published'
          and m.visibility_scope = 'school'
          and exists (
            select 1 from public.school_memberships sm
            where sm.school_id = m.school_id
              and sm.user_id = auth.uid()
              and sm.active = true
              and sm.role in ('teacher', 'school_admin')
          )
        )
        or (
          m.status = 'published'
          and m.visibility_scope = 'class'
          and exists (
            select 1
            from public.teacher_module_class_assignments a
            join public.class_instances ci on ci.id = a.class_instance_id
            where a.module_id = m.id
              and (
                exists (
                  select 1 from public.school_memberships sm
                  where sm.school_id = ci.school_id
                    and sm.user_id = auth.uid()
                    and sm.active = true
                    and sm.role = 'school_admin'
                )
                or exists (
                  select 1 from public.class_instance_memberships cim
                  where cim.class_instance_id = ci.id
                    and cim.user_id = auth.uid()
                    and cim.left_at is null
                    and cim.role = 'teacher'
                )
              )
          )
        )
      )
  )
);

notify pgrst, 'reload schema';
