-- Preserve class-module assignment history when a teacher removes a module.
-- Learning evidence and mission progress remain linked to the original assignment.
ALTER TABLE public.class_instance_scenario_assignments
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_class_instance_scenario_assignments_active
  ON public.class_instance_scenario_assignments (class_instance_id, scenario_id)
  WHERE archived_at IS NULL;

COMMENT ON COLUMN public.class_instance_scenario_assignments.archived_at IS
  'When set, the module is archived for this class instance. The assignment row and all related learning data are retained.';
