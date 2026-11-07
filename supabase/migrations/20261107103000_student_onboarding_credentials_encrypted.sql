-- Encrypted storage for initial student credentials used by printable onboarding sheets.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'dr1ft_student_onboarding_key') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'dr1ft_student_onboarding_key',
      'Encryption key for DR1FT student onboarding credentials'
    );
  end if;
end;
$$;

create table if not exists public.student_onboarding_credentials (
  student_user_id uuid primary key references auth.users(id) on delete cascade,
  class_instance_id uuid not null references public.class_instances(id) on delete cascade,
  username text not null,
  password_ciphertext bytea not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists student_onboarding_credentials_class_idx on public.student_onboarding_credentials(class_instance_id);
alter table public.student_onboarding_credentials enable row level security;
revoke all on public.student_onboarding_credentials from anon, authenticated;
grant all on public.student_onboarding_credentials to service_role;

create or replace function public.store_student_onboarding_credential(
  p_class_id uuid, p_student_user_id uuid, p_username text, p_password text, p_created_by uuid
) returns void
language plpgsql security definer
set search_path = public, vault, extensions, pg_temp
as $$
declare v_key text;
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required'; end if;
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'dr1ft_student_onboarding_key' limit 1;
  if v_key is null then raise exception 'Onboarding encryption key unavailable'; end if;
  insert into public.student_onboarding_credentials(student_user_id,class_instance_id,username,password_ciphertext,created_by)
  values(p_student_user_id,p_class_id,p_username,extensions.pgp_sym_encrypt(p_password,v_key),p_created_by)
  on conflict(student_user_id) do update set class_instance_id=excluded.class_instance_id,username=excluded.username,
    password_ciphertext=excluded.password_ciphertext,created_by=excluded.created_by,updated_at=now();
end;
$$;
revoke all on function public.store_student_onboarding_credential(uuid,uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.store_student_onboarding_credential(uuid,uuid,text,text,uuid) to service_role;

create or replace function public.get_class_onboarding_credentials(p_class_id uuid)
returns table(class_access_code text,student_user_id uuid,display_name text,username text,password text)
language plpgsql stable security definer
set search_path = public, vault, extensions, pg_temp
as $$
declare v_user_id uuid:=auth.uid(); v_school_id uuid; v_key text; v_allowed boolean:=false;
begin
  if v_user_id is null then raise exception 'Nicht authentifiziert'; end if;
  select ci.school_id into v_school_id from public.class_instances ci where ci.id=p_class_id and ci.is_active=true;
  if not found then raise exception 'Klasseninstanz nicht gefunden oder inaktiv'; end if;
  select exists(
    select 1 from public.class_instance_memberships cim
    join public.teacher_class_subscriptions tcs on tcs.class_instance_id=cim.class_instance_id
      and tcs.teacher_user_id=v_user_id and tcs.is_active=true
    where cim.class_instance_id=p_class_id and cim.user_id=v_user_id and cim.role='teacher' and cim.left_at is null
  ) or exists(
    select 1 from public.school_memberships sm where sm.school_id=v_school_id and sm.user_id=v_user_id
      and sm.active=true and sm.role='school_admin'
  ) into v_allowed;
  if not v_allowed then raise exception 'Keine Berechtigung zum Drucken der Zugangsdaten'; end if;
  select decrypted_secret into v_key from vault.decrypted_secrets where name='dr1ft_student_onboarding_key' limit 1;
  if v_key is null then raise exception 'Onboarding encryption key unavailable'; end if;
  return query
  select ci.access_code,c.student_user_id,up.display_name,c.username,extensions.pgp_sym_decrypt(c.password_ciphertext,v_key)
  from public.student_onboarding_credentials c
  join public.class_instance_memberships cim on cim.class_instance_id=c.class_instance_id
    and cim.user_id=c.student_user_id and cim.role='student' and cim.left_at is null
  join public.class_instances ci on ci.id=c.class_instance_id
  left join public.user_profiles up on up.id=c.student_user_id
  where c.class_instance_id=p_class_id
  order by coalesce(up.display_name,c.username),c.username;
end;
$$;
revoke all on function public.get_class_onboarding_credentials(uuid) from public,anon;
grant execute on function public.get_class_onboarding_credentials(uuid) to authenticated;
