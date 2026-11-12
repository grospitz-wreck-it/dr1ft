-- DR1FT social profiles: username + deterministic comic avatar.
alter table public.user_profiles
  add column if not exists username text,
  add column if not exists avatar_seed text;

create index if not exists idx_user_profiles_username on public.user_profiles(username);

drop policy if exists "class members read scoped profiles" on public.user_profiles;
create policy "class members read scoped profiles"
  on public.user_profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.class_instance_memberships viewer_membership
      join public.class_instance_memberships target_membership
        on target_membership.class_instance_id = viewer_membership.class_instance_id
      where viewer_membership.user_id = auth.uid()
        and viewer_membership.left_at is null
        and target_membership.user_id = user_profiles.id
        and target_membership.left_at is null
    )
  );

drop policy if exists "users manage own profile" on public.user_profiles;
create policy "users manage own profile"
  on public.user_profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

update public.user_profiles up
set
  username = coalesce(up.username, split_part(au.email, '.', 1)),
  avatar_seed = coalesce(up.avatar_seed, gen_random_uuid()::text)
from auth.users au
where au.id = up.id;
