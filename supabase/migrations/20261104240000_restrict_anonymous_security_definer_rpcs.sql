-- SECURITY DEFINER functions are executable by PUBLIC by default in PostgreSQL.
-- That means anon inherits EXECUTE unless it is explicitly revoked.
--
-- Keep the existing browser-facing RPC surface available to authenticated
-- users, but never expose these functions to anonymous callers. Trigger
-- functions are excluded: PostgreSQL does not require callers to hold
-- EXECUTE privilege to fire a trigger. Internal arc/mission bootstrap helpers
-- are also excluded; their explicit service_role-only grants are established
-- by the preceding hardening migration.

do $$
declare
  v_function regprocedure;
begin
  for v_function in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.prorettype <> 'trigger'::regtype
      and p.proname not in (
        'start_arc_for_user',
        'unlock_mission_for_user'
      )
  loop
    execute format(
      'revoke execute on function %s from public, anon',
      v_function
    );

    execute format(
      'grant execute on function %s to authenticated, service_role',
      v_function
    );
  end loop;
end;
$$;

comment on schema public is
  'Public-schema SECURITY DEFINER RPCs are not executable by anon; authenticated access is granted explicitly by the security hardening policy.';
