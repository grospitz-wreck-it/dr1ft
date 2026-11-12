-- Ensure explicitly assigned class teachers are recognized by class-scoped
-- aggregate/report RPCs that use is_teacher_of_class_instance().
create or replace function public.is_teacher_of_class_instance(target_instance_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select exists (
    select 1
    from public.class_instance_memberships cim
    where cim.class_instance_id = target_instance_id
      and cim.user_id = (select auth.uid())
      and cim.role in ('teacher'::public.user_role, 'school_admin'::public.user_role)
      and cim.left_at is null
  )
  or exists (
    select 1
    from public.class_instance_teacher_roles ctr
    where ctr.class_instance_id = target_instance_id
      and ctr.teacher_user_id = (select auth.uid())
      and ctr.role = 'class_teacher'
      and ctr.is_active = true
  );
$function$;

revoke all on function public.is_teacher_of_class_instance(uuid) from public, anon;
grant execute on function public.is_teacher_of_class_instance(uuid) to authenticated;
