-- Use PostgreSQL's built-in gen_random_uuid() rather than pgcrypto.gen_random_bytes().
-- The pgcrypto extension is installed in the extensions schema, which is not on
-- the SECURITY DEFINER functions' search_path.
create or replace function public.create_school_class_from_matrix(p_school_id uuid,p_school_year text,p_grade_level integer)
returns public.class_instances language plpgsql security definer set search_path=public,auth as $$
declare v_cfg public.school_class_matrix_configs; v_i integer:=0; v_suffix text; v_name text; v_code text; v_row public.class_instances;
begin
 if auth.uid() is null or not public.can_manage_school(p_school_id) then raise exception 'Keine Berechtigung für diese Schule.'; end if;
 select * into v_cfg from public.school_class_matrix_configs where school_id=p_school_id and school_year=p_school_year;
 if not found then raise exception 'Bitte zuerst die Jahrgangsmatrix speichern.'; end if;
 if p_grade_level<v_cfg.start_grade or p_grade_level>=v_cfg.start_grade+v_cfg.grade_count then raise exception 'Jahrgang liegt außerhalb der Matrix.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_school_id::text||':'||p_school_year||':'||p_grade_level::text,0));
 loop
  if v_i<26 then v_suffix:=chr(97+v_i); else v_suffix:=chr(96+(v_i/26))||chr(97+(v_i%26)); end if;
  v_name:=p_grade_level::text||v_suffix;
  exit when not exists(select 1 from public.class_instances where school_id=p_school_id and school_year=p_school_year and grade_level=p_grade_level and lower(name)=lower(v_name));
  v_i:=v_i+1; if v_i>701 then raise exception 'Zu viele Parallelklassen.'; end if;
 end loop;
 loop v_code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)); exit when not exists(select 1 from public.class_instances where access_code=v_code); end loop;
 insert into public.class_instances(school_id,name,grade_level,school_year,access_code,created_by,is_active,status)
 values(p_school_id,v_name,p_grade_level,p_school_year,v_code,auth.uid(),true,'active') returning * into v_row;
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
  loop v_code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)); exit when not exists(select 1 from public.class_instances where access_code=v_code); end loop;
  insert into public.class_instances(school_id,name,grade_level,school_year,access_code,created_by,previous_instance_id,is_active,status)
  values(p_school_id,v_name,v_prev.grade_level+1,p_to_school_year,v_code,auth.uid(),v_prev.id,true,'active');
  v_count:=v_count+1;
 end loop;
 return v_count;
end $$;
