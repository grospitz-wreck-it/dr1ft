-- Aggregate active time by route/card context. No page content or message text
-- is stored. Client heartbeats are short, idempotent and class-instance scoped.
create table if not exists public.student_activity_time_events (
  event_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  class_instance_id uuid not null references public.class_instances(id) on delete cascade,
  scenario_id uuid references public.scenarios(id) on delete set null,
  activity_type text not null check (activity_type in ('feed', 'other', 'learning_cards')),
  duration_seconds smallint not null check (duration_seconds between 1 and 60),
  created_at timestamptz not null default now()
);

create index if not exists student_activity_time_student_idx
  on public.student_activity_time_events (class_instance_id, user_id, created_at desc);

create index if not exists student_activity_time_scenario_idx
  on public.student_activity_time_events (class_instance_id, user_id, scenario_id, activity_type);

alter table public.student_activity_time_events enable row level security;
revoke all on table public.student_activity_time_events from public, anon, authenticated;

create or replace function public.record_student_activity_time_v1(
  p_event_id uuid,
  p_class_id uuid,
  p_activity_type text,
  p_duration_seconds integer,
  p_scenario_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Anmeldung erforderlich' using errcode = '28000';
  end if;

  if p_event_id is null
     or p_activity_type is null
     or p_duration_seconds is null
     or p_duration_seconds < 1
     or p_duration_seconds > 60
     or p_activity_type not in ('feed', 'other', 'learning_cards') then
    raise exception 'Ungültiger Zeitabschnitt' using errcode = '22023';
  end if;

  if p_activity_type = 'learning_cards' and p_scenario_id is null then
    raise exception 'Lernkartenzeit benötigt ein Szenario' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.class_instance_memberships cim
    where cim.class_instance_id = p_class_id
      and cim.user_id = v_user_id
      and cim.role::text = 'student'
      and cim.left_at is null
  ) then
    raise exception 'Aktive Schüler-Mitgliedschaft erforderlich' using errcode = '42501';
  end if;

  if p_scenario_id is not null and not exists (
    select 1 from public.class_instance_scenario_assignments a
    where a.class_instance_id = p_class_id
      and a.scenario_id = p_scenario_id
  ) then
    raise exception 'Szenario gehört nicht zu dieser Klasseninstanz' using errcode = '42501';
  end if;

  insert into public.student_activity_time_events (
    event_id, user_id, class_instance_id, scenario_id, activity_type, duration_seconds
  ) values (
    p_event_id, v_user_id, p_class_id, p_scenario_id, p_activity_type, p_duration_seconds::smallint
  ) on conflict (event_id) do nothing;
end;
$function$;

revoke all on function public.record_student_activity_time_v1(uuid, uuid, text, integer, uuid)
  from public, anon;
grant execute on function public.record_student_activity_time_v1(uuid, uuid, text, integer, uuid)
  to authenticated;

create or replace function public.get_teacher_student_activity_time_v1(
  p_class_id uuid,
  p_student_id uuid
)
returns table (
  activity_type text,
  scenario_id uuid,
  duration_seconds bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
begin
  if not public.is_teacher_of_class_instance(p_class_id) then
    raise exception 'Keine Berechtigung für diese Klasseninstanz'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.class_instance_memberships cim
    where cim.class_instance_id = p_class_id
      and cim.user_id = p_student_id
      and cim.role::text = 'student'
      and cim.left_at is null
  ) then
    raise exception 'Schüler:in gehört nicht aktiv zu dieser Klasseninstanz'
      using errcode = '42501';
  end if;

  return query
  select e.activity_type, e.scenario_id, sum(e.duration_seconds)::bigint
  from public.student_activity_time_events e
  where e.class_instance_id = p_class_id
    and e.user_id = p_student_id
  group by e.activity_type, e.scenario_id
  order by e.activity_type, e.scenario_id;
end;
$function$;

revoke all on function public.get_teacher_student_activity_time_v1(uuid, uuid)
  from public, anon;
grant execute on function public.get_teacher_student_activity_time_v1(uuid, uuid)
  to authenticated;

comment on table public.student_activity_time_events is
  'Short active-time aggregates by app area and optional assigned scenario. Stores no page content or message text.';
comment on function public.get_teacher_student_activity_time_v1(uuid, uuid) is
  'Teacher-authorized time totals grouped only by activity type and optional scenario; no detailed browsing or message history.';
