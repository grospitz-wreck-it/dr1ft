drop policy if exists "active school members view own school" on public.schools;
create policy "active school members view own school"
on public.schools
for select
to authenticated
using (
  exists (
    select 1 from public.school_memberships sm
    where sm.school_id=schools.id
      and sm.user_id=auth.uid()
      and sm.active=true
  )
);
