-- Forward correction: ensure age-range suffixes are normalized before exact title confirmation.
-- The function body otherwise preserves the currently installed implementation.
-- SECURITY DEFINER is required because learner progress/event tables intentionally
-- do not expose direct DELETE policies to editorial users.
create or replace function public.delete_scenario_family(
  p_scenario_id uuid,
  p_confirmation_title text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_scenario public.scenarios%rowtype;
  v_group text;
  v_scenario_ids uuid[];
begin
  if auth.uid() is null or not public.is_platform_staff() then
    raise exception 'Keine Berechtigung, Szenarien endgültig zu löschen.'
      using errcode = '42501';
  end if;

  select * into v_scenario
  from public.scenarios
  where id = p_scenario_id;

  if not found then
    raise exception 'Szenario nicht gefunden.';
  end if;

  if p_confirmation_title is distinct from regexp_replace(
    v_scenario.title,
    E'\\s*[–-]\\s*(9–11|12–13|14–15|16–17|18\\+).*$',
    '',
    'i'
  ) then
    raise exception 'Der eingegebene Titel stimmt nicht exakt überein.';
  end if;

  v_group := coalesce(v_scenario.scenario_group, v_scenario.slug, v_scenario.id::text);

  select coalesce(array_agg(id), array[]::uuid[])
    into v_scenario_ids
  from public.scenarios
  where coalesce(scenario_group, slug, id::text) = v_group;

  -- Remove conversations first: they contain NO ACTION references to content items.
  -- Include scenario-owned replies/comments whose scenario_id is NULL but whose
  -- parent_id points into the scenario's content tree.
  with recursive family_content(id) as (
    select id from public.content_items where scenario_id = any(v_scenario_ids)
    union
    select child.id
    from public.content_items child
    join family_content parent on child.parent_id = parent.id
  )
  delete from public.user_npc_conversations
  where creator_id in (
    select id from public.creators where scenario_id = any(v_scenario_ids)
  )
  or current_content_item_id in (select id from family_content)
  or pending_resume_content_id in (select id from family_content);

  -- Remove interventions that were generated from assessments owned by this family.
  delete from public.learner_interventions
  where source_assessment_id in (
    select id
    from public.competency_assessments
    where scenario_id = any(v_scenario_ids)
       or learning_design_id in (
         select id from public.learning_designs where scenario_id = any(v_scenario_ids)
       )
  );

  -- These event tables use SET NULL on ordinary scenario deletion. For an explicit
  -- permanent family deletion, remove their scenario-owned records as well.
  delete from public.competency_assessments
  where scenario_id = any(v_scenario_ids)
     or learning_design_id in (
       select id from public.learning_designs where scenario_id = any(v_scenario_ids)
     );

  delete from public.learning_evidence_events
  where scenario_id = any(v_scenario_ids)
     or learning_design_id in (
       select id from public.learning_designs where scenario_id = any(v_scenario_ids)
     )
     or learning_step_id in (
       select ls.id
       from public.learning_steps ls
       join public.learning_designs ld on ld.id = ls.learning_design_id
       where ld.scenario_id = any(v_scenario_ids)
     )
     or learning_step_id in (
       select ls.id
       from public.learning_steps ls
       join public.story_arcs sa on sa.id = ls.story_arc_id
       where sa.scenario_id = any(v_scenario_ids)
     );

  with recursive family_content(id) as (
    select id from public.content_items where scenario_id = any(v_scenario_ids)
    union
    select child.id
    from public.content_items child
    join family_content parent on child.parent_id = parent.id
  )
  delete from public.learning_result_events
  where scenario_id = any(v_scenario_ids)
     or mission_id in (
       select id from public.missions where scenario_id = any(v_scenario_ids)
     )
     or content_item_id in (select id from family_content);

  delete from public.student_activity_time_events
  where scenario_id = any(v_scenario_ids);

  -- Missions must be deleted before their reflection content (NO ACTION FK).
  delete from public.missions where scenario_id = any(v_scenario_ids);
  delete from public.content_items where scenario_id = any(v_scenario_ids);

  -- Scenario-specific NPCs are owned by the family; global/system creators are not.
  delete from public.creators where scenario_id = any(v_scenario_ids);

  -- This generic teacher assignment table stores scenario IDs without a
  -- foreign key, so remove its scenario-type rows explicitly.
  delete from public.teacher_class_module_assignments
  where module_type = 'scenario' and module_id = any(v_scenario_ids);

  -- Remaining owned records (arcs, designs, NPC dialogs, chats, assignments,
  -- message triggers, learner responses and their cascaded children) are removed
  -- by the scenario foreign keys.
  delete from public.scenarios where id = any(v_scenario_ids);
end;
$$;

revoke all on function public.delete_scenario_family(uuid, text) from public, anon;
grant execute on function public.delete_scenario_family(uuid, text) to authenticated;
