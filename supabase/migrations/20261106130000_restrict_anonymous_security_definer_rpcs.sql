-- DR1FT security hardening: close anonymous execution of SECURITY DEFINER RPCs.
--
-- The live database still exposes 29 public-schema SECURITY DEFINER functions
-- to anon. The earlier source migration for this restriction is absent from
-- the remote migration history, and later functions inherited the same
-- default grants.
--
-- Preserve the effective authenticated and service_role permissions that
-- exist before revoking PUBLIC/anon. Trigger-returning functions are excluded:
-- they are invoked by PostgreSQL triggers, not directly through PostgREST.
--
-- The student join flow calls join_class_as_student only after signUp/signIn
-- has established an authenticated session; no anonymous RPC exception is
-- required for that workflow.

do $$
declare
  v_function regprocedure;
  v_keep_authenticated boolean;
  v_keep_service_role boolean;
begin
  for v_function, v_keep_authenticated, v_keep_service_role in
    select
      p.oid::regprocedure,
      has_function_privilege('authenticated', p.oid, 'EXECUTE'),
      has_function_privilege('service_role', p.oid, 'EXECUTE')
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.prorettype <> 'trigger'::regtype
      and has_function_privilege('anon', p.oid, 'EXECUTE')
  loop
    execute format(
      'revoke execute on function %s from public, anon',
      v_function
    );

    if v_keep_authenticated then
      execute format(
        'grant execute on function %s to authenticated',
        v_function
      );
    end if;

    if v_keep_service_role then
      execute format(
        'grant execute on function %s to service_role',
        v_function
      );
    end if;
  end loop;
end;
$$;

-- Prevent future public-schema functions created by either database owner
-- from receiving anonymous execution by default. Existing authenticated and
-- service_role defaults are deliberately retained.
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon;

alter default privileges for role supabase_admin in schema public
  revoke execute on functions from public, anon;
