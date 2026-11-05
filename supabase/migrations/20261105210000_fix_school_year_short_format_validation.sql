create or replace function public.save_school_class_matrix_config(p_school_id uuid,p_school_year text,p_start_grade integer,p_grade_count integer)
returns public.school_class_matrix_configs language plpgsql security definer set search_path=public,auth as $$
declare v_row public.school_class_matrix_configs; v_start integer; v_end integer;
begin
 if auth.uid() is null or not public.can_manage_school(p_school_id) then raise exception 'Keine Berechtigung für diese Schule.'; end if;
 if p_school_year !~ '^20[0-9]{2}/[0-9]{2}$' then raise exception 'Ungültiges Schuljahr-Format. Erwartet wird z. B. 2026/27.'; end if;
 v_start:=split_part(p_school_year,'/',1)::integer;
 v_end:=split_part(p_school_year,'/',2)::integer;
 if v_end<>(v_start+1)%100 then raise exception 'Das Schuljahr muss zwei aufeinanderfolgende Jahre enthalten.'; end if;
 if p_start_grade not between 1 and 20 or p_grade_count not between 1 and 20 or p_start_grade+p_grade_count-1>20 then raise exception 'Ungültige Jahrgangskonfiguration.'; end if;
 insert into public.school_class_matrix_configs(school_id,school_year,start_grade,grade_count,updated_by)
 values(p_school_id,p_school_year,p_start_grade,p_grade_count,auth.uid())
 on conflict(school_id,school_year) do update set start_grade=excluded.start_grade,grade_count=excluded.grade_count,updated_by=auth.uid(),updated_at=now()
 returning * into v_row;
 return v_row;
end $$;

create or replace function public.create_next_school_year_classes(p_school_id uuid,p_from_school_year text,p_to_school_year text)
returns integer language plpgsql security definer set search_path=public,auth as $$
declare v_cfg public.school_class_matrix_configs; v_prev record; v_code text; v_name text; v_count integer:=0; v_start integer; v_end integer;
begin
 if auth.uid() is null or not public.can_manage_school(p_school_id) then raise exception 'Keine Berechtigung für diese Schule.'; end if;
 if p_from_school_year !~ '^20[0-9]{2}/[0-9]{2}$' or p_to_school_year !~ '^20[0-9]{2}/[0-9]{2}$' then raise exception 'Ungültiges Schuljahr-Format.'; end if;
 v_start:=split_part(p_from_school_year,'/',1)::integer;
 v_end:=split_part(p_to_school_year,'/',1)::integer;
 if v_end<>v_start+1 or split_part(p_to_school_year,'/',2)::integer<>(v_end+1)%100 then raise exception 'Das Ziel-Schuljahr muss direkt auf das Ausgangsjahr folgen.'; end if;
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
