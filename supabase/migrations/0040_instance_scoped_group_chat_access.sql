-- ============================================================
-- DR1FT — Instance-scoped group chat access
--
-- Group-chat definitions remain global/scenario content.
-- A student may only read a group chat (and its live messages)
-- when its scenario is assigned to the student's active class instance.
-- ============================================================

-- Replace the original "any authenticated user" group-chat policy.
drop policy if exists "authenticated read group_chats" on public.group_chats;

create policy "members read assigned group_chats"
on public.group_chats
for select
using (
  exists (
    select 1
    from public.class_instance_scenario_assignments cisa
    where cisa.scenario_id = group_chats.scenario_id
      and public.is_member_of_class_instance(cisa.class_instance_id)
  )
);

-- The existing staff policy remains in place for editorial management.

-- Live content is globally reusable only when it is ambient (no scenario),
-- or when its scenario is assigned to the current user's class instance.
-- Group-chat messages are therefore covered by the same scenario boundary.
drop policy if exists "public read live content" on public.content_items;

create policy "members read live scoped content"
on public.content_items
for select
using (
  status = 'live'
  and (
    scenario_id is null
    or exists (
      select 1
      from public.class_instance_scenario_assignments cisa
      where cisa.scenario_id = content_items.scenario_id
        and public.is_member_of_class_instance(cisa.class_instance_id)
    )
  )
);

create index if not exists idx_group_chats_scenario
  on public.group_chats(scenario_id);
