-- DR1FT — instance-scoped learning / narrative runtime

alter table public.user_competency_progress
  drop constraint if exists user_competency_progress_user_id_competency_id_key;
create unique index if not exists idx_user_competency_progress_instance_unique
  on public.user_competency_progress(user_id, competency_id, class_instance_id);

drop policy if exists "users manage own competency progress" on public.user_competency_progress;
drop policy if exists "members manage own scoped competency progress" on public.user_competency_progress;
drop policy if exists "members view instance competency progress" on public.user_competency_progress;
create policy "members manage own scoped competency progress"
on public.user_competency_progress for all
using (user_id = auth.uid() and class_instance_id is not null and public.is_member_of_class_instance(class_instance_id))
with check (user_id = auth.uid() and class_instance_id is not null and public.is_member_of_class_instance(class_instance_id));
create policy "members view instance competency progress"
on public.user_competency_progress for select
using (class_instance_id is not null and public.is_member_of_class_instance(class_instance_id));

alter table public.user_story_arc_progress add column if not exists class_instance_id uuid references public.class_instances(id) on delete cascade;
alter table public.user_unlocked_missions add column if not exists class_instance_id uuid references public.class_instances(id) on delete cascade;
create index if not exists idx_user_story_arc_progress_instance on public.user_story_arc_progress(class_instance_id, user_id);
create index if not exists idx_user_unlocked_missions_instance on public.user_unlocked_missions(class_instance_id, user_id);
alter table public.user_story_arc_progress drop constraint if exists user_story_arc_progress_user_id_arc_id_key;
alter table public.user_unlocked_missions drop constraint if exists user_unlocked_missions_user_id_mission_id_key;
create unique index if not exists idx_user_story_arc_progress_instance_unique on public.user_story_arc_progress(user_id, arc_id, class_instance_id);
create unique index if not exists idx_user_unlocked_missions_instance_unique on public.user_unlocked_missions(user_id, mission_id, class_instance_id);

drop policy if exists "users manage own arc progress" on public.user_story_arc_progress;
drop policy if exists "users manage own unlocked missions" on public.user_unlocked_missions;
drop policy if exists "members manage own scoped arc progress" on public.user_story_arc_progress;
drop policy if exists "members view instance arc progress" on public.user_story_arc_progress;
drop policy if exists "members manage own scoped unlocked missions" on public.user_unlocked_missions;
drop policy if exists "members view instance unlocked missions" on public.user_unlocked_missions;
create policy "members manage own scoped arc progress"
on public.user_story_arc_progress for all
using (user_id = auth.uid() and class_instance_id is not null and public.is_member_of_class_instance(class_instance_id))
with check (user_id = auth.uid() and class_instance_id is not null and public.is_member_of_class_instance(class_instance_id));
create policy "members view instance arc progress"
on public.user_story_arc_progress for select
using (class_instance_id is not null and public.is_member_of_class_instance(class_instance_id));
create policy "members manage own scoped unlocked missions"
on public.user_unlocked_missions for all
using (user_id = auth.uid() and class_instance_id is not null and public.is_member_of_class_instance(class_instance_id))
with check (user_id = auth.uid() and class_instance_id is not null and public.is_member_of_class_instance(class_instance_id));
create policy "members view instance unlocked missions"
on public.user_unlocked_missions for select
using (class_instance_id is not null and public.is_member_of_class_instance(class_instance_id));

alter table public.domain_events add column if not exists class_instance_id uuid references public.class_instances(id) on delete cascade;
update public.domain_events set class_instance_id = nullif(payload->>'classInstanceId', '')::uuid where class_instance_id is null and payload ? 'classInstanceId';
create index if not exists idx_domain_events_user_instance on public.domain_events(user_id, class_instance_id, created_at desc);
drop policy if exists "users read own domain events" on public.domain_events;
drop policy if exists "members read instance domain events" on public.domain_events;
create policy "members read instance domain events"
on public.domain_events for select
using (user_id = auth.uid() and class_instance_id is not null and public.is_member_of_class_instance(class_instance_id));

