
create or replace function public.get_teacher_module_library_for_class_v1(p_class_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_school_id uuid;
  v_school_year text;
  v_role text;
  v_is_subscribed boolean := false;
  v_assigned jsonb := '[]'::jsonb;
  v_available jsonb := '[]'::jsonb;
begin
  if v_user is null then raise exception 'Anmeldung erforderlich' using errcode='42501'; end if;

  select ci.school_id,ci.school_year into v_school_id,v_school_year
  from public.class_instances ci where ci.id=p_class_id and ci.is_active=true;
  if v_school_id is null then raise exception 'Aktive Klasse nicht gefunden' using errcode='P0002'; end if;

  select sm.role into v_role from public.school_memberships sm
  where sm.school_id=v_school_id and sm.user_id=v_user and sm.active=true
    and sm.role in ('teacher','school_admin','school_lead')
  limit 1;
  if v_role is null then raise exception 'Keine aktive Schulmitgliedschaft' using errcode='42501'; end if;

  select exists(select 1 from public.teacher_class_subscriptions s
    where s.class_instance_id=p_class_id and s.teacher_user_id=v_user
      and s.school_year=v_school_year and s.is_active=true) into v_is_subscribed;

  if v_role='teacher' and not v_is_subscribed then
    raise exception 'Bitte abonniere diese Klasse zuerst' using errcode='42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',a.id,'module_id',a.module_id,'school_id',a.school_id,
    'assigned_by',a.assigned_by,'is_active',a.is_active,
    'scheduled_start_at',a.scheduled_start_at,'scheduled_end_at',a.scheduled_end_at,
    'title',tm.title,'description',coalesce(tm.description,''),
    'introTitle',tm.intro_title,'introText',tm.intro_text,
    'visibility_scope',tm.visibility_scope,
    'canManage',(tm.created_by=v_user),
    'title_card_enabled',(tm.title_card_enabled is distinct from false),
    'cover_image_url',null,'posts','[]'::jsonb
  ) order by a.assigned_at desc),'[]'::jsonb)
  into v_assigned
  from public.teacher_class_module_assignments a
  join public.teacher_modules tm on tm.id=a.module_id
  where a.class_instance_id=p_class_id and a.teacher_user_id=v_user
    and a.school_year=v_school_year and a.module_type='teacher_module'
    and a.is_active=true and a.archived_at is null and tm.status='published';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',tm.id,'module_id',tm.id,'title',tm.title,
    'description',coalesce(tm.description,''),'visibility_scope',tm.visibility_scope,'posts','[]'::jsonb
  ) order by tm.updated_at desc),'[]'::jsonb)
  into v_available
  from public.teacher_modules tm
  where tm.school_id=v_school_id and tm.status='published'
    and (tm.visibility_scope='school' or tm.created_by=v_user)
    and not exists (
      select 1 from public.teacher_class_module_assignments a
      where a.class_instance_id=p_class_id and a.teacher_user_id=v_user
        and a.module_type='teacher_module' and a.module_id=tm.id
        and a.is_active=true and a.archived_at is null
    );

  return jsonb_build_object('assigned',v_assigned,'available',v_available);
end;
$$;
revoke all on function public.get_teacher_module_library_for_class_v1(uuid) from public,anon;
grant execute on function public.get_teacher_module_library_for_class_v1(uuid) to authenticated;

