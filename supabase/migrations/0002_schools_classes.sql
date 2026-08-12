-- ============================================================
-- DR1FT — Schul-/Klassenmodell
-- Setzt auf 0001_init_schema.sql auf.
-- Prinzip: einfacher Einstieg jetzt (Zugangscode), erweiterbar später
-- (z.B. LDAP/Schul-Cloud-SSO), ohne dass sich dieses Schema ändern muss.
-- ============================================================

create type user_role as enum ('student', 'teacher', 'school_admin');

-- ---------- SCHOOLS ----------

create table schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text,                              -- z.B. Bundesland, für spätere DSGVO-/Meldepflichten
  created_at timestamptz not null default now()
);

-- ---------- CLASSES ----------
-- Eine Klasse gehört zu einer Schule, wird von einer Lehrkraft verwaltet

create table classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade,
  name text not null,                       -- z.B. "9b"
  access_code text unique not null,         -- Schüler treten hierüber bei
  created_by uuid references auth.users(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_classes_access_code on classes(access_code);

-- ---------- CLASS MEMBERSHIPS ----------
-- Verknüpft user_profiles mit Klassen + Rolle

create table class_memberships (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id) on delete cascade,
  user_id uuid references user_profiles(id) on delete cascade,
  role user_role not null default 'student',
  joined_at timestamptz not null default now(),
  unique (class_id, user_id)
);

create index idx_class_memberships_user on class_memberships(user_id);
create index idx_class_memberships_class on class_memberships(class_id);

-- ---------- SCENARIO ASSIGNMENTS ----------
-- Lehrkraft steuert, welche Szenarien für welche Klasse freigeschaltet sind.
-- Ohne Eintrag hier ist ein Szenario für die Klasse NICHT sichtbar,
-- auch wenn der Content selbst status='live' hat.

create table class_scenario_assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id) on delete cascade,
  scenario_id uuid references scenarios(id) on delete cascade,
  assigned_by uuid references auth.users(id),
  assigned_at timestamptz not null default now(),
  unique (class_id, scenario_id)
);

-- ---------- ROW LEVEL SECURITY ----------

alter table schools enable row level security;
alter table classes enable row level security;
alter table class_memberships enable row level security;
alter table class_scenario_assignments enable row level security;

-- Mitglieder einer Klasse dürfen die Klasse sehen
create policy "members can view their class"
  on classes for select
  using (
    exists (
      select 1 from class_memberships cm
      where cm.class_id = classes.id and cm.user_id = auth.uid()
    )
  );

-- Nutzer sehen ihre eigenen Mitgliedschaften
create policy "users view own memberships"
  on class_memberships for select
  using (auth.uid() = user_id);

-- Lehrkräfte verwalten Mitgliedschaften ihrer eigenen Klasse
create policy "teachers manage memberships of own class"
  on class_memberships for all
  using (
    exists (
      select 1 from class_memberships cm
      where cm.class_id = class_memberships.class_id
        and cm.user_id = auth.uid()
        and cm.role in ('teacher', 'school_admin')
    )
  );

-- Klassenmitglieder sehen, welche Szenarien freigeschaltet sind
create policy "members view scenario assignments"
  on class_scenario_assignments for select
  using (
    exists (
      select 1 from class_memberships cm
      where cm.class_id = class_scenario_assignments.class_id
        and cm.user_id = auth.uid()
    )
  );

-- ---------- HELPER VIEW ----------
-- Erleichtert Feed-Abfragen: "live" Content, dessen Szenario für die
-- Klasse des Nutzers freigeschaltet ist.

create view visible_content_for_user as
select ci.*
from content_items ci
join class_scenario_assignments csa on csa.scenario_id = ci.scenario_id
join class_memberships cm on cm.class_id = csa.class_id
where ci.status = 'live'
  and cm.user_id = auth.uid();
