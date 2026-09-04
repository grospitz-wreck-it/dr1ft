-- ============================================================
-- DR1FT — Actor compatibility sync
--
-- npc_profiles is now a legacy compatibility surface. The canonical
-- identity is actor_profiles. Existing generator/editor code may still
-- write npc_profiles while the migration is being rolled through the app.
-- Keep those writes mirrored into actor_profiles so there is only one
-- conceptual Akteur identity.
-- ============================================================

create or replace function public.sync_legacy_npc_to_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.actor_profiles (
    id, display_name, handle, actor_type, age, keywords, context,
    persona, voice, interests, interest_keys, is_active,
    legacy_npc_id, created_at, updated_at
  ) values (
    new.id,
    new.display_name,
    new.handle,
    coalesce(nullif(new.actor_type, ''), 'person'),
    new.age,
    coalesce(new.keywords, '{}'),
    coalesce(new.context, ''),
    coalesce(new.persona, '{}'),
    coalesce(new.voice, '{}'),
    coalesce(new.interests, '{}'),
    coalesce(new.interest_keys, '{}'),
    coalesce(new.is_active, true),
    new.id,
    new.created_at,
    new.updated_at
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    handle = excluded.handle,
    actor_type = excluded.actor_type,
    age = excluded.age,
    keywords = excluded.keywords,
    context = excluded.context,
    persona = excluded.persona,
    voice = excluded.voice,
    interests = excluded.interests,
    interest_keys = excluded.interest_keys,
    is_active = excluded.is_active,
    legacy_npc_id = excluded.legacy_npc_id,
    updated_at = excluded.updated_at;
  return new;
end;
$$;

drop trigger if exists trg_sync_legacy_npc_to_actor on public.npc_profiles;
create trigger trg_sync_legacy_npc_to_actor
after insert or update on public.npc_profiles
for each row execute function public.sync_legacy_npc_to_actor();

-- Every legacy NPC runtime row now points to the canonical actor identity.
update public.npc_instance_profiles r
set actor_id = a.id
from public.actor_profiles a
where r.actor_id is null
  and a.legacy_npc_id = r.npc_id;

-- Generated NPC content uses the canonical actor reference from now on.
update public.content_items ci
set actor_id = a.id
from public.actor_profiles a
where ci.actor_id is null
  and ci.extra ->> 'npcId' is not null
  and a.id::text = ci.extra ->> 'npcId';

comment on table public.actor_profiles is 'Canonical DR1FT Akteur registry. An NPC is an actor with autonomous runtime behavior.';
comment on column public.npc_instance_profiles.actor_id is 'Canonical actor identity for this autonomous runtime; npc_id is legacy compatibility.';
comment on column public.content_items.actor_id is 'Canonical actor identity responsible for this content.';
