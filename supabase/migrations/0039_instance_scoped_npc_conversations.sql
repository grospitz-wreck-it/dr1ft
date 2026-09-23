-- ============================================================
-- DR1FT — Instance-scoped NPC conversations
-- ============================================================

-- Conversation state is runtime state and must never be shared between
-- class instances. Existing rows remain valid for migration/backfill; new
-- runtime access is protected by the active class-instance membership.

alter table public.user_npc_conversations
  add column if not exists class_instance_id uuid references public.class_instances(id) on delete cascade;

create index if not exists idx_user_npc_conversations_instance
  on public.user_npc_conversations(user_id, creator_id, class_instance_id);

-- Remove the old global conversation uniqueness so the same learner can
-- have independent NPC state in different class instances.
drop constraint if exists user_npc_conversations_user_id_creator_id_key;

create unique index if not exists idx_user_npc_conversations_instance_unique
  on public.user_npc_conversations(user_id, creator_id, class_instance_id);

alter table public.user_npc_conversations enable row level security;

drop policy if exists "users manage own npc conversations" on public.user_npc_conversations;
drop policy if exists "members manage own instance npc conversations" on public.user_npc_conversations;

create policy "members manage own instance npc conversations"
  on public.user_npc_conversations for all
  using (
    user_id = auth.uid()
    and class_instance_id is not null
    and exists (
      select 1
      from public.class_instance_memberships cim
      where cim.class_instance_id = user_npc_conversations.class_instance_id
        and cim.user_id = auth.uid()
        and cim.left_at is null
    )
  )
  with check (
    user_id = auth.uid()
    and class_instance_id is not null
    and exists (
      select 1
      from public.class_instance_memberships cim
      where cim.class_instance_id = user_npc_conversations.class_instance_id
        and cim.user_id = auth.uid()
        and cim.left_at is null
    )
  );
