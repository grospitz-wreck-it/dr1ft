-- Allow students to read explicit content mappings for live missions in scenarios
-- assigned to their active class instance. Editorial writes remain default-deny.
create policy "students read assigned live mission content mappings"
  on public.mission_content_items for select
  using (
    exists (
      select 1
      from public.missions m
      join public.class_instance_scenario_assignments a
        on a.scenario_id = m.scenario_id
      join public.class_instance_memberships cim
        on cim.class_instance_id = a.class_instance_id
      where m.id = mission_content_items.mission_id
        and m.status = 'live'
        and cim.user_id = auth.uid()
        and cim.role = 'student'
        and cim.left_at is null
    )
  );
