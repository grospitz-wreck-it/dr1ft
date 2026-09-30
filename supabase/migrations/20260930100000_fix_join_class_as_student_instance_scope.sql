-- Repair the student self-join flow after the class-instance cutover.
-- Existing clients still call the same RPC, but membership must now be
-- created in class_instance_memberships so current runtime resolution works.

create or replace function public.join_class_as_student(
  p_access_code text,
  p_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_instance_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Nicht authentifiziert';
  end if;

  select id
    into v_instance_id
  from public.class_instances
  where access_code = upper(trim(p_access_code))
    and is_active = true
  limit 1;

  if v_instance_id is null then
    raise exception 'Ungültiger oder inaktiver Zugangscode';
  end if;

  insert into public.user_profiles (id, display_name)
  values (auth.uid(), p_display_name)
  on conflict (id) do update
    set display_name = excluded.display_name;

  insert into public.class_instance_memberships (
    class_instance_id,
    user_id,
    role
  )
  values (
    v_instance_id,
    auth.uid(),
    'student'
  )
  on conflict (class_instance_id, user_id) do update
    set role = excluded.role,
        left_at = null;

  return v_instance_id;
end;
$function$;
