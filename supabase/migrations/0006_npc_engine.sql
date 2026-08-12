-- ============================================================
-- DR1FT — NPC Engine
--
-- Bewusste Design-Entscheidung: KEIN Live-Freitext-Chat mit einer KI,
-- die eine manipulative Persona spielt. Stattdessen ein verzweigtes
-- Dialogsystem aus vorautorierten, redaktionell geprüften
-- content_items (type='dm_message' oder 'comment'). Jede NPC-Nachricht
-- trägt in `extra.replyOptions` die möglichen Antworten des Spielers,
-- jede Option verweist per content_item-ID auf die nächste NPC-Nachricht.
--
-- Begründung: erfüllt "Human-in-the-Loop" aus 08_AI_FIRST_PHILOSOPHY
-- (kritischer Bildungsinhalt bleibt redaktionell geprüft) und vermeidet
-- unvorhersehbare Live-KI-Antworten gegenüber Minderjährigen.
-- ============================================================

-- Merkt sich pro Nutzer und NPC, an welcher Stelle des Dialogbaums
-- man sich gerade befindet (zum Fortsetzen bei erneutem Öffnen).
create table user_npc_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references user_profiles(id) on delete cascade,
  creator_id uuid references creators(id) on delete cascade,
  current_content_item_id uuid references content_items(id),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, creator_id)
);

alter table user_npc_conversations enable row level security;

create policy "users manage own npc conversations"
  on user_npc_conversations for all
  using (auth.uid() = user_id);

-- DM-Interaktionen sollen ebenfalls als Mission-Trigger zählen können
-- (z.B. "hat 2x einer Radikalisierungs-Anwerbung widersprochen").
-- Erweiterung des bestehenden Mappings aus 0004_mission_engine.sql:
create or replace function mission_event_to_interaction_type(p_event text)
returns text
language sql
immutable
as $$
  select case p_event
    when 'PostViewed' then 'view'
    when 'CommentCreated' then 'comment'
    when 'NpcReplySelected' then 'comment'  -- DM-Antworten zählen wie Kommentare
    else null
  end;
$$;
