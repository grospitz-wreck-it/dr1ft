-- Trigger functions are invoked by PostgreSQL triggers, not by browser RPCs.
-- PostgreSQL checks EXECUTE privilege when a trigger is created; runtime trigger
-- execution does not require granting EXECUTE to anon/authenticated.
-- Revoke the default PUBLIC/browser EXECUTE privilege from every public-schema
-- trigger-returning function, including legacy trigger helpers no longer attached.

do $$
declare
  v_function regprocedure;
begin
  for v_function in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prorettype = 'trigger'::regtype
  loop
    execute format(
      'revoke execute on function %s from public, anon, authenticated',
      v_function
    );
  end loop;
end;
$$;
