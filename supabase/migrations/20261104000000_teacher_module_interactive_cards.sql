-- DR1FT teacher module title cards and interactive post types.
alter table public.teacher_modules
  add column if not exists title_card_enabled boolean not null default true;

alter table public.teacher_module_posts
  add column if not exists interaction_data jsonb not null default '{}'::jsonb;

alter table public.teacher_module_posts
  drop constraint if exists teacher_module_posts_post_type_check;

alter table public.teacher_module_posts
  add constraint teacher_module_posts_post_type_check
  check (post_type in ('text','image','embed','mixed','poll','true_false'));

create table if not exists public.teacher_module_post_votes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.teacher_module_posts(id) on delete cascade,
  module_id uuid not null references public.teacher_modules(id) on delete cascade,
  class_instance_id uuid not null references public.class_instances(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  choice text not null check (choice in ('option_1','option_2','true','false')),
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

create index if not exists teacher_module_post_votes_results_idx
  on public.teacher_module_post_votes(post_id, choice);

alter table public.teacher_module_post_votes enable row level security;

drop policy if exists teacher_module_post_votes_member_insert on public.teacher_module_post_votes;
create policy teacher_module_post_votes_member_insert
on public.teacher_module_post_votes for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.teacher_module_class_assignments a
    join public.class_instance_memberships cim
      on cim.class_instance_id = a.class_instance_id
    where a.module_id = teacher_module_post_votes.module_id
      and a.class_instance_id = teacher_module_post_votes.class_instance_id
      and a.is_active = true
      and cim.user_id = auth.uid()
      and cim.role = 'student'
      and cim.left_at is null
  )
  and exists (
    select 1 from public.teacher_module_posts p
    where p.id = teacher_module_post_votes.post_id
      and p.module_id = teacher_module_post_votes.module_id
      and p.post_type in ('poll','true_false')
  )
);

drop policy if exists teacher_module_post_votes_member_update on public.teacher_module_post_votes;
create policy teacher_module_post_votes_member_update
on public.teacher_module_post_votes for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.submit_teacher_module_post_vote(
  p_post_id uuid,
  p_class_instance_id uuid,
  p_choice text
)
returns table(choice text, vote_count bigint, total_votes bigint, my_choice text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_module_id uuid;
begin
  if v_user_id is null then raise exception 'Nicht authentifiziert.'; end if;
  select module_id into v_module_id
  from public.teacher_module_posts
  where id = p_post_id and post_type in ('poll','true_false') and status = 'published';
  if v_module_id is null then raise exception 'Diese Abstimmung ist nicht verfügbar.'; end if;
  if not exists (
    select 1 from public.teacher_module_class_assignments a
    join public.class_instance_memberships cim on cim.class_instance_id = a.class_instance_id
    where a.module_id = v_module_id and a.class_instance_id = p_class_instance_id
      and a.is_active = true and cim.user_id = v_user_id
      and cim.role = 'student' and cim.left_at is null
  ) then raise exception 'Du hast keinen Zugriff auf diese Abstimmung.'; end if;
  if p_choice not in ('option_1','option_2','true','false') then raise exception 'Ungültige Antwort.'; end if;

  insert into public.teacher_module_post_votes(post_id,module_id,class_instance_id,user_id,choice)
  values(p_post_id,v_module_id,p_class_instance_id,v_user_id,p_choice)
  on conflict(post_id,user_id) do update set choice = excluded.choice, created_at = now();

  return query
  with counts as (
    select v.choice as choice, count(*)::bigint as vote_count
    from public.teacher_module_post_votes v
    where v.post_id = p_post_id and v.class_instance_id = p_class_instance_id
    group by v.choice
  ), choices(choice) as (
    select unnest(array['option_1','option_2','true','false']::text[])
  )
  select choices.choice, coalesce(counts.vote_count,0),
    (select count(*)::bigint from public.teacher_module_post_votes v where v.post_id=p_post_id and v.class_instance_id=p_class_instance_id),
    p_choice
  from choices left join counts using(choice);
end;
$$;

grant execute on function public.submit_teacher_module_post_vote(uuid,uuid,text) to authenticated;
notify pgrst, 'reload schema';
