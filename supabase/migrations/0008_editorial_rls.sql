-- ============================================================
-- DR1FT — Redaktions-Rollen & RLS-Nachrüstung
--
-- Bisher hatten scenarios, creators, missions, story_arcs,
-- story_arc_steps, competencies KEIN RLS aktiviert — ohne RLS gelten
-- Postgres-Tabellenrechte, nicht Zeilenregeln. Das wird hier
-- geschlossen. Außerdem fehlte bei class_scenario_assignments eine
-- Schreib-Policy (nur SELECT existierte) — dadurch würde
-- toggleScenarioAssignment() aus dem Lehrer-Dashboard an RLS
-- scheitern. Auch das wird hier korrigiert.
-- ============================================================

create type staff_role as enum ('editor', 'reviewer', 'platform_admin');

-- Redaktions-/Freigabe-Team, unabhängig vom Schul-/Klassen-Rollensystem
create table platform_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role staff_role not null default 'editor',
  created_at timestamptz not null default now()
);

alter table platform_staff enable row level security;

create policy "staff read own staff record"
  on platform_staff for select
  using (auth.uid() = user_id);

create or replace function is_platform_staff()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from platform_staff where user_id = auth.uid()
  );
$$;

-- ---------- RLS nachrüsten ----------

alter table scenarios enable row level security;
alter table creators enable row level security;
alter table missions enable row level security;
alter table story_arcs enable row level security;
alter table story_arc_steps enable row level security;
alter table competencies enable row level security;

-- Lesen: alle eingeloggten Nutzer (App braucht das für Feed/Missions/Kompetenzen)
create policy "authenticated read scenarios" on scenarios for select using (auth.role() = 'authenticated');
create policy "authenticated read creators" on creators for select using (auth.role() = 'authenticated');
create policy "authenticated read missions" on missions for select using (auth.role() = 'authenticated');
create policy "authenticated read story_arcs" on story_arcs for select using (auth.role() = 'authenticated');
create policy "authenticated read story_arc_steps" on story_arc_steps for select using (auth.role() = 'authenticated');
create policy "authenticated read competencies" on competencies for select using (auth.role() = 'authenticated');

-- Schreiben: nur Redaktion
create policy "staff manage scenarios" on scenarios for all using (is_platform_staff());
create policy "staff manage creators" on creators for all using (is_platform_staff());
create policy "staff manage missions" on missions for all using (is_platform_staff());
create policy "staff manage story_arcs" on story_arcs for all using (is_platform_staff());
create policy "staff manage story_arc_steps" on story_arc_steps for all using (is_platform_staff());
create policy "staff manage competencies" on competencies for all using (is_platform_staff());

-- content_items: Redaktion sieht/verwaltet ALLE Status (nicht nur 'live'
-- wie die bestehende public-Policy aus 0001), Schreiben nur Redaktion.
create policy "staff read all content_items" on content_items for select using (is_platform_staff());
create policy "staff manage content_items" on content_items for all using (is_platform_staff());

-- Fehlende Schreib-Policy für Lehrkräfte auf class_scenario_assignments
-- (bisher nur SELECT in 0002 — toggleScenarioAssignment() brauchte das)
create policy "teachers manage scenario assignments of own class"
  on class_scenario_assignments for all
  using (is_teacher_of_class(class_id));
