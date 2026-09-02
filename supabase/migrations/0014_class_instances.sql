-- ============================================================
-- DR1FT — Class Instances
--
-- Eine Klasse ist die dauerhafte pädagogische Einheit.
-- Eine Class Instance ist eine konkrete Durchführung / Gruppe dieser
-- Klasse. Damit können dieselbe Klasse, dasselbe Szenario und derselbe
-- Content mehrfach parallel laufen, ohne dass Fortschritt, Missionen
-- oder soziale Interaktionen vermischt werden.
--
-- Architektur:
--   class
--     └── class_instance
--          ├── memberships
--          └── scenario_assignments
--
-- Bestehende class_* Tabellen bleiben erhalten. Die Instance-Schicht ist
-- additiv und erlaubt eine schrittweise Migration der Anwendungen.
-- ============================================================

-- ---------- CLASS INSTANCES ----------

create type class_instance_status as enum (
  'draft',
  'active',
  'paused',
  'completed',
  'archived'
);

create table class_instances (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  name text not null,
  status class_instance_status not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_class_instances_class on class_instances(class_id);
create index idx_class_instances_status on class_instances(status);

-- ---------- INSTANCE MEMBERSHIPS ----------
-- Ein Nutzer kann grundsätzlich mehreren Instanzen angehören, z.B.
-- Lehrer mehreren Durchführungen. Die konkrete Schülergruppe wird hier
-- isoliert und nicht mehr nur über class_memberships bestimmt.

create table class_instance_memberships (
  id uuid primary key default gen_random_uuid(),
  class_instance_id uuid not null references class_instances(id) on delete cascade,
  user_id uuid not null references user_profiles(id) on delete cascade,
  role user_role not null default 'student',
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique (class_instance_id, user_id)
);

create index idx_instance_memberships_instance
  on class_instance_memberships(class_instance_id);
create index idx_instance_memberships_user
  on class_instance_memberships(user_id);

-- ---------- INSTANCE SCENARIO ASSIGNMENTS ----------
-- Assignment wird bewusst auf Instance-Ebene gespiegelt. pacing_mode ist
-- damit ebenfalls Teil der konkreten Durchführung.

create table class_instance_scenario_assignments (
  id uuid primary key default gen_random_uuid(),
  class_instance_id uuid not null references class_instances(id) on delete cascade,
  scenario_id uuid not null references scenarios(id) on delete cascade,
  assigned_by uuid references auth.users(id),
  assigned_at timestamptz not null default now(),
  pacing_mode text not null default 'compact'
    check (pacing_mode in ('compact', 'as_designed')),
  unique (class_instance_id, scenario_id)
);

create index idx_instance_scenario_assignments_instance
  on class_instance_scenario_assignments(class_instance_id);
create index idx_instance_scenario_assignments_scenario
  on class_instance_scenario_assignments(scenario_id);

-- ---------- INSTANCE CONTEXT ON USER DATA ----------
-- Nullable für Rückwärtskompatibilität mit bereits vorhandenen Daten.
-- Neue Flows sollen instance_id immer setzen.

alter table user_interactions
  add column class_instance_id uuid references class_instances(id) on delete cascade;

alter table user_mission_progress
  add column class_instance_id uuid references class_instances(id) on delete cascade;

alter table user_story_arc_progress
  add column class_instance_id uuid references class_instances(id) on delete cascade;

alter table user_unlocked_missions
  add column class_instance_id uuid references class_instances(id) on delete cascade;

alter table domain_events
  add column class_instance_id uuid references class_instances(id) on delete cascade;

create index idx_user_interactions_instance
  on user_interactions(class_instance_id, user_id, created_at desc);
create index idx_user_mission_progress_instance
  on user_mission_progress(class_instance_id, user_id);
create index idx_user_story_arc_progress_instance
  on user_story_arc_progress(class_instance_id, user_id);
create index idx_user_unlocked_missions_instance
  on user_unlocked_missions(class_instance_id, user_id);
create index idx_domain_events_instance
  on domain_events(class_instance_id, user_id, created_at desc);

-- Die bisherigen Unique-Constraints verhindern sonst denselben Nutzer /
-- dieselbe Mission in zwei verschiedenen Durchführungen.
alter table user_mission_progress
  drop constraint if exists user_mission_progress_user_id_mission_id_key;
alter table user_mission_progress
  add constraint user_mission_progress_instance_unique
  unique (class_instance_id, user_id, mission_id);

alter table user_story_arc_progress
  drop constraint if exists user_story_arc_progress_user_id_arc_id_key;
alter table user_story_arc_progress
  add constraint user_story_arc_progress_instance_unique
  unique (class_instance_id, user_id, arc_id);

alter table user_unlocked_missions
  drop constraint if exists user_unlocked_missions_user_id_mission_id_key;
alter table user_unlocked_missions
  add constraint user_unlocked_missions_instance_unique
  unique (class_instance_id, user_id, mission_id);

-- ---------- HELPER: INSTANCE MEMBERSHIP ----------

create or replace function user_is_instance_member(
  p_instance_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from class_instance_memberships cim
    where cim.class_instance_id = p_instance_id
      and cim.user_id = p_user_id
      and (cim.left_at is null or cim.left_at > now())
  );
$$;

-- ---------- RLS ----------

alter table class_instances enable row level security;
alter table class_instance_memberships enable row level security;
alter table class_instance_scenario_assignments enable row level security;

create policy "instance members can view their instance"
  on class_instances for select
  using (user_is_instance_member(id));

create policy "instance staff manage instance"
  on class_instances for all
  using (
    exists (
      select 1
      from class_instance_memberships cim
      where cim.class_instance_id = class_instances.id
        and cim.user_id = auth.uid()
        and cim.role in ('teacher', 'school_admin')
    )
  );

create policy "users view own instance memberships"
  on class_instance_memberships for select
  using (auth.uid() = user_id);

create policy "instance staff manage memberships"
  on class_instance_memberships for all
  using (
    exists (
      select 1
      from class_instance_memberships cim
      where cim.class_instance_id = class_instance_memberships.class_instance_id
        and cim.user_id = auth.uid()
        and cim.role in ('teacher', 'school_admin')
    )
  );

create policy "instance members view scenario assignments"
  on class_instance_scenario_assignments for select
  using (user_is_instance_member(class_instance_id));

create policy "instance staff manage scenario assignments"
  on class_instance_scenario_assignments for all
  using (
    exists (
      select 1
      from class_instance_memberships cim
      where cim.class_instance_id = class_instance_scenario_assignments.class_instance_id
        and cim.user_id = auth.uid()
        and cim.role in ('teacher', 'school_admin')
    )
  );

-- Instance-scoped reads for data that already has an instance_id.
create policy "users manage own instance interactions"
  on user_interactions for all
  using (
    auth.uid() = user_id
    and (class_instance_id is null or user_is_instance_member(class_instance_id))
  );

create policy "users manage own instance mission progress"
  on user_mission_progress for all
  using (
    auth.uid() = user_id
    and (class_instance_id is null or user_is_instance_member(class_instance_id))
  );

create policy "users manage own instance arc progress"
  on user_story_arc_progress for all
  using (
    auth.uid() = user_id
    and (class_instance_id is null or user_is_instance_member(class_instance_id))
  );

create policy "users manage own instance unlocked missions"
  on user_unlocked_missions for all
  using (
    auth.uid() = user_id
    and (class_instance_id is null or user_is_instance_member(class_instance_id))
  );

create policy "users read own instance events"
  on domain_events for select
  using (
    auth.uid() = user_id
    and (class_instance_id is null or user_is_instance_member(class_instance_id))
  );

-- ---------- INSTANCE CONTENT VIEW ----------
-- Analog zum bestehenden visible_content_for_user, aber mit einer
-- konkreten Durchführung als Isolation Boundary. NULL-Szenario bleibt
-- ambient content und wird bewusst nicht durch eine Assignment-Prüfung
-- ausgeschlossen; die App kann ihn wie bisher zusätzlich einmischen.

create or replace view visible_content_for_user_instance as
select distinct ci.*, cim.class_instance_id
from content_items ci
join class_instance_scenario_assignments cisa
  on cisa.scenario_id = ci.scenario_id
join class_instance_memberships cim
  on cim.class_instance_id = cisa.class_instance_id
where ci.status = 'live'
  and cim.user_id = auth.uid()
  and (cim.left_at is null or cim.left_at > now());

-- ---------- BOOTSTRAP HELPERS ----------
-- Kopiert die bestehende Klassenmitgliedschaft in eine konkrete Instance.
-- Idempotent und absichtlich als Funktion gehalten, damit UI/API später
-- denselben Weg benutzen kann.

create or replace function populate_class_instance_members(
  p_class_instance_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class_id uuid;
begin
  select class_id into v_class_id
  from class_instances
  where id = p_class_instance_id;

  if v_class_id is null then
    raise exception 'Unknown class instance: %', p_class_instance_id;
  end if;

  insert into class_instance_memberships (class_instance_id, user_id, role)
  select p_class_instance_id, user_id, role
  from class_memberships
  where class_id = v_class_id
  on conflict (class_instance_id, user_id) do nothing;
end;
$$;

create or replace function copy_class_scenario_to_instance(
  p_class_instance_id uuid,
  p_scenario_id uuid,
  p_assigned_by uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class_id uuid;
  v_pacing_mode text;
begin
  select class_id into v_class_id
  from class_instances
  where id = p_class_instance_id;

  if v_class_id is null then
    raise exception 'Unknown class instance: %', p_class_instance_id;
  end if;

  select pacing_mode into v_pacing_mode
  from class_scenario_assignments
  where class_id = v_class_id and scenario_id = p_scenario_id;

  insert into class_instance_scenario_assignments (
    class_instance_id, scenario_id, assigned_by, pacing_mode
  )
  values (
    p_class_instance_id,
    p_scenario_id,
    p_assigned_by,
    coalesce(v_pacing_mode, 'compact')
  )
  on conflict (class_instance_id, scenario_id)
  do update set pacing_mode = excluded.pacing_mode;
end;
$$;

comment on table class_instances is
  'Concrete Durchführung einer Klasse; Isolation Boundary für soziale und pädagogische Laufzeitdaten.';
comment on table class_instance_memberships is
  'Mitgliedschaft eines Nutzers in einer konkreten Class Instance.';
comment on table class_instance_scenario_assignments is
  'Szenario-Zuweisung innerhalb einer konkreten Class Instance.';
