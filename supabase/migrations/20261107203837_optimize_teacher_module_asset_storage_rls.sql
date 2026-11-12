
create or replace function private.can_read_teacher_module_asset(p_name text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.teacher_modules m
      where m.id::text = (storage.foldername(p_name))[2]
        and m.school_id::text = (storage.foldername(p_name))[1]
        and (
          m.created_by = (select auth.uid())
          or public.can_manage_school(m.school_id)
          or exists (
            select 1
            from public.teacher_module_class_assignments a
            join public.class_instance_memberships cim
              on cim.class_instance_id = a.class_instance_id
            where a.module_id = m.id
              and a.is_active
              and a.archived_at is null
              and cim.user_id = (select auth.uid())
              and cim.left_at is null
          )
        )
    );
$function$;

revoke all on function private.can_read_teacher_module_asset(text) from public, anon;
grant execute on function private.can_read_teacher_module_asset(text) to authenticated;

drop policy teacher_module_assets_read on storage.objects;

create policy teacher_module_assets_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'teacher-module-assets'
  and (select private.can_read_teacher_module_asset(name))
);

