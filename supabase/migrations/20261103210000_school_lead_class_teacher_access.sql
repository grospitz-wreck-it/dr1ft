-- Treat school administrators and school leadership as teachers for class-scoped
-- teaching and reporting operations, while keeping access restricted to their
-- own school. The existing direct class-membership path remains unchanged.

create or replace function public.is_teacher_of_class_instance(target_instance_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    exists (
      select 1
      from public.class_instance_memberships cim
      where cim.class_instance_id = target_instance_id
        and cim.user_id = auth.uid()
        and cim.role in ('teacher', 'school_admin')
        and cim.left_at is null
    )
    or exists (
      select 1
      from public.class_instances ci
      join public.school_memberships sm
        on sm.school_id = ci.school_id
      where ci.id = target_instance_id
        and sm.user_id = auth.uid()
        and sm.active = true
        and sm.role in ('school_admin', 'school_lead')
    );
$$;

grant execute on function public.is_teacher_of_class_instance(uuid) to authenticated;
