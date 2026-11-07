create or replace function public.clear_student_onboarding_credential_after_password_change()
returns trigger language plpgsql security definer set search_path=public,pg_temp
as $$
begin
  if old.encrypted_password is distinct from new.encrypted_password then
    delete from public.student_onboarding_credentials where student_user_id=new.id;
  end if;
  return new;
end;
$$;
revoke all on function public.clear_student_onboarding_credential_after_password_change() from public,anon,authenticated;
drop trigger if exists clear_student_onboarding_credential_after_password_change on auth.users;
create trigger clear_student_onboarding_credential_after_password_change
after update of encrypted_password on auth.users
for each row when (old.encrypted_password is distinct from new.encrypted_password)
execute function public.clear_student_onboarding_credential_after_password_change();