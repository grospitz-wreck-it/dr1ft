-- ============================================================
-- DR1FT — Klasseninstanzen / Schuljahre / isolierte Runtime
--
-- GLOBAL CONTENT bleibt global.
-- Runtime-Daten werden an eine konkrete Klasseninstanz gebunden.
-- Eine Klasseninstanz entspricht einer Klasse in einem Schuljahr.
-- Schüler-Identitäten bleiben erhalten und können in eine neue
-- Klasseninstanz übernommen werden.
--
-- WICHTIG:
-- Social Data darf niemals klassenübergreifend sichtbar werden.
-- Lernhistorie darf über Schuljahre erhalten bleiben.
-- ============================================================

-- ---------- SCHOOL YEAR ----------
-- Ein Schuljahr wird bewusst als eigene Entität geführt, damit eine
-- bestehende Klasse im Folgejahr als neue Instanz weitergeführt werden kann.

create table class_instances (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade,
  name text not null,                         -- z.B. "8a"
  grade_level int,
  school_year text not null,                  -- z.B. "2026/27"
  access_code text unique not null,
  created_by uuid references auth.users(id),
  previous_instance_id uuid references class_instances(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_class_instances_school_year
  on class_instances(school_id, school_year);

create index idx_class_instances_previous
  on class_instances(previous_instance_id);

-- ---------- CLASS MEMBERSHIP HISTORY ----------
-- Eine Person kann über mehrere Schuljahre Mitglied verschiedener
-- Klasseninstanzen sein. Die User-Identität bleibt unverändert.

create table class_instance_memberships (
  id uuid primary key default gen_random_uuid(),
  class_instance_id uuid not null references class_instances(id) on delete cascade,
  user_id uuid not null references user_profiles(id) on delete cascade,
  role user_role not null default 'student',
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique (class_instance_id, user_id)
);

create index idx_class_instance_memberships_instance
  on class_instance_memberships(class_instance_id);

create index idx_class_instance_memberships_user
  on class_instance_memberships(user_id);

-- ---------- SCENARIO ASSIGNMENTS PER INSTANCE ----------
-- Das Szenario bleibt global, die Freischaltung gehört zur konkreten
-- Klasseninstanz.

create table class_instance_scenario_assignments (
  id uuid primary key default gen_random_uuid(),
  class_instance_id uuid not null references class_instances(id) on delete cascade,
  scenario_id uuid not null references scenarios(id) on delete cascade,
  assigned_by uuid references auth.users(id),
  assigned_at timestamptz not null default now(),
  unique (class_instance_id, scenario_id)
);

create index idx_class_instance_scenario_assignments_instance
  on class_instance_scenario_assignments(class_instance_id);

-- ---------- RUNTIME SCOPE ----------
-- Social interactions gehören immer zu genau einer Klasseninstanz.
-- Die Spalte wird absichtlich nullable ergänzt, damit vorhandene
-- historische Daten migriert werden können. Neue Runtime-Daten sollen
-- immer mit class_instance_id geschrieben werden.

alter table user_interactions
  add column class_instance_id uuid references class_instances(id) on delete cascade;

create index idx_user_interactions_class_instance
  on user_interactions(class_instance_id);

create index idx_user_interactions_instance_content
  on user_interactions(class_instance_id, content_item_id);

-- Mission progress ist ebenfalls Instanz-Kontext. Die bisherige
-- user_id-Historie bleibt erhalten und kann später longitudinal ausgewertet
-- werden; neue Einträge werden einer Klasseninstanz zugeordnet.

alter table user_mission_progress
  add column class_instance_id uuid references class_instances(id) on delete cascade;

create index idx_user_mission_progress_class_instance
  on user_mission_progress(class_instance_id);

-- Entscheidungen/Kompetenzdaten bleiben historisch userbezogen; der
-- aktuelle Klassenkontext kann zusätzlich angegeben werden.

alter table user_competency_progress
  add column class_instance_id uuid references class_instances(id) on delete cascade;

create index idx_user_competency_progress_class_instance
  on user_competency_progress(class_instance_id);

-- ---------- RLS ----------

alter table class_instances enable row level security;
alter table class_instance_memberships enable row level security;
alter table class_instance_scenario_assignments enable row level security;

-- Nutzer dürfen nur Instanzen sehen, denen sie angehören.
create policy "members view their class instance"
  on class_instances for select
  using (
    exists (
      select 1
      from class_instance_memberships cim
      where cim.class_instance_id = class_instances.id
        and cim.user_id = auth.uid()
        and cim.left_at is null
    )
  );

-- Lehrkräfte dürfen Instanzen ihrer eigenen Klassen verwalten.
create policy "teachers manage class instances"
  on class_instances for all
  using (
    exists (
      select 1
      from class_instance_memberships cim
      where cim.class_instance_id = class_instances.id
        and cim.user_id = auth.uid()
        and cim.role in ('teacher', 'school_admin')
        and cim.left_at is null
    )
  )
  with check (
    exists (
      select 1
      from class_instance_memberships cim
      where cim.class_instance_id = class_instances.id
        and cim.user_id = auth.uid()
        and cim.role in ('teacher', 'school_admin')
        and cim.left_at is null
    )
  );

create policy "members view instance memberships"
  on class_instance_memberships for select
  using (
    exists (
      select 1
      from class_instance_memberships own
      where own.class_instance_id = class_instance_memberships.class_instance_id
        and own.user_id = auth.uid()
        and own.left_at is null
    )
  );

create policy "teachers manage instance memberships"
  on class_instance_memberships for all
  using (
    exists (
      select 1
      from class_instance_memberships own
      where own.class_instance_id = class_instance_memberships.class_instance_id
        and own.user_id = auth.uid()
        and own.role in ('teacher', 'school_admin')
        and own.left_at is null
    )
  )
  with check (
    exists (
      select 1
      from class_instance_memberships own
      where own.class_instance_id = class_instance_memberships.class_instance_id
        and own.user_id = auth.uid()
        and own.role in ('teacher', 'school_admin')
        and own.left_at is null
    )
  );

create policy "members view instance scenario assignments"
  on class_instance_scenario_assignments for select
  using (
    exists (
      select 1
      from class_instance_memberships cim
      where cim.class_instance_id = class_instance_scenario_assignments.class_instance_id
        and cim.user_id = auth.uid()
        and cim.left_at is null
    )
  );

create policy "teachers manage instance scenario assignments"
  on class_instance_scenario_assignments for all
  using (
    exists (
      select 1
      from class_instance_memberships cim
      where cim.class_instance_id = class_instance_scenario_assignments.class_instance_id
        and cim.user_id = auth.uid()
        and cim.role in ('teacher', 'school_admin')
        and cim.left_at is null
    )
  )
  with check (
    exists (
      select 1
      from class_instance_memberships cim
      where cim.class_instance_id = class_instance_scenario_assignments.class_instance_id
        and cim.user_id = auth.uid()
        and cim.role in ('teacher', 'school_admin')
        and cim.left_at is null
    )
  );

-- ---------- SOCIAL ISOLATION ----------
-- Eine Interaktion darf nur geschrieben werden, wenn der aktuelle User
-- Mitglied genau dieser Klasseninstanz ist.

create policy "members manage own scoped interactions"
  on user_interactions for all
  using (
    user_id = auth.uid()
    and class_instance_id is not null
    and exists (
      select 1
      from class_instance_memberships cim
      where cim.class_instance_id = user_interactions.class_instance_id
        and cim.user_id = auth.uid()
        and cim.left_at is null
    )
  )
  with check (
    user_id = auth.uid()
    and class_instance_id is not null
    and exists (
      select 1
      from class_instance_memberships cim
      where cim.class_instance_id = user_interactions.class_instance_id
        and cim.user_id = auth.uid()
        and cim.left_at is null
    )
  );

-- Lesen von Social Data ist strikt auf die eigene Instanz begrenzt.
create policy "members view instance interactions"
  on user_interactions for select
  using (
    class_instance_id is not null
    and exists (
      select 1
      from class_instance_memberships cim
      where cim.class_instance_id = user_interactions.class_instance_id
        and cim.user_id = auth.uid()
        and cim.left_at is null
    )
  );

-- ---------- HELPER FUNCTIONS ----------

create or replace function get_class_instance_by_access_code(p_access_code text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select id
  from class_instances
  where access_code = upper(trim(p_access_code))
    and is_active = true
  limit 1;
$$;

-- Erstellt eine neue Schuljahresinstanz aus einer bestehenden Instanz.
-- Schüler werden nur als Identitäten/Mitglieder übernommen; Social Runtime
-- und alte Interaktionen werden NICHT kopiert.
create or replace function create_next_class_instance(
  p_previous_instance_id uuid,
  p_name text,
  p_school_year text,
  p_access_code text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_id uuid;
  v_school_id uuid;
  v_grade_level int;
begin
  select school_id, grade_level
    into v_school_id, v_grade_level
  from class_instances
  where id = p_previous_instance_id;

  if v_school_id is null then
    raise exception 'Ausgangsklasse nicht gefunden';
  end if;

  if not exists (
    select 1
    from class_instance_memberships
    where class_instance_id = p_previous_instance_id
      and user_id = auth.uid()
      and role in ('teacher', 'school_admin')
      and left_at is null
  ) then
    raise exception 'Keine Berechtigung für diese Klasse';
  end if;

  insert into class_instances (
    school_id, name, grade_level, school_year, access_code,
    created_by, previous_instance_id
  )
  values (
    v_school_id, p_name, v_grade_level + 1, p_school_year,
    upper(trim(p_access_code)), auth.uid(), p_previous_instance_id
  )
  returning id into v_new_id;

  -- Lehrkraft wird übernommen.
  insert into class_instance_memberships (class_instance_id, user_id, role)
  select v_new_id, user_id, role
  from class_instance_memberships
  where class_instance_id = p_previous_instance_id
    and role in ('teacher', 'school_admin')
    and left_at is null
  on conflict (class_instance_id, user_id) do nothing;

  return v_new_id;
end;
$$;

-- Schüler gezielt in die neue Instanz übernehmen.
create or replace function copy_student_to_class_instance(
  p_previous_instance_id uuid,
  p_new_instance_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from class_instance_memberships
    where class_instance_id = p_previous_instance_id
      and user_id = auth.uid()
      and role in ('teacher', 'school_admin')
      and left_at is null
  ) then
    raise exception 'Keine Berechtigung für diese Klasse';
  end if;

  if not exists (
    select 1 from class_instances
    where id = p_new_instance_id
      and previous_instance_id = p_previous_instance_id
  ) then
    raise exception 'Zielklasse gehört nicht zum angegebenen Schuljahreswechsel';
  end if;

  insert into class_instance_memberships (class_instance_id, user_id, role)
  values (p_new_instance_id, p_user_id, 'student')
  on conflict (class_instance_id, user_id) do nothing;
end;
$$;

-- ---------- LONGITUDINAL LEARNING VIEW ----------
-- Erlaubt Lehrkräften, den Lernfortschritt eines Schülers über mehrere
-- Schuljahre auszuwerten, ohne Social Data anderer Klassen zu öffnen.

create view student_class_history as
select
  cim.user_id,
  ci.id as class_instance_id,
  ci.school_id,
  ci.name as class_name,
  ci.grade_level,
  ci.school_year,
  cim.joined_at,
  cim.left_at
from class_instance_memberships cim
join class_instances ci on ci.id = cim.class_instance_id;
