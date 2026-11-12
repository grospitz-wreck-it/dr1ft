
create table if not exists public.teacher_class_subscriptions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_instance_id uuid not null references public.class_instances(id) on delete cascade,
  teacher_user_id uuid not null references auth.users(id) on delete cascade,
  school_year text not null,
  is_active boolean not null default true,
  subscribed_at timestamptz not null default now(),
  ended_at timestamptz,
  constraint teacher_class_subscriptions_unique unique (class_instance_id, teacher_user_id),
  constraint teacher_class_subscriptions_end_check check (ended_at is null or ended_at >= subscribed_at)
);
create index if not exists idx_teacher_class_subscriptions_teacher on public.teacher_class_subscriptions (teacher_user_id, is_active, school_year);
create index if not exists idx_teacher_class_subscriptions_class on public.teacher_class_subscriptions (class_instance_id, is_active);

create table if not exists public.class_instance_teacher_roles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_instance_id uuid not null references public.class_instances(id) on delete cascade,
  teacher_user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'class_teacher' check (role = 'class_teacher'),
  assigned_by uuid not null references auth.users(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  is_active boolean not null default true,
  constraint class_instance_teacher_roles_unique unique (class_instance_id, teacher_user_id)
);

create table if not exists public.teacher_class_module_assignments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.teacher_class_subscriptions(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  class_instance_id uuid not null references public.class_instances(id) on delete cascade,
  teacher_user_id uuid not null references auth.users(id) on delete cascade,
  school_year text not null,
  module_type text not null check (module_type in ('scenario', 'teacher_module')),
  module_id uuid not null,
  assigned_by uuid not null references auth.users(id) on delete restrict,
  is_active boolean not null default true,
  assigned_at timestamptz not null default now(),
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz,
  archived_at timestamptz,
  constraint teacher_class_module_assignments_unique unique (teacher_user_id, class_instance_id, module_type, module_id),
  constraint teacher_class_module_assignments_schedule_check check (scheduled_start_at is null or scheduled_end_at is null or scheduled_end_at > scheduled_start_at)
);
create index if not exists idx_teacher_class_module_assignments_scope on public.teacher_class_module_assignments (teacher_user_id, class_instance_id, module_type, module_id, is_active);

create or replace function public.can_subscribe_to_class_instance(p_class_instance_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.class_instances ci
    join public.school_memberships sm on sm.school_id = ci.school_id
    where ci.id = p_class_instance_id and ci.is_active = true and ci.status = 'active'
      and ci.school_year is not null and sm.user_id = (select auth.uid())
      and sm.active = true and sm.role in ('teacher', 'school_admin', 'school_lead')
  );
$$;

create or replace function public.has_teacher_module_assignment(p_class_instance_id uuid,p_module_type text,p_module_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.teacher_class_module_assignments a
    join public.teacher_class_subscriptions s on s.id = a.subscription_id
      and s.teacher_user_id = a.teacher_user_id and s.class_instance_id = a.class_instance_id
      and s.school_id = a.school_id
    join public.class_instances ci on ci.id = a.class_instance_id
      and ci.school_id = a.school_id and ci.school_year = a.school_year
    where a.class_instance_id = p_class_instance_id and a.teacher_user_id = (select auth.uid())
      and a.module_type = p_module_type and a.module_id = p_module_id
      and a.is_active = true and s.is_active = true and s.school_year = ci.school_year
      and ci.is_active = true and ci.status = 'active'
      and (a.scheduled_start_at is null or a.scheduled_start_at <= now())
      and (a.scheduled_end_at is null or a.scheduled_end_at > now())
  );
$$;

create or replace function public.validate_teacher_class_module_assignment()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_school_id uuid;
  v_class_year text;
  v_subscription_year text;
  v_subscription_teacher uuid;
  v_subscription_class uuid;
