-- DR1FT Phase 1 — normalized Learning Design mappings
-- Run once in Supabase SQL Editor.
-- This file is intentionally separate from numbered migrations until the
-- remote migration history has been verified.

create table if not exists public.learning_objective_competencies (
  id uuid primary key default gen_random_uuid(),
  learning_objective_id uuid not null references public.learning_objectives(id) on delete cascade,
  competency_id uuid not null references public.competencies(id) on delete restrict,
  role text not null default 'primary',
  weight numeric(5,2) not null default 1,
  created_at timestamptz not null default now(),
  unique (learning_objective_id, competency_id)
);

create index if not exists idx_learning_objective_competencies_objective
  on public.learning_objective_competencies(learning_objective_id);
create index if not exists idx_learning_objective_competencies_competency
  on public.learning_objective_competencies(competency_id);

create table if not exists public.learning_step_objectives (
  id uuid primary key default gen_random_uuid(),
  learning_step_id uuid not null references public.learning_steps(id) on delete cascade,
  learning_objective_id uuid not null references public.learning_objectives(id) on delete cascade,
  role text not null default 'primary',
  weight numeric(5,2) not null default 1,
  created_at timestamptz not null default now(),
  unique (learning_step_id, learning_objective_id)
);

create index if not exists idx_learning_step_objectives_step
  on public.learning_step_objectives(learning_step_id);
create index if not exists idx_learning_step_objectives_objective
  on public.learning_step_objectives(learning_objective_id);

create table if not exists public.learning_step_competencies (
  id uuid primary key default gen_random_uuid(),
  learning_step_id uuid not null references public.learning_steps(id) on delete cascade,
  competency_id uuid not null references public.competencies(id) on delete restrict,
  role text not null default 'primary',
  weight numeric(5,2) not null default 1,
  created_at timestamptz not null default now(),
  unique (learning_step_id, competency_id)
);

create index if not exists idx_learning_step_competencies_step
  on public.learning_step_competencies(learning_step_id);
create index if not exists idx_learning_step_competencies_competency
  on public.learning_step_competencies(competency_id);

create table if not exists public.learning_step_missions (
  id uuid primary key default gen_random_uuid(),
  learning_step_id uuid not null references public.learning_steps(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  role text not null default 'primary',
  created_at timestamptz not null default now(),
  unique (learning_step_id, mission_id)
);

create index if not exists idx_learning_step_missions_step
  on public.learning_step_missions(learning_step_id);
create index if not exists idx_learning_step_missions_mission
  on public.learning_step_missions(mission_id);

create table if not exists public.learning_step_content (
  id uuid primary key default gen_random_uuid(),
  learning_step_id uuid not null references public.learning_steps(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  role text not null,
  order_index integer not null default 0,
  required boolean not null default true,
  created_at timestamptz not null default now(),
  unique (learning_step_id, content_item_id)
);

create index if not exists idx_learning_step_content_step_order
  on public.learning_step_content(learning_step_id, order_index);
create index if not exists idx_learning_step_content_content
  on public.learning_step_content(content_item_id);

-- Keep these mappings accessible only where the parent Learning Design/Step
-- is accessible. Existing parent RLS therefore remains the access boundary.
alter table public.learning_objective_competencies enable row level security;
alter table public.learning_step_objectives enable row level security;
alter table public.learning_step_competencies enable row level security;
alter table public.learning_step_missions enable row level security;
alter table public.learning_step_content enable row level security;

drop policy if exists "learning objective competency follows parent" on public.learning_objective_competencies;
create policy "learning objective competency follows parent"
on public.learning_objective_competencies for all
using (
  exists (
    select 1
    from public.learning_objectives lo
    where lo.id = learning_objective_competencies.learning_objective_id
  )
)
with check (
  exists (
    select 1
    from public.learning_objectives lo
    where lo.id = learning_objective_competencies.learning_objective_id
  )
);

drop policy if exists "learning step objective follows parent" on public.learning_step_objectives;
create policy "learning step objective follows parent"
on public.learning_step_objectives for all
using (
  exists (
    select 1
    from public.learning_steps ls
    where ls.id = learning_step_objectives.learning_step_id
  )
)
with check (
  exists (
    select 1
    from public.learning_steps ls
    where ls.id = learning_step_objectives.learning_step_id
  )
);

drop policy if exists "learning step competency follows parent" on public.learning_step_competencies;
create policy "learning step competency follows parent"
on public.learning_step_competencies for all
using (
  exists (
    select 1
    from public.learning_steps ls
    where ls.id = learning_step_competencies.learning_step_id
  )
)
with check (
  exists (
    select 1
    from public.learning_steps ls
    where ls.id = learning_step_competencies.learning_step_id
  )
);

drop policy if exists "learning step mission follows parent" on public.learning_step_missions;
create policy "learning step mission follows parent"
on public.learning_step_missions for all
using (
  exists (
    select 1
    from public.learning_steps ls
    where ls.id = learning_step_missions.learning_step_id
  )
)
with check (
  exists (
    select 1
    from public.learning_steps ls
    where ls.id = learning_step_missions.learning_step_id
  )
);

drop policy if exists "learning step content follows parent" on public.learning_step_content;
create policy "learning step content follows parent"
on public.learning_step_content for all
using (
  exists (
    select 1
    from public.learning_steps ls
    where ls.id = learning_step_content.learning_step_id
  )
)
with check (
  exists (
    select 1
    from public.learning_steps ls
    where ls.id = learning_step_content.learning_step_id
  )
);
