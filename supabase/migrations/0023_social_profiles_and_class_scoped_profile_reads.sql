-- DR1FT social profiles: username + deterministic comic avatar.
alter table public.user_profiles
  add column if not exists username text,
  add column if not exists avatar_seed text;

create index if not exists idx_user_profiles_username on public.user_profiles(username);

-- Students may see profile basics only for members of their current class instance.
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

-- Keep profile updates private to the profile owner.
drop policy if exists "users manage own profile" on public.user_profiles;
create policy "users manage own profile"
  on public.user_profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Store a stable seed when profiles are first created.
update public.user_profiles
set avatar_seed = coalesce(avatar_seed, id::text)
where avatar_seed is null;
