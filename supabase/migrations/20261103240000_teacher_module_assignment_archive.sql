-- Add a class-scoped archive state for teacher-created modules.
alter table public.teacher_module_class_assignments
  add column if not exists archived_at timestamptz null;

create index if not exists teacher_module_assignments_unarchived_class_idx
  on public.teacher_module_class_assignments(class_instance_id, module_id)
  where archived_at is null;

comment on column public.teacher_module_class_assignments.archived_at is
  'When set, this teacher-created module assignment is archived for the class. Module content and learning records are retained.';