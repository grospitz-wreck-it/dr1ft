-- Teacher-created students receive a complete social profile at account creation.
-- Existing profiles are left intact; only missing values are backfilled.
update public.user_profiles up
set
  username = coalesce(up.username, split_part(au.email, '.', 1)),
  avatar_seed = coalesce(up.avatar_seed, gen_random_uuid()::text)
from auth.users au
where au.id = up.id
  and (up.username is null or up.avatar_seed is null);

create unique index if not exists uq_user_profiles_username
  on public.user_profiles(lower(username))
  where username is not null;
