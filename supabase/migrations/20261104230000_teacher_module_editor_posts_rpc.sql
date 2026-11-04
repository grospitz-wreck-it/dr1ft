create or replace function public.get_teacher_module_editor_posts(
  p_class_instance_id uuid,
  p_module_id uuid
)
returns table (
  id uuid,
  post_type text,
  title text,
  body text,
  image_path text,
  embed_url text,
  interaction_data jsonb,
  sort_order integer,
  status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_school_id uuid;
  v_created_by uuid;
  v_is_teacher boolean := false;
  v_is_school_admin boolean := false;
begin
  if v_user_id is null then
    raise exception 'Nicht authentifiziert' using errcode = '42501';
  end if;

  select m.school_id, m.created_by
    into v_school_id, v_created_by
  from public.teacher_modules m
  where m.id = p_module_id;

  if v_school_id is null or v_created_by is distinct from v_user_id then
    raise exception 'Nur die erstellende Lehrkraft kann dieses Modul bearbeiten.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.teacher_module_class_assignments a
    join public.class_instances ci on ci.id = a.class_instance_id
    where a.module_id = p_module_id
      and a.class_instance_id = p_class_instance_id
      and a.school_id = v_school_id
      and ci.school_id = v_school_id
  ) then
    raise exception 'Keine Zuordnung zu dieser Klasse.' using errcode = '42501';
  end if;

  select exists (
    select 1 from public.class_instance_memberships cim
    where cim.class_instance_id = p_class_instance_id
      and cim.user_id = v_user_id
      and cim.role = 'teacher'
      and cim.left_at is null
  ) into v_is_teacher;

  select exists (
    select 1 from public.school_memberships sm
    where sm.school_id = v_school_id
      and sm.user_id = v_user_id
      and sm.active = true
      and sm.role = 'school_admin'
  ) into v_is_school_admin;

  if not (v_is_teacher or v_is_school_admin) then
    raise exception 'Keine Berechtigung für diese Klasse.' using errcode = '42501';
  end if;

  return query
  select p.id, p.post_type, p.title, p.body, p.image_path,
         p.embed_url, p.interaction_data, p.sort_order, p.status
  from public.teacher_module_posts p
  where p.module_id = p_module_id
  order by p.sort_order asc;
end;
$$;

revoke all on function public.get_teacher_module_editor_posts(uuid, uuid) from public, anon;
grant execute on function public.get_teacher_module_editor_posts(uuid, uuid) to authenticated;
