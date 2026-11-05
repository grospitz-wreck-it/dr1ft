create or replace function public.set_class_instance_visual(
  p_class_id uuid,
  p_visual_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_school_id uuid;
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception 'Nicht authentifiziert';
  end if;

  if p_visual_id not in ('aurora', 'nebula', 'ocean', 'sunrise', 'forest', 'cosmos', 'spectrum', 'glacier') then
    raise exception 'Ungültiges Klassenmotiv';
  end if;

  select school_id into target_school_id
    from public.class_instances
   where id = p_class_id;

  if not found then
    raise exception 'Klasse nicht gefunden';
  end if;

  if not (
    exists (
      select 1 from public.class_instance_memberships cim
       where cim.class_instance_id = p_class_id
         and cim.user_id = actor_id
         and cim.role = 'teacher'
         and cim.left_at is null
    )
    or exists (
      select 1 from public.school_memberships sm
       where sm.school_id = target_school_id
         and sm.user_id = actor_id
         and sm.role = 'school_admin'
         and sm.active = true
    )
  ) then
    raise exception 'Keine Berechtigung, das Klassenmotiv zu ändern';
  end if;

  update public.class_instances
     set class_visual_id = p_visual_id
   where id = p_class_id;
end;
$$;

revoke all on function public.set_class_instance_visual(uuid, text) from public;
revoke all on function public.set_class_instance_visual(uuid, text) from anon;
grant execute on function public.set_class_instance_visual(uuid, text) to authenticated;
