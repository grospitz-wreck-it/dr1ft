-- Restrict class-wide scenario assignment management to class teachers and school/platform leadership.
-- Subject teachers keep read access and their separate teacher-module assignment workflow.

create or replace function public.can_manage_class_scenario_assignments(p_instance_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select
    auth.uid() is not null
    and (
      exists (
        select 1
        from public.class_instance_teacher_roles ctr
        where ctr.class_instance_id = p_instance_id
          and ctr.teacher_user_id = auth.uid()
          and ctr.role = 'class_teacher'
          and ctr.is_active = true
      )
      or exists (
        select 1
        from public.class_instances ci
        join public.school_memberships sm on sm.school_id = ci.school_id
        where ci.id = p_instance_id
          and sm.user_id = auth.uid()
          and sm.active = true
          and sm.role in ('school_admin', 'school_lead')
      )
      or exists (
        select 1
        from public.platform_staff ps
        where ps.user_id = auth.uid()
          and ps.role::text = 'platform_admin'
      )
    );
$function$;

revoke all on function public.can_manage_class_scenario_assignments(uuid) from public, anon;
grant execute on function public.can_manage_class_scenario_assignments(uuid) to authenticated, service_role;

drop policy if exists "teachers manage instance scenario assignments" on public.class_instance_scenario_assignments;
drop policy if exists "school_managers_manage_class_scenario_assignments" on public.class_instance_scenario_assignments;

create policy "class_managers_manage_instance_scenario_assignments"
on public.class_instance_scenario_assignments
for all
to authenticated
using ((select public.can_manage_class_scenario_assignments(class_instance_id)))
with check ((select public.can_manage_class_scenario_assignments(class_instance_id)));

create or replace function public.upsert_class_instance_scenario_assignment(
  p_instance_id uuid,
  p_scenario_id uuid,
  p_pacing_mode text default 'compact'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Nicht authentifiziert' using errcode = '28000';
  end if;

  if p_pacing_mode is null or p_pacing_mode not in ('compact', 'as_designed') then
    raise exception 'Ungültiger Pacing-Modus' using errcode = '22023';
  end if;

  if not public.can_manage_class_scenario_assignments(p_instance_id) then
    raise exception 'Keine Berechtigung, Szenarien dieser Klasse zu verwalten' using errcode = '42501';
  end if;

  if not exists (select 1 from public.scenarios s where s.id = p_scenario_id) then
    raise exception 'Szenario nicht gefunden' using errcode = 'P0002';
  end if;

  insert into public.class_instance_scenario_assignments (
    class_instance_id, scenario_id, assigned_by, pacing_mode
  )
  values (p_instance_id, p_scenario_id, auth.uid(), p_pacing_mode)
  on conflict (class_instance_id, scenario_id)
  do update set
    assigned_by = excluded.assigned_by,
    assigned_at = now(),
    pacing_mode = excluded.pacing_mode
  returning id into v_id;

  return v_id;
end;
$function$;

create or replace function public.remove_class_instance_scenario_assignment(
  p_instance_id uuid,
  p_scenario_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if auth.uid() is null then
    raise exception 'Nicht authentifiziert' using errcode = '28000';
  end if;

  if not public.can_manage_class_scenario_assignments(p_instance_id) then
    raise exception 'Keine Berechtigung, Szenarien dieser Klasse zu verwalten' using errcode = '42501';
  end if;

  delete from public.class_instance_scenario_assignments
  where class_instance_id = p_instance_id
    and scenario_id = p_scenario_id;
end;
$function$;

create or replace function public.update_class_instance_scenario_pacing(
  p_instance_id uuid,
  p_scenario_id uuid,
  p_pacing_mode text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if auth.uid() is null then
    raise exception 'Nicht authentifiziert' using errcode = '28000';
  end if;

  if p_pacing_mode is null or p_pacing_mode not in ('compact', 'as_designed') then
    raise exception 'Ungültiger Pacing-Modus' using errcode = '22023';
  end if;

  if not public.can_manage_class_scenario_assignments(p_instance_id) then
    raise exception 'Keine Berechtigung, das Pacing dieser Klasse zu ändern' using errcode = '42501';
  end if;

  update public.class_instance_scenario_assignments
  set pacing_mode = p_pacing_mode
  where class_instance_id = p_instance_id
    and scenario_id = p_scenario_id;

  if not found then
    raise exception 'Szenario ist dieser Klasse nicht zugewiesen' using errcode = 'P0002';
  end if;
end;
$function$;

revoke all on function public.upsert_class_instance_scenario_assignment(uuid, uuid, text) from public, anon;
revoke all on function public.remove_class_instance_scenario_assignment(uuid, uuid) from public, anon;
revoke all on function public.update_class_instance_scenario_pacing(uuid, uuid, text) from public, anon;
grant execute on function public.upsert_class_instance_scenario_assignment(uuid, uuid, text) to authenticated, service_role;
grant execute on function public.remove_class_instance_scenario_assignment(uuid, uuid) to authenticated, service_role;
grant execute on function public.update_class_instance_scenario_pacing(uuid, uuid, text) to authenticated, service_role;
