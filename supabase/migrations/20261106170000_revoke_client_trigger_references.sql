-- DR1FT: remove non-RLS client table privileges.
--
-- Live catalog inspection on 2026-11-06 found TRIGGER and REFERENCES
-- granted to both anon and authenticated on 67 public relations.
-- These privileges are not constrained by row-level security and are not
-- required by the browser application.
--
-- DELETE is intentionally untouched: its effective access remains governed
-- by the table's RLS policies and must be reviewed policy-by-policy.
-- SELECT, INSERT and UPDATE are also intentionally untouched.

revoke trigger, references on all tables in schema public
  from anon, authenticated;

-- Prevent future public tables created by either schema owner from inheriting
-- these non-RLS client privileges.
alter default privileges for role postgres in schema public
  revoke trigger, references on tables from anon, authenticated;

-- The connected postgres role cannot alter supabase_admin-owned defaults.
