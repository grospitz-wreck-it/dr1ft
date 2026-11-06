-- DR1FT: restrict learning-design mapping writes to platform staff.
--
-- Existing SELECT policies remain in place for authenticated application
-- users. The previous ALL policies allowed any authenticated account to
-- alter/delete learning-objective and learning-step mappings merely because
-- the parent record existed. Only platform editorial staff should change
-- canonical learning design.

drop policy if exists "learning objective competencies write"
  on public.learning_objective_competencies;
create policy "platform staff manage learning objective competencies"
  on public.learning_objective_competencies
  for all
  to authenticated
  using (public.is_platform_staff())
  with check (public.is_platform_staff());

drop policy if exists "learning step competencies write"
  on public.learning_step_competencies;
create policy "platform staff manage learning step competencies"
  on public.learning_step_competencies
  for all
  to authenticated
  using (public.is_platform_staff())
  with check (public.is_platform_staff());

drop policy if exists "learning step content write"
  on public.learning_step_content;
create policy "platform staff manage learning step content"
  on public.learning_step_content
  for all
  to authenticated
  using (public.is_platform_staff())
  with check (public.is_platform_staff());

drop policy if exists "learning step missions write"
  on public.learning_step_missions;
create policy "platform staff manage learning step missions"
  on public.learning_step_missions
  for all
  to authenticated
  using (public.is_platform_staff())
  with check (public.is_platform_staff());

drop policy if exists "learning step objectives write"
  on public.learning_step_objectives;
create policy "platform staff manage learning step objectives"
  on public.learning_step_objectives
  for all
  to authenticated
  using (public.is_platform_staff())
  with check (public.is_platform_staff());
