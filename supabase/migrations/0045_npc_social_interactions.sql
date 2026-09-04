-- ============================================================
-- DR1FT — NPC social interactions
-- ============================================================

create table if not exists public.npc_social_interactions (
  id uuid primary key default gen_random_uuid(),
  npc_instance_id uuid not null references public.npc_instance_profiles(id) on delete cascade,
  class_instance_id uuid not null references public.class_instances(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  interaction_type text not null check (interaction_type in ('like', 'comment')),
  body text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_npc_social_interactions_content
  on public.npc_social_interactions (class_instance_id, content_item_id, created_at desc);

create unique index if not exists idx_npc_one_reaction_per_content
  on public.npc_social_interactions (npc_instance_id, content_item_id)
  where interaction_type = 'like';

alter table public.npc_social_interactions enable row level security;

drop policy if exists "npc social interactions instance members readable" on public.npc_social_interactions;
create policy "npc social interactions instance members readable"
  on public.npc_social_interactions for select
  using (exists (
    select 1 from public.class_instance_memberships m
    where m.class_instance_id = npc_social_interactions.class_instance_id
      and m.user_id = auth.uid()
      and m.left_at is null
  ));
