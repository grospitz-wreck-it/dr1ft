create or replace function public.assign_teacher_to_class_instance(p_class_instance_id uuid,p_teacher_user_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_school_id uuid;
begin
 if auth.uid() is null then raise exception 'Nicht authentifiziert' using errcode='42501'; end if;
 if p_class_instance_id is null or p_teacher_user_id is null then raise exception 'Klasse und Lehrkraft müssen angegeben werden' using errcode='22023'; end if;
 select ci.school_id into v_school_id from public.class_instances ci where ci.id=p_class_instance_id;
 if v_school_id is null then raise exception 'Klasseninstanz nicht gefunden' using errcode='22023'; end if;
 if not public.can_manage_school(v_school_id) then raise exception 'Nur Schuladmin, Schulleitung oder Plattformadmin dürfen Lehrkräfte zuordnen' using errcode='42501'; end if;
 if not exists(select 1 from public.school_memberships sm where sm.school_id=v_school_id and sm.user_id=p_teacher_user_id and sm.active=true and sm.role='teacher') then
   raise exception 'Die Person ist keine aktive Lehrkraft dieser Schule' using errcode='42501';
 end if;
 if exists(select 1 from public.class_instance_memberships cim where cim.user_id=p_teacher_user_id and cim.role='student' and cim.left_at is null) then
   raise exception 'Ein aktiver Schülerzugang kann nicht als Lehrkraft zugeordnet werden' using errcode='23514';
 end if;
 insert into public.class_instance_memberships(class_instance_id,user_id,role,left_at)
 values(p_class_instance_id,p_teacher_user_id,'teacher',null)
 on conflict(class_instance_id,user_id) do update set left_at=null
 where class_instance_memberships.role='teacher';
 if not exists(select 1 from public.class_instance_memberships cim where cim.class_instance_id=p_class_instance_id and cim.user_id=p_teacher_user_id and cim.role='teacher' and cim.left_at is null) then
   raise exception 'Die bestehende Zuordnung hat eine andere Rolle und wurde nicht verändert' using errcode='23514';
 end if;
end $$;

create or replace function public.unassign_teacher_from_class_instance(p_class_instance_id uuid,p_teacher_user_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_school_id uuid;
begin
 if auth.uid() is null then raise exception 'Nicht authentifiziert' using errcode='42501'; end if;
 select ci.school_id into v_school_id from public.class_instances ci where ci.id=p_class_instance_id;
 if v_school_id is null then raise exception 'Klasseninstanz nicht gefunden' using errcode='22023'; end if;
 if not public.can_manage_school(v_school_id) then raise exception 'Nur Schuladmin, Schulleitung oder Plattformadmin dürfen Lehrkräfte entfernen' using errcode='42501'; end if;
 update public.class_instance_memberships set left_at=now()
 where class_instance_id=p_class_instance_id and user_id=p_teacher_user_id and role='teacher' and left_at is null;
end $$;
revoke all on function public.assign_teacher_to_class_instance(uuid,uuid) from public,anon;
revoke all on function public.unassign_teacher_from_class_instance(uuid,uuid) from public,anon;
grant execute on function public.assign_teacher_to_class_instance(uuid,uuid) to authenticated;
grant execute on function public.unassign_teacher_from_class_instance(uuid,uuid) to authenticated;
