-- DR1FT: reconcile the live class-instance runtime with the canonical
-- class-instance architecture.
--
-- This is a new forward-only migration. It intentionally does not modify
-- or rename any earlier migration, including the duplicate 20260930130000
-- files that exist in the repository.
--
-- Goals:
-- 1. one active scenario/module per class instance
-- 2. one NPC conversation state per user + creator + class instance
-- 3. teacher assignment RPC replaces the previous active scenario

-- ---------------------------------------------------------------------------
-- 1. Collapse duplicate active-module assignments before enforcing uniqueness.
-- ---------------------------------------------------------------------------
with ranked as (
  select
    id,
    row_number() over (
      partition by class_instance_id
      order by assigned_at desc nulls last, id desc
    ) as rn
  from public.class_instance_scenario_assignments
)
delete from public.class_instance_scenario_assignments a
using ranked r
where a.id = r.id
  and r.rn > 1;

create unique index if not exists uq_one_active_module_per_class_instance
  on public.class_instance_scenario_assignments(class_instance_id);

-- ---------------------------------------------------------------------------
-- 2. Collapse duplicate NPC conversation states within an instance.
--    NULL instance rows are retained as legacy data but are not part of the
--    new unique key semantics used by the instance-aware engine.
-- ---------------------------------------------------------------------------
with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, creator_id, class_instance_id
      order by updated_at desc nulls last, id desc
    ) as rn
  from public.user_npc_conversations
  where user_id is not null
    and creator_id is not null
    and class_instance_id is not null
)
delete from public.user_npc_conversations c
using ranked r
where c.id = r.id
  and r.rn > 1;

create unique index if not exists uq_user_npc_conversations_instance
  on public.user_npc_conversations(user_id, creator_id, class_instance_id);

-- ---------------------------------------------------------------------------
-- 3. Canonical teacher assignment RPC.
--    The live function historically returned void, so keep that signature to
--    avoid an unnecessary API break. The important semantic change is that
--    assigning a module replaces every other active assignment in the same
--    class instance.
-- ---------------------------------------------------------------------------
create or replace function public.upsert_class_instance_scenario_assignment(
  p_instance_id uuid,
  p_scenario_id uuid,
  p_pacing_mode text default 'compact'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_teacher_of_class_instance(p_instance_id) then
    raise exception 'Keine Berechtigung für diese Klasseninstanz';
  end if;

  if p_pacing_mode not in ('compact', 'as_designed') then
    raise exception 'Ungültiger Pacing-Modus';
  end if;

  delete from public.class_instance_scenario_assignments
  where class_instance_id = p_instance_id
    and scenario_id <> p_scenario_id;

  insert into public.class_instance_scenario_assignments (
    class_instance_id,
    scenario_id,
    assigned_by,
    pacing_mode
  )
  values (
    p_instance_id,
    p_scenario_id,
    auth.uid(),
    p_pacing_mode
  )
  on conflict (class_instance_id, scenario_id)
  do update set
    assigned_by = excluded.assigned_by,
    assigned_at = now(),
    pacing_mode = excluded.pacing_mode;
end;
$$;

grant execute on function public.upsert_class_instance_scenario_assignment(uuid, uuid, text)
  to authenticated;
