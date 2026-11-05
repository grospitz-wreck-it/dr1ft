create or replace function public.archive_school_class_instance(p_class_instance_id uuid)
returns void language plpgsql security definer set search_path=public,auth as $$
declare v_school_id uuid;
begin
 if auth.uid() is null then raise exception 'Nicht authentifiziert' using errcode='42501'; end if;
 select school_id into v_school_id from public.class_instances where id=p_class_instance_id;
 if v_school_id is null then raise exception 'Klasse nicht gefunden' using errcode='22023'; end if;
 if not public.can_manage_school(v_school_id) then raise exception 'Keine Berechtigung für diese Schule.' using errcode='42501'; end if;
 update public.class_instances set is_active=false,status='archived' where id=p_class_instance_id and is_active=true;
 if not found then raise exception 'Die Klasse ist bereits archiviert.' using errcode='22023'; end if;
end $$;
revoke all on function public.archive_school_class_instance(uuid) from public,anon;
grant execute on function public.archive_school_class_instance(uuid) to authenticated;

-- Archived classes remain available for historical reporting but do not roll forward.
create or replace function public.create_next_school_year_classes(p_school_id uuid,p_from_school_year text,p_to_school_year text)
returns integer language plpgsql security definer set search_path=public,auth as $$
declare v_cfg public.school_class_matrix_configs; v_prev record; v_code text; v_name text; v_count integer:=0;
begin
 if auth.uid() is null or not public.can_manage_school(p_school_id) then raise exception 'Keine Berechtigung für diese Schule.'; end if;
 if p_from_school_year=p_to_school_year or p_to_school_year !~ '^20[0-9]{2}/20[0-9]{2}$' then raise exception 'Ungültiges Ziel-Schuljahr.'; end if;
 select * into v_cfg from public.school_class_matrix_configs where school_id=p_school_id and school_year=p_from_school_year;
 if not found then raise exception 'Ausgangsjahr besitzt keine Jahrgangsmatrix.'; end if;
 if exists(select 1 from public.class_instances where school_id=p_school_id and school_year=p_to_school_year) then raise exception 'Im Zieljahr existieren bereits Klassen.'; end if;
 insert into public.school_class_matrix_configs(school_id,school_year,start_grade,grade_count,updated_by) values(p_school_id,p_to_school_year,v_cfg.start_grade,v_cfg.grade_count,auth.uid());
 for v_prev in select * from public.class_instances where school_id=p_school_id and school_year=p_from_school_year and is_active=true and grade_level is not null and grade_level+1<v_cfg.start_grade+v_cfg.grade_count and grade_level+1>=v_cfg.start_grade order by grade_level,name loop
  v_name:=(v_prev.grade_level+1)::text||substring(regexp_replace(v_prev.name,'^[0-9]+','') from 1);
  loop v_code:=upper(substr(encode(gen_random_bytes(8),'hex'),1,8)); exit when not exists(select 1 from public.class_instances where access_code=v_code); end loop;
  insert into public.class_instances(school_id,name,grade_level,school_year,access_code,created_by,previous_instance_id,is_active,status)
  values(p_school_id,v_name,v_prev.grade_level+1,p_to_school_year,v_code,auth.uid(),v_prev.id,true,'active');
  v_count:=v_count+1;
 end loop;
 return v_count;
end $$;
