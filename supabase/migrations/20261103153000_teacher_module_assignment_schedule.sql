alter table public.teacher_module_class_assignments
  add column if not exists scheduled_start_at timestamptz,
  add column if not exists scheduled_end_at timestamptz,
  add column if not exists show_reports_at_end boolean not null default false;

alter table public.teacher_module_class_assignments
  drop constraint if exists teacher_module_assignment_schedule_check;

alter table public.teacher_module_class_assignments
  add constraint teacher_module_assignment_schedule_check
  check (
    scheduled_start_at is null
    or scheduled_end_at is null
    or scheduled_end_at > scheduled_start_at
  );
