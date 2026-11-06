-- DR1FT security hardening
-- RLS does not protect against TRUNCATE. Remove that table privilege from
-- browser-facing roles on existing public relations and from future objects.
-- Keep SELECT/INSERT/UPDATE/DELETE grants unchanged; row access remains governed
-- by the existing RLS policies and narrowly scoped RPCs.

revoke truncate on all tables in schema public from anon, authenticated;

-- Supabase migrations commonly create objects as postgres. Also cover
-- supabase_admin so future objects created under either owner do not inherit
-- TRUNCATE for browser-facing roles.
alter default privileges for role postgres in schema public
  revoke truncate on tables from anon, authenticated;

alter default privileges for role supabase_admin in schema public
  revoke truncate on tables from anon, authenticated;
