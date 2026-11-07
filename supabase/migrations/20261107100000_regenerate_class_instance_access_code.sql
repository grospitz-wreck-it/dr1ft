create or replace function public.regenerate_class_instance_access_code(p_class_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_school_id uuid;
  v_user_id uuid := auth.uid();
  v_is_platform_admin boolean := false;
  v_can_manage_school boolean := false;
  v_has_teacher_subscription boolean := false;
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_random bytea;
  v_code text;
  v_attempt integer;
begin
  if v_user_id is null then
    raise exception 'Nicht authentifiziert';
  end if;

  select ci.school_id into v_school_id
    from public.class_instances ci where ci.id = p_class_id;
  if not found then raise exception 'Klasseninstanz nicht gefunden'; end if;

  select coalesce(public.is_platform_admin(), false) into v_is_platform_admin;
  if v_school_id is not null then
    select coalesce(public.can_manage_school(v_school_id), false) into v_can_manage_school;
  end if;

  select exists (
    select 1 from public.teacher_class_subscriptions tcs
     where tcs.class_instance_id = p_class_id
       and tcs.teacher_user_id = v_user_id
       and tcs.is_active = true
  ) into v_has_teacher_subscription;

  if not (v_is_platform_admin or v_can_manage_school or v_has_teacher_subscription) then
    raise exception 'Keine Berechtigung, den Klassencode neu zu generieren';
  end if;

  for v_attempt in 1..10 loop
    v_random := extensions.gen_random_bytes(6);
    select string_agg(substr(v_alphabet, (get_byte(v_random, i) % length(v_alphabet)) + 1, 1), '' order by i)
      into v_code from generate_series(0, 5) as g(i);
    if not exists (select 1 from public.class_instances ci where ci.access_code = v_code and ci.id <> p_class_id) then
      begin
        update public.class_instances set access_code = v_code where id = p_class_id;
        return v_code;
      exception when unique_violation then
        null;
      end;
    end if;
  end loop;
  raise exception 'Es konnte kein eindeutiger Klassencode erzeugt werden';
end;
$$;

revoke all on function public.regenerate_class_instance_access_code(uuid) from public, anon;
grant execute on function public.regenerate_class_instance_access_code(uuid) to authenticated;
