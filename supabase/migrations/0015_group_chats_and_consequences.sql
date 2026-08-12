-- ============================================================
-- DR1FT — Gruppenchats + nachhallende Konsequenzen
-- ============================================================

-- ---------- GRUPPENCHATS ----------
-- Mehrere NPCs posten in einer geteilten Konversation — Gruppendruck
-- und soziale Bewährung werden dadurch sichtbar, nicht nur 1:1-DMs.

create table group_chats (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid references scenarios(id) on delete cascade,
  title text not null,
  participant_creator_ids uuid[] not null default '{}',
  status content_status not null default 'draft',
  created_at timestamptz not null default now()
);

alter table content_items
  add column group_chat_id uuid references group_chats(id) on delete cascade,
  add column sequence_index int;

create index idx_content_items_group_chat on content_items(group_chat_id, sequence_index);

-- ---------- NACHHALLENDE KONSEQUENZEN ----------
-- Eine NPC-Konversation kann nach dem "Ende" (letzte Nachricht ohne
-- weitere replyOptions) verzögert weiterlaufen — die Folgenachricht
-- referenziert die frühere Entscheidung ("Was ist draus geworden?").
-- Speicherort dafür ist extra.consequence = {contentItemId, delayHours}
-- an der jeweiligen End-Nachricht (siehe npcEngine.ts).

alter table user_npc_conversations
  add column pending_resume_content_id uuid references content_items(id),
  add column pending_resume_at timestamptz;
