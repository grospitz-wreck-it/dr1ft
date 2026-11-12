-- Do not offer an already subscribed inactive module as available.
-- Archived assignments remain available for re-subscription.
do $migration$
declare
  v_definition text;
begin
  v_definition := pg_get_functiondef('public.get_teacher_module_library_for_class_v1(uuid)'::regprocedure);
  v_definition := replace(v_definition, E'and a.is_active = true\n', '');
  execute v_definition;
end
$migration$;