-- ---------- INSTANCE-AWARE COMPETENCY TRIGGER ----------
create or replace function public.update_competency_progress_after_mission()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_mission missions%rowtype; v_competency_id uuid; v_current_evidence jsonb; v_new_evidence jsonb; v_new_count int; v_new_level smallint;
begin
  if new.status <> 'completed' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'completed' then return new; end if;
  if new.class_instance_id is null then return new; end if;
  select * into v_mission from public.missions where id = new.mission_id;
  if v_mission.id is null then return new; end if;
  foreach v_competency_id in array v_mission.target_competencies loop
    select evidence into v_current_evidence from public.user_competency_progress
    where user_id = new.user_id and competency_id = v_competency_id and class_instance_id = new.class_instance_id;
    v_new_evidence := coalesce(v_current_evidence, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('missionId', v_mission.id, 'missionSlug', v_mission.slug, 'completedAt', now()));
    v_new_count := jsonb_array_length(v_new_evidence);
    v_new_level := public.compute_competency_level(v_new_count);
    insert into public.user_competency_progress(user_id, competency_id, class_instance_id, evidence, level, updated_at)
    values (new.user_id, v_competency_id, new.class_instance_id, v_new_evidence, v_new_level, now())
    on conflict (user_id, competency_id, class_instance_id) do update
      set evidence = v_new_evidence, level = v_new_level, updated_at = now();
    insert into public.domain_events(event_type, user_id, class_instance_id, payload)
    values ('CompetencyUpdated', new.user_id, new.class_instance_id,
      jsonb_build_object('competencyId', v_competency_id, 'level', v_new_level, 'classInstanceId', new.class_instance_id));
  end loop;
  return new;
end;
$$;