begin
  select s.school_id, s.teacher_user_id, s.school_year, s.class_instance_id, ci.school_year
    into v_school_id, v_subscription_teacher, v_subscription_year, v_subscription_class, v_class_year
  from public.teacher_class_subscriptions s
  join public.class_instances ci on ci.id = s.class_instance_id
  where s.id = new.subscription_id and s.is_active = true and ci.is_active = true and ci.status = 'active';

  if not found then raise exception 'Aktives Klassenabonnement erforderlich' using errcode = '42501'; end if;
  if new.class_instance_id is distinct from v_subscription_class
     or new.school_id is distinct from v_school_id
     or new.school_year is distinct from v_subscription_year
     or v_subscription_year is distinct from v_class_year
     or new.teacher_user_id is distinct from v_subscription_teacher
     or new.teacher_user_id is distinct from auth.uid()
     or new.assigned_by is distinct from auth.uid() then
    raise exception 'Klassen-, Schuljahr- oder Lehrkraftzuordnung ungültig' using errcode = '42501';
  end if;

  if new.module_type = 'scenario' then
    if not exists (select 1 from public.scenarios sc where sc.id = new.module_id and sc.is_active = true) then
      raise exception 'DR1FT-Modul nicht gefunden oder nicht aktiv' using errcode = '22023';
    end if;
  elsif new.module_type = 'teacher_module' then
    if not exists (select 1 from public.teacher_modules tm where tm.id = new.module_id and tm.school_id = v_school_id and tm.status = 'published') then
      raise exception 'Lehrkraft-Modul nicht verfügbar oder nicht veröffentlicht' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_teacher_class_module_assignment on public.teacher_class_module_assignments;
create trigger trg_validate_teacher_class_module_assignment before insert or update on public.teacher_class_module_assignments
for each row execute function public.validate_teacher_class_module_assignment();

alter table public.teacher_class_subscriptions enable row level security;
alter table public.class_instance_teacher_roles enable row level security;
alter table public.teacher_class_module_assignments enable row level security;

drop policy if exists teacher_class_subscriptions_read_own on public.teacher_class_subscriptions;
create policy teacher_class_subscriptions_read_own on public.teacher_class_subscriptions for select to authenticated
using (teacher_user_id = (select auth.uid()));
drop policy if exists teacher_class_subscriptions_school_admin_read on public.teacher_class_subscriptions;
create policy teacher_class_subscriptions_school_admin_read on public.teacher_class_subscriptions for select to authenticated
using (public.is_school_admin_of(teacher_class_subscriptions.school_id));
drop policy if exists teacher_class_subscriptions_self_insert on public.teacher_class_subscriptions;
create policy teacher_class_subscriptions_self_insert on public.teacher_class_subscriptions for insert to authenticated
with check (
  teacher_user_id = (select auth.uid())
  and public.can_subscribe_to_class_instance(class_instance_id)
  and exists (select 1 from public.class_instances ci where ci.id = teacher_class_subscriptions.class_instance_id
    and ci.school_id = teacher_class_subscriptions.school_id and ci.school_year = teacher_class_subscriptions.school_year)
);
drop policy if exists teacher_class_subscriptions_self_update on public.teacher_class_subscriptions;
create policy teacher_class_subscriptions_self_update on public.teacher_class_subscriptions for update to authenticated
using (teacher_user_id = (select auth.uid()))
with check (
  teacher_user_id = (select auth.uid())
  and school_id = (select ci.school_id from public.class_instances ci where ci.id = teacher_class_subscriptions.class_instance_id)
  and school_year = (select ci.school_year from public.class_instances ci where ci.id = teacher_class_subscriptions.class_instance_id)
);

drop policy if exists class_instance_teacher_roles_school_admin_read on public.class_instance_teacher_roles;
create policy class_instance_teacher_roles_school_admin_read on public.class_instance_teacher_roles for select to authenticated
using (public.is_school_admin_of(class_instance_teacher_roles.school_id) or teacher_user_id = (select auth.uid()));
drop policy if exists class_instance_teacher_roles_school_admin_manage on public.class_instance_teacher_roles;
create policy class_instance_teacher_roles_school_admin_manage on public.class_instance_teacher_roles for all to authenticated
using (public.is_school_admin_of(class_instance_teacher_roles.school_id))
with check (
  public.is_school_admin_of(class_instance_teacher_roles.school_id)
  and exists (
    select 1 from public.class_instances ci
    join public.school_memberships sm on sm.school_id = ci.school_id
    where ci.id = class_instance_teacher_roles.class_instance_id
      and ci.school_id = class_instance_teacher_roles.school_id
      and sm.user_id = class_instance_teacher_roles.teacher_user_id
      and sm.active = true and sm.role = 'teacher'
  )
);

