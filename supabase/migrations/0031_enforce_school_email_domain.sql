-- ============================================================
-- DR1FT — School identity hardening
--
-- A school role is only assignable to a user whose authenticated
-- email domain matches the school's verified/approved domain.
-- Platform admins are the explicit exception.
--
-- Important: the check lives in the database, not only in the UI.
-- This protects inserts/updates coming from Server Actions, APIs
-- and future administrative tooling alike.
-- ============================================================

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
  -- DR1FT platform admins may provision/manage school memberships
  -- independently of the school's email domain.
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
