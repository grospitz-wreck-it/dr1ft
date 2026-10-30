-- Distinguish a temporarily inactive module from an archived assignment.
-- Inactive modules remain assigned and retain all learning records.
ALTER TABLE public.class_instance_scenario_assignments
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_class_instance_scenario_assignments_active_state
  ON public.class_instance_scenario_assignments (class_instance_id, is_active)
  WHERE archived_at IS NULL;
