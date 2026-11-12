-- ============================================================
-- DR1FT — Instance-scoped NPC Generator / Virtual Soul Runtime
-- ============================================================

alter table public.content_items
  add column if not exists class_instance_id uuid references public.class_instances(id) on delete cascade;

create index if not exists idx_content_items_class_instance_live
  on public.content_items (class_instance_id, status, created_at desc);

create table if not exists public.npc_profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  handle text not null,
  age integer,
  keywords text[] not null default '{}',
  context text not null default '',
  persona jsonb not null default '{}'::jsonb,
  voice jsonb not null default '{}'::jsonb,
  interests text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_npc_profiles_handle on public.npc_profiles(handle);

create table if not exists public.npc_instance_profiles (
  id uuid primary key default gen_random_uuid(),
  npc_id uuid not null references public.npc_profiles(id) on delete cascade,
  class_instance_id uuid not null references public.class_instances(id) on delete cascade,
  current_state jsonb not null default '{}'::jsonb,
  relationship_state jsonb not null default '{}'::jsonb,
  activity_state jsonb not null default '{}'::jsonb,
  last_generation_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (npc_id, class_instance_id)
);

create index if not exists idx_npc_instance_profiles_instance
  on public.npc_instance_profiles (class_instance_id, updated_at desc);

create table if not exists public.npc_memory (
  id uuid primary key default gen_random_uuid(),
  npc_instance_id uuid not null references public.npc_instance_profiles(id) on delete cascade,
  memory_type text not null,
  subject_id uuid,
  content text not null,
  salience numeric not null default 0.5,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_npc_memory_instance_recent
  on public.npc_memory (npc_instance_id, created_at desc);

create table if not exists public.npc_generation_runs (
  id uuid primary key default gen_random_uuid(),
  class_instance_id uuid not null references public.class_instances(id) on delete cascade,
  npc_id uuid references public.npc_profiles(id) on delete set null,
  generation_type text not null,
  keywords text[] not null default '{}',
  context text not null default '',
  provider text not null default 'gemini',
  model text,
  status text not null default 'draft',
  output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_npc_generation_runs_instance
  on public.npc_generation_runs (class_instance_id, created_at desc);

alter table public.npc_profiles enable row level security;
alter table public.npc_instance_profiles enable row level security;
alter table public.npc_memory enable row level security;
alter table public.npc_generation_runs enable row level security;

-- NPC definitions are editorial data. Instance runtime is isolated by membership.
drop policy if exists "npc profiles readable" on public.npc_profiles;
create policy "npc profiles readable" on public.npc_profiles for select using (true);

drop policy if exists "npc instance members readable" on public.npc_instance_profiles;
create policy "npc instance members readable" on public.npc_instance_profiles for select
using (exists (
  select 1 from public.class_instance_memberships m
  where m.class_instance_id = npc_instance_profiles.class_instance_id
    and m.user_id = auth.uid()
    and m.left_at is null
));

drop policy if exists "npc memory instance members readable" on public.npc_memory;
create policy "npc memory instance members readable" on public.npc_memory for select
using (exists (
  select 1 from public.npc_instance_profiles p
  join public.class_instance_memberships m on m.class_instance_id = p.class_instance_id
  where p.id = npc_memory.npc_instance_id
    and m.user_id = auth.uid()
    and m.left_at is null
));

drop policy if exists "npc generation members readable" on public.npc_generation_runs;
create policy "npc generation members readable" on public.npc_generation_runs for select
using (exists (
  select 1 from public.class_instance_memberships m
  where m.class_instance_id = npc_generation_runs.class_instance_id
    and m.user_id = auth.uid()
    and m.left_at is null
));

-- Only instance-owned NPC content is visible through the normal content query.
drop policy if exists "instance npc content member access" on public.content_items;
create policy "instance npc content member access" on public.content_items for select
using (
  class_instance_id is null
  or exists (
    select 1 from public.class_instance_memberships m
    where m.class_instance_id = content_items.class_instance_id
      and m.user_id = auth.uid()
      and m.left_at is null
  )
);