-- ---------- INSTANCE-AWARE NARRATIVE FUNCTIONS ----------
-- Do not DROP the old overloads: the original trigger/function dependency graph
-- may reference them. Instead, make legacy overloads fail closed.
create or replace function public.unlock_mission_for_user(p_user_id uuid, p_mission_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  raise exception 'Instance-Kontext erforderlich: unlock_mission_for_user(user_id, mission_id, class_instance_id) verwenden';
end;
$$;

create or replace function public.start_arc_for_user(p_user_id uuid, p_arc_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  raise exception 'Instance-Kontext erforderlich: start_arc_for_user(user_id, arc_id, class_instance_id) verwenden';
end;
$$;

create or replace function public.unlock_mission_for_user(p_user_id uuid, p_mission_id uuid, p_class_instance_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_member_of_class_instance(p_class_instance_id, p_user_id) then raise exception 'User ist kein Mitglied der Klasseninstanz'; end if;
  insert into public.user_unlocked_missions(user_id, mission_id, class_instance_id)
  values (p_user_id, p_mission_id, p_class_instance_id)
  on conflict (user_id, mission_id, class_instance_id) do nothing;
  insert into public.domain_events(event_type, user_id, class_instance_id, payload)
  values ('MissionStarted', p_user_id, p_class_instance_id, jsonb_build_object('missionId', p_mission_id, 'classInstanceId', p_class_instance_id));
end;
$$;

create or replace function public.start_arc_for_user(p_user_id uuid, p_arc_id uuid, p_class_instance_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare v_first_mission_id uuid;
begin
  if not public.is_member_of_class_instance(p_class_instance_id, p_user_id) then raise exception 'User ist kein Mitglied der Klasseninstanz'; end if;
  insert into public.user_story_arc_progress(user_id, arc_id, class_instance_id, current_step_index, status)
  values (p_user_id, p_arc_id, p_class_instance_id, 0, 'in_progress')
  on conflict (user_id, arc_id, class_instance_id) do nothing;
  select mission_id into v_first_mission_id from public.story_arc_steps where arc_id = p_arc_id and order_index = 0;
  if v_first_mission_id is not null then perform public.unlock_mission_for_user(p_user_id, v_first_mission_id, p_class_instance_id); end if;
end;
$$;

create or replace function public.advance_story_arc_after_mission()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_step record; v_next_mission_id uuid;
begin
  if new.status <> 'completed' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'completed' then return new; end if;
  if new.class_instance_id is null then return new; end if;
  for v_step in
    select sas.arc_id, sas.order_index from public.story_arc_steps sas
    join public.user_story_arc_progress uap on uap.arc_id = sas.arc_id and uap.user_id = new.user_id and uap.class_instance_id = new.class_instance_id
    where sas.mission_id = new.mission_id and uap.current_step_index = sas.order_index and uap.status = 'in_progress'
  loop
    select mission_id into v_next_mission_id from public.story_arc_steps where arc_id = v_step.arc_id and order_index = v_step.order_index + 1;
    if v_next_mission_id is not null then
      perform public.unlock_mission_for_user(new.user_id, v_next_mission_id, new.class_instance_id);
      update public.user_story_arc_progress set current_step_index = v_step.order_index + 1, updated_at = now()
      where user_id = new.user_id and arc_id = v_step.arc_id and class_instance_id = new.class_instance_id;
    else
      update public.user_story_arc_progress set status = 'completed', updated_at = now()
      where user_id = new.user_id and arc_id = v_step.arc_id and class_instance_id = new.class_instance_id;
    end if;
  end loop;
  return new;
end;
$$;

create or replace function public.bootstrap_arcs_for_class_scenario()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_arc record; v_student record;
begin
  for v_arc in select id from public.story_arcs where scenario_id = new.scenario_id and status = 'live' loop
    for v_student in select user_id from public.class_instance_memberships where class_instance_id = new.class_instance_id and role = 'student' and left_at is null loop
      perform public.start_arc_for_user(v_student.user_id, v_arc.id, new.class_instance_id);
    end loop;
  end loop;
  return new;
end;
$$;

create or replace function public.bootstrap_arcs_for_new_member()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_arc record;
begin
  if new.role <> 'student' or new.left_at is not null then return new; end if;
  for v_arc in
    select sa.id from public.story_arcs sa
    join public.class_instance_scenario_assignments csa on csa.scenario_id = sa.scenario_id
    where csa.class_instance_id = new.class_instance_id and sa.status = 'live'
  loop
    perform public.start_arc_for_user(new.user_id, v_arc.id, new.class_instance_id);
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_bootstrap_arcs_for_class_instance_scenario on public.class_instance_scenario_assignments;
create trigger trg_bootstrap_arcs_for_class_instance_scenario after insert on public.class_instance_scenario_assignments for each row execute function public.bootstrap_arcs_for_class_scenario();
drop trigger if exists trg_bootstrap_arcs_for_class_instance_member on public.class_instance_memberships;
create trigger trg_bootstrap_arcs_for_class_instance_member after insert on public.class_instance_memberships for each row execute function public.bootstrap_arcs_for_new_member();

create or replace function public.evaluate_missions_after_interaction()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_scenario_id uuid; v_mission record; v_required_count int; v_actual_count int; v_already_done boolean;
begin
  if new.class_instance_id is null then return new; end if;
  select scenario_id into v_scenario_id from public.content_items where id = new.content_item_id;
  if v_scenario_id is null then return new; end if;
  for v_mission in select * from public.missions where scenario_id = v_scenario_id and status = 'live' loop
    if exists (select 1 from public.story_arc_steps where mission_id = v_mission.id)
       and not exists (select 1 from public.user_unlocked_missions where user_id = new.user_id and mission_id = v_mission.id and class_instance_id = new.class_instance_id) then continue; end if;
    select exists (select 1 from public.user_mission_progress where user_id = new.user_id and mission_id = v_mission.id and class_instance_id = new.class_instance_id and status = 'completed') into v_already_done;
    if v_already_done then continue; end if;
    v_required_count := coalesce((v_mission.trigger_condition->>'count')::int, 1);
    v_actual_count := public.count_matching_interactions(new.user_id, v_mission.id, new.class_instance_id);
    if v_actual_count >= v_required_count then
      insert into public.user_mission_progress(user_id, mission_id, class_instance_id, status, completed_at)
      values (new.user_id, v_mission.id, new.class_instance_id, 'completed', now())
      on conflict (user_id, mission_id, class_instance_id) do update set status = 'completed', completed_at = now();
      insert into public.domain_events(event_type, user_id, class_instance_id, payload)
      values ('MissionCompleted', new.user_id, new.class_instance_id,
        jsonb_build_object('missionId', v_mission.id, 'scenarioId', v_scenario_id, 'classInstanceId', new.class_instance_id, 'reflectionContentId', v_mission.reflection_content_id));
    end if;
  end loop;
  return new;
end;
$$;

grant execute on function public.unlock_mission_for_user(uuid, uuid, uuid) to authenticated;
grant execute on function public.start_arc_for_user(uuid, uuid, uuid) to authenticated;
