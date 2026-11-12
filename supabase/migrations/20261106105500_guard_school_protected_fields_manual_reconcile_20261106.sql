-- DR1FT: separate school profile editing from platform-controlled fields.
--
-- is_school_admin_of() intentionally includes school_admin and school_lead,
-- and the existing UPDATE policy allows both roles to edit their own school.
-- Keep that profile workflow, but prevent school-level roles from changing
-- platform, billing, identity, or internal administration fields.

create or replace function public.guard_school_protected_fields()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if not public.is_platform_admin() and (
    new.id is distinct from old.id
    or new.created_at is distinct from old.created_at
    or new.email_domain is distinct from old.email_domain
    or new.student_count is distinct from old.student_count
    or new.status is distinct from old.status
    or new.plan is distinct from old.plan
    or new.funding_type is distinct from old.funding_type
    or new.internal_notes is distinct from old.internal_notes
  ) then
    raise exception 'Only platform administrators may change protected school administration fields'
      using errcode = '42501';
  end if;

  return new;
end;
$function$;

drop trigger if exists guard_school_protected_fields on public.schools;

create trigger guard_school_protected_fields
before update on public.schools
for each row
execute function public.guard_school_protected_fields();

comment on function public.guard_school_protected_fields() is
  'Allows school administrators and school leads to edit school profile fields while reserving identity, billing, status and internal administration fields for platform administrators.';
