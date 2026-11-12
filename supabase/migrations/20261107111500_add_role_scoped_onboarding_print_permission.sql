create or replace function public.can_print_class_onboarding_credentials(p_class_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp
as $$
select exists(select 1 from public.class_instances ci join public.school_memberships sm on sm.school_id=ci.school_id and sm.user_id=auth.uid() and sm.active=true and sm.role='school_admin' where ci.id=p_class_id and ci.is_active=true)
or exists(select 1 from public.class_instances ci join public.class_instance_memberships cim on cim.class_instance_id=ci.id and cim.user_id=auth.uid() and cim.role='teacher' and cim.left_at is null join public.teacher_class_subscriptions tcs on tcs.class_instance_id=ci.id and tcs.teacher_user_id=auth.uid() and tcs.is_active=true where ci.id=p_class_id and ci.is_active=true and not exists(select 1 from public.class_instance_teacher_roles ctr where ctr.class_instance_id=ci.id and ctr.teacher_user_id=auth.uid() and ctr.role='class_teacher' and ctr.is_active=true));
$$;
revoke all on function public.can_print_class_onboarding_credentials(uuid) from public,anon;
grant execute on function public.can_print_class_onboarding_credentials(uuid) to authenticated;
create or replace function public.get_class_onboarding_credentials(p_class_id uuid)
returns table(class_access_code text,student_user_id uuid,display_name text,username text,password text)
language plpgsql stable security definer set search_path=public,vault,extensions,pg_temp
as $$
declare v_key text;
begin
if auth.uid() is null then raise exception 'Nicht authentifiziert'; end if;
if not public.can_print_class_onboarding_credentials(p_class_id) then raise exception 'Nur Fachlehrkräfte und Schuladmins dürfen Zugangsdaten drucken'; end if;
select decrypted_secret into v_key from vault.decrypted_secrets where name='dr1ft_student_onboarding_key' limit 1;
if v_key is null then raise exception 'Onboarding encryption key unavailable'; end if;
return query select ci.access_code,c.student_user_id,up.display_name,c.username,extensions.pgp_sym_decrypt(c.password_ciphertext,v_key)
from public.student_onboarding_credentials c join public.class_instance_memberships cim on cim.class_instance_id=c.class_instance_id and cim.user_id=c.student_user_id and cim.role='student' and cim.left_at is null
join public.class_instances ci on ci.id=c.class_instance_id left join public.user_profiles up on up.id=c.student_user_id
where c.class_instance_id=p_class_id and ci.is_active=true order by coalesce(up.display_name,c.username),c.username;
end;
$$;
revoke all on function public.get_class_onboarding_credentials(uuid) from public,anon;
grant execute on function public.get_class_onboarding_credentials(uuid) to authenticated;