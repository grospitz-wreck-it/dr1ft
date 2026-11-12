-- DR1FT Learning Results foundation.
-- This migration introduces explicit mission/content membership and append-only
-- learning evidence. It deliberately does not change the legacy mission trigger
-- evaluator or expose new reporting endpoints yet.

create table if not exists public.mission_content_items (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  required boolean not null default true,
  weight numeric(6,3) not null default 1 check (weight > 0),
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  unique (mission_id, content_item_id)
);

create index if not exists mission_content_items_mission_order_idx
  on public.mission_content_items (mission_id, order_index, created_at);

create index if not exists mission_content_items_content_idx
  on public.mission_content_items (content_item_id);

alter table public.mission_content_items enable row level security;

-- No client policies yet: editorial writes and reporting reads must be added
-- with the exact authorization model when those integrations are implemented.
-- RLS enabled with no policies is intentionally default-deny.

create table if not exists public.learning_result_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_instance_id uuid not null references public.class_instances(id) on delete cascade,
  scenario_id uuid references public.scenarios(id) on delete set null,
  mission_id uuid references public.missions(id) on delete set null,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  interaction_type text not null,
  event_kind text not null check (event_kind in (
    'interaction_performed',
    'discovery_confirmed',
    'requirement_satisfied',
    'requirement_not_satisfied',
    'not_assessable'
  )),
  evidence_key text,
  outcome text not null check (outcome in (
    'success',
    'partial',
    'not_yet',
    'not_assessable'
  )),
  scoring_version smallint not null default 1 check (scoring_version > 0),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists learning_result_events_student_context_idx
  on public.learning_result_events (user_id, class_instance_id, occurred_at desc);

create index if not exists learning_result_events_content_idx
  on public.learning_result_events (content_item_id, user_id, occurred_at desc);

create index if not exists learning_result_events_evidence_idx
  on public.learning_result_events (user_id, class_instance_id, evidence_key)
  where evidence_key is not null;

alter table public.learning_result_events enable row level security;

create policy "students read own learning result events"
  on public.learning_result_events for select
  using (auth.uid() = user_id);

create policy "students insert own learning result events"
  on public.learning_result_events for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.class_instance_memberships cim
      where cim.user_id = auth.uid()
        and cim.class_instance_id = learning_result_events.class_instance_id
        and cim.role = 'student'
        and cim.left_at is null
    )
  );

comment on table public.mission_content_items is
  'Explicit, ordered membership of content items in a mission; required entries participate in mission scoring.';

comment on table public.learning_result_events is
  'Append-only evidence for learning interactions and discoveries. Events are not themselves aggregated scores.';
