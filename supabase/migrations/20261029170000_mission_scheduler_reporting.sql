-- Per-class-instance mission scheduling.
alter table public.class_instance_scenario_assignments
  add column if not exists scheduled_start_at timestamptz,
  add column if not exists scheduled_end_at timestamptz,
  add column if not exists show_reports_at_end boolean not null default false;

alter table public.class_instance_scenario_assignments
  drop constraint if exists class_instance_scenario_assignments_schedule_window_check;

alter table public.class_instance_scenario_assignments
  add constraint class_instance_scenario_assignments_schedule_window_check
  check (
    scheduled_start_at is null
    or scheduled_end_at is null
    or scheduled_end_at > scheduled_start_at
  );

comment on column public.class_instance_scenario_assignments.scheduled_start_at is
  'Optional start time for making the assigned scenario available to students.';
comment on column public.class_instance_scenario_assignments.scheduled_end_at is
  'Optional end time for student availability and optional teacher reporting release.';
comment on column public.class_instance_scenario_assignments.show_reports_at_end is
  'When true, teacher-facing student reports are released after scheduled_end_at.';
