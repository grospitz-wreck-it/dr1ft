-- Fix: legacy class_memberships and class_instance_memberships
-- must use separate arc bootstrap trigger functions.

-- Legacy class_memberships trigger:
-- uses the legacy class/scenario assignment model.
create or replace function public.bootstrap_arcs_for_legacy_class_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_arc record;
begin
  if new.role <> 'student' then
    return new;
  end if;

  for v_arc in
    select sa.id
    from public.story_arcs sa
    join public.class_scenario_assignments csa
      on csa.scenario_id = sa.scenario_id
    where csa.class_id = new.class_id
      and sa.status = 'live'
  loop
    perform public.start_arc_for_user(
  new.user_id,
  v_arc.id,
  new.class_id
);
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_bootstrap_arcs_for_new_member
  on public.class_memberships;

create trigger trg_bootstrap_arcs_for_new_member
  after insert on public.class_memberships
  for each row
  execute function public.bootstrap_arcs_for_legacy_class_member();


-- Class-instance memberships use the instance-aware runtime.
create or replace function public.bootstrap_arcs_for_new_class_instance_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_arc record;
begin
  if new.role <> 'student' or new.left_at is not null then
    return new;
  end if;

  for v_arc in
    select sa.id
    from public.story_arcs sa
    join public.class_instance_scenario_assignments csa
      on csa.scenario_id = sa.scenario_id
    where csa.class_instance_id = new.class_instance_id
      and sa.status = 'live'
  loop
    perform public.start_arc_for_user(
      new.user_id,
      v_arc.id,
      new.class_instance_id
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_bootstrap_arcs_for_class_instance_member
  on public.class_instance_memberships;

create trigger trg_bootstrap_arcs_for_class_instance_member
  after insert on public.class_instance_memberships
  for each row
  execute function public.bootstrap_arcs_for_new_class_instance_member();
