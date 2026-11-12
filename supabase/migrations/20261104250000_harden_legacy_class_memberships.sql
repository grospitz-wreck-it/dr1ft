-- Harden the legacy classes/class_memberships tables.
--
-- The teacher app creates a legacy class and bootstraps exactly one
-- membership: the creator's own teacher membership. Student joins and
-- class-instance membership changes are handled by SECURITY DEFINER RPCs or
-- trusted Edge Functions. No browser workflow needs to assign arbitrary
-- class_memberships rows, change roles, or delete memberships.

drop policy if exists "class creators can insert memberships"
  on public.class_memberships;
drop policy if exists "teachers can insert memberships of own class"
  on public.class_memberships;
drop policy if exists "teachers can update memberships of own class"
  on public.class_memberships;
drop policy if exists "teachers can delete memberships of own class"
  on public.class_memberships;

drop policy if exists "class creators can bootstrap teacher membership"
  on public.class_memberships;

create policy "class creators bootstrap their own teacher membership"
  on public.class_memberships
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'teacher'::public.user_role
    and exists (
      select 1
      from public.classes c
      where c.id = class_memberships.class_id
        and c.created_by = (select auth.uid())
    )
  );

-- Browser users can read their own legacy membership only. All membership
-- changes are handled by the validated bootstrap/join/server workflows.
drop policy if exists "users view own memberships"
  on public.class_memberships;

create policy "authenticated users view own legacy memberships"
  on public.class_memberships
  for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all privileges on table public.class_memberships
  from public, anon, authenticated;

grant select on table public.class_memberships
  to authenticated;
grant insert (class_id, user_id, role) on table public.class_memberships
  to authenticated;

comment on table public.class_memberships is
  'Legacy class membership table. Browser access is read-own and creator self-bootstrap only; role changes and membership management use validated server-side workflows.';

-- The browser class-creation action inserts a class and then creates the
-- creator's own teacher membership. It does not update or delete class rows.
drop policy if exists "members can view their class"
  on public.classes;
create policy "authenticated members can view their class"
  on public.classes
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.class_memberships cm
      where cm.class_id = classes.id
        and cm.user_id = (select auth.uid())
    )
  );

drop policy if exists "teachers can view own classes"
  on public.classes;
create policy "authenticated teachers can view own classes"
  on public.classes
  for select
  to authenticated
  using (public.is_teacher_of_class(id));

revoke all privileges on table public.classes
  from public, anon, authenticated;

grant select on table public.classes
  to authenticated;
grant insert (school_id, name, access_code, created_by, grade_level)
  on table public.classes
  to authenticated;

comment on table public.classes is
  'Legacy class definition table. Browser users may read RLS-visible rows and create a class they own; class identity and ownership are not browser-editable.';
