
create or replace function public.save_teacher_module_editor(
  p_class_instance_id uuid,
  p_module_id uuid,
  p_school_id uuid,
  p_title text,
  p_description text,
  p_title_card_enabled boolean,
  p_visibility_scope text,
  p_posts jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_module_school_id uuid;
  v_created_by uuid;
  v_is_teacher boolean := false;
  v_is_school_admin boolean := false;
begin
  if v_user_id is null then
    raise exception 'Nicht authentifiziert' using errcode = '42501';
  end if;
  if p_title is null or length(btrim(p_title)) = 0 or length(p_title) > 120 then
    raise exception 'Ungültiger Modultitel.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_posts) <> 'array' or jsonb_array_length(p_posts) < 1 or jsonb_array_length(p_posts) > 40 then
    raise exception 'Ungültige Beitragsliste.' using errcode = '22023';
  end if;
  if p_visibility_scope not in ('private','school','class') then
    raise exception 'Ungültiger Sichtbarkeitsbereich.' using errcode = '22023';
  end if;

  select m.school_id, m.created_by into v_module_school_id, v_created_by
  from public.teacher_modules m where m.id = p_module_id;

  if v_module_school_id is distinct from p_school_id or v_created_by is distinct from v_user_id then
    raise exception 'Nur die erstellende Lehrkraft kann dieses Modul bearbeiten.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.teacher_module_class_assignments a
    join public.class_instances ci on ci.id = a.class_instance_id
    where a.module_id = p_module_id and a.class_instance_id = p_class_instance_id
      and a.school_id = p_school_id and ci.school_id = p_school_id
  ) then
    raise exception 'Keine Zuordnung zu dieser Klasse.' using errcode = '42501';
  end if;

  select exists (select 1 from public.class_instance_memberships cim
    where cim.class_instance_id=p_class_instance_id and cim.user_id=v_user_id
      and cim.role='teacher' and cim.left_at is null) into v_is_teacher;
  select exists (select 1 from public.school_memberships sm
    where sm.school_id=p_school_id and sm.user_id=v_user_id
      and sm.active=true and sm.role='school_admin') into v_is_school_admin;
  if not (v_is_teacher or v_is_school_admin) then
    raise exception 'Keine Berechtigung für diese Klasse.' using errcode = '42501';
  end if;

  if exists (
    select 1 from jsonb_to_recordset(p_posts) as x(id uuid, post_type text)
    where x.id is null or x.post_type not in ('text','image','embed','mixed','poll','true_false')
  ) then
    raise exception 'Ungültiger Modulbeitrag.' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_to_recordset(p_posts) as x(id uuid)
    left join public.teacher_module_posts p on p.id=x.id and p.module_id=p_module_id
    where p.id is null and exists (select 1 from public.teacher_module_posts p2 where p2.id=x.id)
  ) then
    raise exception 'Beitrags-ID gehört zu einem anderen Modul.' using errcode = '42501';
  end if;

  update public.teacher_modules
  set title=p_title, description=coalesce(p_description,''), title_card_enabled=coalesce(p_title_card_enabled,true),
      visibility_scope=p_visibility_scope, updated_at=now()
  where id=p_module_id and created_by=v_user_id;

  delete from public.teacher_module_posts p
  where p.module_id=p_module_id
    and not exists (select 1 from jsonb_to_recordset(p_posts) as x(id uuid) where x.id=p.id);

  insert into public.teacher_module_posts
    (id,module_id,post_type,title,body,image_path,interaction_data,embed_provider,embed_url,sort_order,status)
  select x.id,p_module_id,x.post_type,coalesce(x.title,''),coalesce(x.body,''),x.image_path,
         coalesce(x.interaction_data,'{}'::jsonb),x.embed_provider,x.embed_url,x.sort_order,'published'
  from jsonb_to_recordset(p_posts) as x(
    id uuid, post_type text, title text, body text, image_path text,
    interaction_data jsonb, embed_provider text, embed_url text, sort_order integer
  )
  on conflict (id) do update set
    post_type=excluded.post_type, title=excluded.title, body=excluded.body,
    image_path=excluded.image_path, interaction_data=excluded.interaction_data,
    embed_provider=excluded.embed_provider, embed_url=excluded.embed_url,
    sort_order=excluded.sort_order, status='published', updated_at=now()
  where public.teacher_module_posts.module_id=p_module_id;
end;
$$;

revoke all on function public.save_teacher_module_editor(uuid,uuid,uuid,text,text,boolean,text,jsonb) from public, anon;
grant execute on function public.save_teacher_module_editor(uuid,uuid,uuid,text,text,boolean,text,jsonb) to authenticated;

