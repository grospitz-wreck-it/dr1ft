-- Keep teacher-module post reads scoped while avoiding recursive RLS policy expansion.
-- The helper is private, callable only by authenticated users, and always binds access
-- to auth.uid() inside the function (never to a caller-supplied user id).

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.can_read_teacher_module_posts(p_module_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select auth.uid() is not null
    and exists (
      select 1
      from public.teacher_modules m
      where m.id = p_module_id
        and (
          m.created_by = auth.uid()
          or public.can_manage_school(m.school_id)
          or (
            m.status = 'published'
            and m.visibility_scope = 'school'
            and exists (
              select 1
              from public.school_memberships sm
              where sm.school_id = m.school_id
                and sm.user_id = auth.uid()
                and sm.active = true
                and sm.role = 'teacher'
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
                and ci.school_id = m.school_id
                and public.is_teacher_of_class_instance(ci.id)
            )
          )
          or (
            m.status = 'published'
            and exists (
              select 1
              from public.teacher_module_class_assignments a
              join public.class_instance_memberships cim
                on cim.class_instance_id = a.class_instance_id
              where a.module_id = m.id
                and a.is_active = true
                and cim.user_id = auth.uid()
                and cim.left_at is null
            )
          )
        )
    );
$function$;

revoke all on function private.can_read_teacher_module_posts(uuid) from public, anon;
grant execute on function private.can_read_teacher_module_posts(uuid) to authenticated;

drop policy if exists teacher_module_posts_assigned_read on public.teacher_module_posts;
drop policy if exists teacher_module_posts_teacher_library_read on public.teacher_module_posts;
drop policy if exists teacher_module_posts_creator_manage on public.teacher_module_posts;

create policy teacher_module_posts_scoped_read
on public.teacher_module_posts
for select
to authenticated
using ((select private.can_read_teacher_module_posts(module_id)));

create policy teacher_module_posts_creator_insert
on public.teacher_module_posts
for insert
to authenticated
with check (
  exists (
    select 1 from public.teacher_modules m
    where m.id = teacher_module_posts.module_id
      and m.created_by = (select auth.uid())
  )
);

create policy teacher_module_posts_creator_update
on public.teacher_module_posts
for update
to authenticated
using (
  exists (
    select 1 from public.teacher_modules m
    where m.id = teacher_module_posts.module_id
      and m.created_by = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.teacher_modules m
    where m.id = teacher_module_posts.module_id
      and m.created_by = (select auth.uid())
  )
);

create policy teacher_module_posts_creator_delete
on public.teacher_module_posts
for delete
to authenticated
using (
  exists (
    select 1 from public.teacher_modules m
    where m.id = teacher_module_posts.module_id
      and m.created_by = (select auth.uid())
  )
);

