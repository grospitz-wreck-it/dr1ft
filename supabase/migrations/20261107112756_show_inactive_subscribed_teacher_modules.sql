-- Include inactive, non-archived teacher module subscriptions in the assigned list.
-- The follow-up migration also removes the active-only filter from availability.
do $migration$
declare
  v_definition text;
begin
  v_definition := pg_get_functiondef('public.get_teacher_module_library_for_class_v1(uuid)'::regprocedure);
  v_definition := replace(
    v_definition,
    E'    and a.is_active = true\n    and a.archived_at is null',
    E'    and a.archived_at is null'
  );
  execute v_definition;
end
$migration$;