drop policy if exists teacher_class_module_assignments_read_own on public.teacher_class_module_assignments;
create policy teacher_class_module_assignments_read_own on public.teacher_class_module_assignments for select to authenticated
using (teacher_user_id = (select auth.uid()));
drop policy if exists teacher_class_module_assignments_school_admin_read on public.teacher_class_module_assignments;
create policy teacher_class_module_assignments_school_admin_read on public.teacher_class_module_assignments for select to authenticated
using (public.is_school_admin_of(teacher_class_module_assignments.school_id));
drop policy if exists teacher_class_module_assignments_self_manage on public.teacher_class_module_assignments;
create policy teacher_class_module_assignments_self_manage on public.teacher_class_module_assignments for all to authenticated
using (
  teacher_user_id = (select auth.uid())
  and exists (select 1 from public.teacher_class_subscriptions s where s.id = teacher_class_module_assignments.subscription_id
    and s.teacher_user_id = (select auth.uid()) and s.is_active = true)
)
with check (
  teacher_user_id = (select auth.uid()) and assigned_by = (select auth.uid())
  and exists (select 1 from public.teacher_class_subscriptions s
    where s.id = teacher_class_module_assignments.subscription_id
      and s.teacher_user_id = (select auth.uid())
      and s.class_instance_id = teacher_class_module_assignments.class_instance_id
      and s.school_id = teacher_class_module_assignments.school_id
      and s.school_year = teacher_class_module_assignments.school_year and s.is_active = true)
);

create or replace function public.subscribe_teacher_to_class_instance(p_class_instance_id uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_user_id uuid := auth.uid(); v_school_id uuid; v_school_year text; v_subscription_id uuid;
begin
  if v_user_id is null then raise exception 'Anmeldung erforderlich' using errcode = '28000'; end if;
  select ci.school_id, ci.school_year into v_school_id, v_school_year
  from public.class_instances ci where ci.id = p_class_instance_id and ci.is_active = true and ci.status = 'active';
  if v_school_id is null or v_school_year is null then raise exception 'Aktive Klasseninstanz nicht gefunden' using errcode = '22023'; end if;
  if not exists (select 1 from public.school_memberships sm where sm.school_id = v_school_id and sm.user_id = v_user_id
    and sm.active = true and sm.role in ('teacher', 'school_admin', 'school_lead')) then
    raise exception 'Aktive Schulmitgliedschaft als Lehrkraft erforderlich' using errcode = '42501';
  end if;
  insert into public.teacher_class_subscriptions (school_id,class_instance_id,teacher_user_id,school_year,is_active,ended_at)
  values (v_school_id,p_class_instance_id,v_user_id,v_school_year,true,null)
  on conflict (class_instance_id,teacher_user_id) do update set school_id=excluded.school_id,
    school_year=excluded.school_year,is_active=true,ended_at=null
  returning id into v_subscription_id;
  return v_subscription_id;
end;
$$;

create or replace function public.unsubscribe_teacher_from_class_instance(p_class_instance_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Anmeldung erforderlich' using errcode = '28000'; end if;
  update public.teacher_class_subscriptions set is_active=false,ended_at=now()
    where class_instance_id=p_class_instance_id and teacher_user_id=auth.uid() and is_active=true;
  update public.teacher_class_module_assignments set is_active=false,archived_at=coalesce(archived_at,now())
    where class_instance_id=p_class_instance_id and teacher_user_id=auth.uid() and is_active=true;
end;
$$;

revoke all on function public.can_subscribe_to_class_instance(uuid) from public, anon;
grant execute on function public.can_subscribe_to_class_instance(uuid) to authenticated;
revoke all on function public.has_teacher_module_assignment(uuid,text,uuid) from public, anon;
grant execute on function public.has_teacher_module_assignment(uuid,text,uuid) to authenticated;
revoke all on function public.validate_teacher_class_module_assignment() from public, anon, authenticated;
revoke all on function public.subscribe_teacher_to_class_instance(uuid) from public, anon;
grant execute on function public.subscribe_teacher_to_class_instance(uuid) to authenticated;
revoke all on function public.unsubscribe_teacher_from_class_instance(uuid) from public, anon;
grant execute on function public.unsubscribe_teacher_from_class_instance(uuid) to authenticated;

