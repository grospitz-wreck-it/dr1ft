-- Extend individual-report access to explicitly assigned class teachers.
-- A generic class subscription remains insufficient; module-scoped access is
-- handled separately by get_teacher_student_scenario_report_scoped_v1.

create or replace function public.can_view_class_individual_reports(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $function$
  select
    exists (
      select 1
      from public.platform_staff ps
      where ps.user_id = auth.uid()
        and ps.role = 'platform_admin'
    )
    or exists (
      select 1
      from public.class_instances ci
      join public.school_memberships sm
        on sm.school_id = ci.school_id
      where ci.id = p_class_id
        and sm.user_id = auth.uid()
        and sm.active = true
        and sm.role in ('school_admin', 'school_lead')
    )
    or exists (
      select 1
      from public.class_instances ci
      join public.class_instance_teacher_roles ctr
        on ctr.class_instance_id = ci.id
      where ci.id = p_class_id
        and ci.is_active = true
        and ctr.teacher_user_id = auth.uid()
        and ctr.role = 'class_teacher'
        and ctr.is_active = true
    );
$function$;

revoke all on function public.can_view_class_individual_reports(uuid) from public, anon;
grant execute on function public.can_view_class_individual_reports(uuid) to authenticated;
