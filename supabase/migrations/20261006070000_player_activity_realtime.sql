-- DR1FT — Player class activity realtime
--
-- Ensure the two runtime tables used by the Player activity feed are part
-- of Supabase Realtime. The operation is guarded so this remains safe if
-- a table was already enabled manually.

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
