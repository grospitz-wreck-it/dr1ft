create or replace function public.delete_empty_school_class_instance(p_class_instance_id uuid)
returns void language plpgsql security definer set search_path=public,auth as $$
declare v_school_id uuid; v_table regclass; v_column text; v_has_refs boolean;
begin
 if auth.uid() is null then raise exception 'Nicht authentifiziert' using errcode='42501'; end if;
 select school_id into v_school_id from public.class_instances where id=p_class_instance_id for update;
 if v_school_id is null then raise exception 'Klasse nicht gefunden.' using errcode='22023'; end if;
 if not public.can_manage_school(v_school_id) then raise exception 'Keine Berechtigung für diese Schule.' using errcode='42501'; end if;
 for v_table,v_column in
  select con.conrelid::regclass,att.attname
  from pg_constraint con
  join unnest(con.conkey) with ordinality k(attnum,ord) on true
  join pg_attribute att on att.attrelid=con.conrelid and att.attnum=k.attnum
  where con.contype='f' and con.confrelid='public.class_instances'::regclass
 loop
  execute format('select exists(select 1 from %s where %I = $1)',v_table,v_column) into v_has_refs using p_class_instance_id;
  if v_has_refs then
   raise exception 'Diese Klasse enthält bereits verknüpfte Daten oder Historie. Bitte archivieren statt löschen.' using errcode='23503';
  end if;
 end loop;
 delete from public.class_instances where id=p_class_instance_id;
end $$;
revoke all on function public.delete_empty_school_class_instance(uuid) from public,anon;
grant execute on function public.delete_empty_school_class_instance(uuid) to authenticated;
