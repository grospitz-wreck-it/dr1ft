
create or replace function public.has_teacher_module_assignment(p_class_instance_id uuid,p_module_type text,p_module_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.teacher_class_module_assignments a
    join public.teacher_class_subscriptions s on s.id=a.subscription_id
      and s.teacher_user_id=a.teacher_user_id and s.class_instance_id=a.class_instance_id
      and s.school_id=a.school_id
    join public.class_instances ci on ci.id=a.class_instance_id
      and ci.school_id=a.school_id and ci.school_year=a.school_year
    join public.school_memberships sm on sm.school_id=a.school_id
      and sm.user_id=a.teacher_user_id and sm.active=true and sm.role='teacher'
    where a.class_instance_id=p_class_instance_id and a.teacher_user_id=(select auth.uid())
      and a.module_type=p_module_type and a.module_id=p_module_id
      and a.is_active=true and s.is_active=true and s.school_year=ci.school_year
      and ci.is_active=true and ci.status='active'
      and (a.scheduled_start_at is null or a.scheduled_start_at<=now())
      and (a.scheduled_end_at is null or a.scheduled_end_at>now())
  );
$$;

create or replace function public.validate_teacher_class_module_assignment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_school_id uuid;
  v_class_year text;
  v_subscription_year text;
  v_subscription_teacher uuid;
  v_subscription_class uuid;
begin
  select s.school_id,s.teacher_user_id,s.school_year,s.class_instance_id,ci.school_year
    into v_school_id,v_subscription_teacher,v_subscription_year,v_subscription_class,v_class_year
  from public.teacher_class_subscriptions s
  join public.class_instances ci on ci.id=s.class_instance_id
  where s.id=new.subscription_id and s.is_active=true and ci.is_active=true and ci.status='active';

  if not found then raise exception 'Aktives Klassenabonnement erforderlich' using errcode='42501'; end if;
  if new.class_instance_id is distinct from v_subscription_class
    or new.school_id is distinct from v_school_id
    or new.school_year is distinct from v_subscription_year
    or v_subscription_year is distinct from v_class_year
    or new.teacher_user_id is distinct from v_subscription_teacher
    or new.teacher_user_id is distinct from auth.uid()
    or new.assigned_by is distinct from auth.uid()
    or not exists (
      select 1 from public.school_memberships sm
      where sm.school_id=v_school_id and sm.user_id=auth.uid()
        and sm.active=true and sm.role='teacher'
    ) then
    raise exception 'Klassen-, Schuljahr- oder Lehrkraftzuordnung ungültig' using errcode='42501';
  end if;

  if new.module_type='scenario' then
    if not exists(select 1 from public.scenarios sc where sc.id=new.module_id and sc.is_active=true) then
      raise exception 'DR1FT-Modul nicht gefunden oder nicht aktiv' using errcode='22023';
    end if;
  elsif new.module_type='teacher_module' then
    if not exists(select 1 from public.teacher_modules tm where tm.id=new.module_id and tm.school_id=v_school_id and tm.status='published') then
      raise exception 'Lehrkraft-Modul nicht verfügbar oder nicht veröffentlicht' using errcode='42501';
    end if;
  end if;
  return new;
end;
$$;

delete from public.teacher_class_module_assignments
where class_instance_id='f93752a6-cdfb-4cd1-8763-a2bdd8d28c87'
  and teacher_user_id='d66af861-dceb-4c61-8f9c-ac3937959f77';

delete from public.teacher_class_subscriptions
where class_instance_id='f93752a6-cdfb-4cd1-8763-a2bdd8d28c87'
  and teacher_user_id='d66af861-dceb-4c61-8f9c-ac3937959f77';

