-- ============================================================
-- DR1FT — Secure school member directory
-- Platform admins and admins/leads of the target school may read
-- the minimum directory fields needed by the school administration UI.
-- ============================================================

create or replace function public.get_school_member_directory(p_school_id uuid)
returns table (
  id uuid,
  user_id uuid,
  email text,
  display_name text,
  role text,
  active boolean,
  created_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.is_platform_admin() and not public.is_school_admin_of(p_school_id) then
    raise exception 'Nicht berechtigt, diese Schule zu verwalten';
  end if;

  return query
  select
    sm.id,
    sm.user_id,
    au.email::text,
    up.display_name,
    sm.role,
    sm.active,
    sm.created_at
  from public.school_memberships sm
  join auth.users au on au.id = sm.user_id
  left join public.user_profiles up on up.id = sm.user_id
  where sm.school_id = p_school_id
  order by sm.active desc, sm.role, coalesce(up.display_name, au.email), sm.created_at;
end;
$$;

grant execute on function public.get_school_member_directory(uuid) to authenticated;
