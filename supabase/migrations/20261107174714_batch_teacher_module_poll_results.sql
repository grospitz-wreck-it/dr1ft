create or replace function public.get_teacher_module_poll_results_batch(p_post_ids uuid[])
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    jsonb_object_agg(p.post_id::text, public.get_teacher_module_poll_results(p.post_id)),
    '{}'::jsonb
  )
  from (
    select distinct unnest(coalesce(p_post_ids, '{}'::uuid[])) as post_id
  ) p
  where p.post_id is not null;
$$;
revoke all on function public.get_teacher_module_poll_results_batch(uuid[]) from public, anon;
grant execute on function public.get_teacher_module_poll_results_batch(uuid[]) to authenticated;
