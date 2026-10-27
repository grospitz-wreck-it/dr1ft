-- Teacher class status + private class images

alter table public.class_instances
  add column if not exists status text not null default 'active';

update public.class_instances
set status = case
  when is_active then 'active'
  else 'paused'
end
where status is null
   or status not in ('active', 'paused', 'ended');

alter table public.class_instances
  drop constraint if exists class_instances_status_check;

alter table public.class_instances
  add constraint class_instances_status_check
  check (status in ('active', 'paused', 'ended'));

alter table public.class_instances
  add column if not exists class_image_path text,
  add column if not exists class_image_position_x numeric not null default 50,
  add column if not exists class_image_position_y numeric not null default 50,
  add column if not exists class_image_zoom numeric not null default 1;

insert into storage.buckets (id, name, public)
values ('class-images', 'class-images', false)
on conflict (id) do update set public = false;

create or replace function public.can_manage_class_image(object_name text)
returns boolean
language sql
security definer
stable
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.class_instance_memberships cim
    where cim.class_instance_id::text = split_part(object_name, '/', 1)
      and cim.user_id = auth.uid()
      and cim.left_at is null
      and cim.role = 'teacher'
  );
$$;

drop policy if exists "class_images_select_teacher" on storage.objects;

create policy "class_images_select_teacher"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'class-images'
  and public.can_manage_class_image(name)
);

drop policy if exists "class_images_insert_teacher" on storage.objects;

create policy "class_images_insert_teacher"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'class-images'
  and public.can_manage_class_image(name)
);

drop policy if exists "class_images_update_teacher" on storage.objects;

create policy "class_images_update_teacher"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'class-images'
  and public.can_manage_class_image(name)
)
with check (
  bucket_id = 'class-images'
  and public.can_manage_class_image(name)
);

drop policy if exists "class_images_delete_teacher" on storage.objects;

create policy "class_images_delete_teacher"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'class-images'
  and public.can_manage_class_image(name)
);
