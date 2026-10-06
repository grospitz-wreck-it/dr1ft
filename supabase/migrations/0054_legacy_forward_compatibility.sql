-- ============================================================
-- DR1FT — Forward compatibility for legacy migrations
--
-- Contains functionality from historical migrations that cannot
-- retain their original version number because those versions are
-- already recorded differently in the remote migration history.
--
-- - ambient_generation_profiles from historical 0015
-- - school membership email-domain enforcement from historical 0031
-- ============================================================

-- ------------------------------------------------------------
-- Ambient generation profiles
-- ------------------------------------------------------------

create table if not exists public.ambient_generation_profiles (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  label text not null,
  description text,
  age_band text not null,
  writing_style text not null,
  typo_level int not null default 0 check (typo_level between 0 and 3),
  slang_level int not null default 0 check (slang_level between 0 and 3),
  emoji_level int not null default 1 check (emoji_level between 0 and 3),
  punctuation_style text not null default 'normal',
  post_length text not null default 'short',
  image_probability int not null default 0 check (image_probability between 0 and 100),
  prompt_rules jsonb not null default '{}',
  is_active boolean not null default true
);

insert into public.ambient_generation_profiles
  (
    key,
    label,
    description,
    age_band,
    writing_style,
    typo_level,
    slang_level,
    emoji_level,
    punctuation_style,
    post_length,
    image_probability
  )
values
  (
    'young_12_13',
    '12–13 · Early Teen',
    'Locker, Schule, Hobbys, erste Internetkultur',
    '12_13',
    'casual',
    1,
    1,
    2,
    'normal',
    'short',
    35
  ),
  (
    'teen_14_15',
    '14–15 · Teen',
    'Chatty, locker, meme-affin, gelegentliche Tippfehler',
    '14_15',
    'casual',
    2,
    2,
    2,
    'loose',
    'short',
    45
  ),
  (
    'teen_16_17',
    '16–17 · Older Teen',
    'Ironisch, pointierter, stärkerer Slang, variabler Rhythmus',
    '16_17',
    'casual',
    2,
    3,
    2,
    'loose',
    'mixed',
    55
  ),
  (
    'young_18',
    '18+ · Young Adult',
    'Natürlicher Social-Ton, weniger Slang, mehr Varianz',
    '18_plus',
    'natural',
    1,
    2,
    1,
    'natural',
    'mixed',
    60
  ),
  (
    'neutral',
    'Neutral',
    'Altersneutrale, unaufgeregte Ambient-Stimme',
    'all',
    'neutral',
    0,
    0,
    1,
    'normal',
    'short',
    20
  )
on conflict (key) do nothing;

alter table public.ambient_generation_profiles enable row level security;

drop policy if exists "authenticated read ambient generation profiles"
  on public.ambient_generation_profiles;

create policy "authenticated read ambient generation profiles"
  on public.ambient_generation_profiles
  for select
  using (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- School identity hardening
-- ------------------------------------------------------------

create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_staff
    where user_id = auth.uid()
      and role = 'platform_admin'
  );
$$;

create or replace function public.enforce_school_member_email_domain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  school_domain text;
  account_email text;
  normalized_domain text;
begin
  if public.is_platform_admin() then
    return new;
  end if;

  select lower(trim(email_domain))
    into school_domain
  from public.schools
  where id = new.school_id;

  if school_domain is null or school_domain = '' then
    raise exception 'Für diese Schule ist keine autorisierte E-Mail-Domain hinterlegt';
  end if;

  select lower(trim(email))
    into account_email
  from auth.users
  where id = new.user_id;

  if account_email is null or position('@' in account_email) = 0 then
    raise exception 'Das Benutzerkonto besitzt keine gültige E-Mail-Adresse';
  end if;

  normalized_domain := split_part(account_email, '@', 2);

  if normalized_domain <> school_domain then
    raise exception 'Die E-Mail-Domain des Kontos ist für diese Schule nicht autorisiert';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_school_member_email_domain
  on public.school_memberships;

create trigger trg_enforce_school_member_email_domain
before insert or update of school_id, user_id
on public.school_memberships
for each row
execute function public.enforce_school_member_email_domain();

comment on function public.enforce_school_member_email_domain() is
  'Requires school_memberships accounts to use the configured school email domain; platform_admin is the explicit exception.';
