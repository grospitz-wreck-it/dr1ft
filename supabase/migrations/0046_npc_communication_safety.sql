-- ============================================================
-- DR1FT — NPC communication safety / moderation audit
-- ============================================================

create table if not exists public.npc_safety_events (
  id uuid primary key default gen_random_uuid(),
  class_instance_id uuid not null references public.class_instances(id) on delete cascade,
  npc_id uuid references public.npc_profiles(id) on delete set null,
  source_type text not null,
  source_id uuid,
  decision text not null check (decision in ('allowed','blocked','rewritten')),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_npc_safety_events_instance_recent
  on public.npc_safety_events (class_instance_id, created_at desc);

alter table public.npc_safety_events enable row level security;

drop policy if exists "npc safety members readable" on public.npc_safety_events;
create policy "npc safety members readable" on public.npc_safety_events for select
using (exists (
  select 1 from public.class_instance_memberships m
  where m.class_instance_id = npc_safety_events.class_instance_id
    and m.user_id = auth.uid()
    and m.left_at is null
));
