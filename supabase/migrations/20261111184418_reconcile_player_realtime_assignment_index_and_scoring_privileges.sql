-- DR1FT production reconciliation follow-up.
-- These additive corrections were applied to production on 2026-11-11 after
-- read-only verification showed the publication entries, index and helper
-- function privileges were missing.
--
-- Safe to re-run: publication membership and index creation are guarded.
-- The privilege change is intentionally restrictive.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'content_items'
  ) then
    alter publication supabase_realtime add table public.content_items;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_interactions'
  ) then
    alter publication supabase_realtime add table public.user_interactions;
  end if;
end
$$;

create index if not exists idx_class_instance_scenario_assignments_active_state
  on public.class_instance_scenario_assignments (class_instance_id, is_active)
  where archived_at is null;

-- Pure scoring helper; only the privileged finalizer needs to call it.
revoke all on function public.calculate_scenario_requirement_score_v1(jsonb, jsonb)
  from public, anon, authenticated;
