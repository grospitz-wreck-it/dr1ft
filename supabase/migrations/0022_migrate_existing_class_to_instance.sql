-- DR1FT: migrate legacy classes into class instances and backfill memberships
-- Safe/idempotent migration for existing MVP data.

insert into public.class_instances (
  id, school_id, name, grade_level, school_year, access_code, created_by, is_active
)
select
  c.id,
  c.school_id,
  c.name,
  c.grade_level,
  '2026/27',
  c.access_code,
  c.created_by,
  c.is_active
from public.classes c
where not exists (
  select 1 from public.class_instances ci where ci.id = c.id
);

insert into public.class_instance_memberships (
  class_instance_id, user_id, role, joined_at
)
select
  cm.class_id,
  cm.user_id,
  cm.role,
  coalesce(cm.joined_at, now())
from public.class_memberships cm
where exists (
  select 1 from public.class_instances ci where ci.id = cm.class_id
)
on conflict (class_instance_id, user_id) do nothing;

-- Backfill any interactions/progress that can be unambiguously mapped through
-- the user's current legacy class membership.
update public.user_interactions ui
set class_instance_id = cm.class_id
from public.class_memberships cm
where ui.class_instance_id is null
  and ui.user_id = cm.user_id
  and exists (
    select 1 from public.class_instances ci where ci.id = cm.class_id
  );

update public.user_mission_progress ump
set class_instance_id = cm.class_id
from public.class_memberships cm
where ump.class_instance_id is null
  and ump.user_id = cm.user_id
  and exists (
    select 1 from public.class_instances ci where ci.id = cm.class_id
  );

update public.user_competency_progress ucp
set class_instance_id = cm.class_id
from public.class_memberships cm
where ucp.class_instance_id is null
  and ucp.user_id = cm.user_id
  and exists (
    select 1 from public.class_instances ci where ci.id = cm.class_id
  );

-- Mirror existing scenario assignments into the instance layer.
insert into public.class_instance_scenario_assignments (
  class_instance_id, scenario_id, assigned_by, assigned_at
)
select
  csa.class_id,
  csa.scenario_id,
  csa.assigned_by,
  coalesce(csa.assigned_at, now())
from public.class_scenario_assignments csa
where exists (
  select 1 from public.class_instances ci where ci.id = csa.class_id
)
on conflict (class_instance_id, scenario_id) do nothing;
