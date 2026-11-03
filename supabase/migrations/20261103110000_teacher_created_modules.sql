-- DR1FT Teacher-created modules (MVP)
-- Strict tenant isolation: a module is only visible through an explicit
-- class-instance assignment. School IDs are checked against the target instance.

create table if not exists public.teacher_modules (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 1 and 120),
  description text not null default '',
  cover_asset_path text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teacher_modules_school_status_idx
  on public.teacher_modules(school_id, status, updated_at desc);

create table if not exists public.teacher_module_class_assignments (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.teacher_modules(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  class_instance_id uuid not null references public.class_instances(id) on delete cascade,
  assigned_by uuid not null references auth.users(id) on delete restrict,
  is_active boolean not null default true,
  assigned_at timestamptz not null default now(),
  unique(module_id, class_instance_id)
);

create index if not exists teacher_module_assignments_class_idx
  on public.teacher_module_class_assignments(class_instance_id, is_active);

create table if not exists public.teacher_module_posts (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.teacher_modules(id) on delete cascade,
  post_type text not null default 'text' check (post_type in ('text','image','embed','mixed')),
  title text not null default '',
  body text not null default '',
  image_path text,
  embed_provider text,
  embed_url text,
  sort_order integer not null default 0,
  status text not null default 'published' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_module_embed_provider_check
    check (embed_provider is null or embed_provider in ('youtube','vimeo')),
  constraint teacher_module_embed_pair_check
    check ((embed_provider is null and embed_url is null) or (embed_provider is not null and embed_url is not null))
);

create index if not exists teacher_module_posts_order_idx
  on public.teacher_module_posts(module_id, sort_order, created_at);

create or replace function public.teacher_module_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists teacher_modules_touch_updated_at on public.teacher_modules;
create trigger teacher_modules_touch_updated_at
before update on public.teacher_modules
for each row execute function public.teacher_module_touch_updated_at();

drop trigger if exists teacher_module_posts_touch_updated_at on public.teacher_module_posts;
create trigger teacher_module_posts_touch_updated_at
before update on public.teacher_module_posts
for each row execute function public.teacher_module_touch_updated_at();

-- Prevent cross-school assignment even if a client submits mismatched IDs.
create or replace function public.validate_teacher_module_class_assignment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_module_school uuid;
  v_class_school uuid;
begin
  select school_id into v_module_school
  from public.teacher_modules where id = new.module_id;

  select school_id into v_class_school
  from public.class_instances where id = new.class_instance_id;

  if v_module_school is null or v_class_school is null or v_module_school <> v_class_school
     or new.school_id <> v_module_school then
    raise exception 'Teacher module and class must belong to the same school';
  end if;

  return new;
end;
$$;

drop trigger if exists teacher_module_assignment_school_guard on public.teacher_module_class_assignments;
create trigger teacher_module_assignment_school_guard
before insert or update on public.teacher_module_class_assignments
for each row execute function public.validate_teacher_module_class_assignment();

alter table public.teacher_modules enable row level security;
alter table public.teacher_module_class_assignments enable row level security;
alter table public.teacher_module_posts enable row level security;

-- Creators can manage their own modules only while they are active teachers
-- in the module's school. No platform/editorial staff bypass is granted.
drop policy if exists teacher_modules_creator_manage on public.teacher_modules;
create policy teacher_modules_creator_manage
on public.teacher_modules for all to authenticated
using (
  created_by = auth.uid()
  and exists (
    select 1 from public.school_memberships sm
    where sm.school_id = teacher_modules.school_id
      and sm.user_id = auth.uid()
      and sm.active = true
  )
)
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.school_memberships sm
    where sm.school_id = teacher_modules.school_id
      and sm.user_id = auth.uid()
      and sm.active = true
  )
);

-- Teachers can see a module only if assigned to one of their current class instances.
drop policy if exists teacher_modules_assigned_class_read on public.teacher_modules;
create policy teacher_modules_assigned_class_read
on public.teacher_modules for select to authenticated
using (
  status = 'published'
  and exists (
    select 1
    from public.teacher_module_class_assignments a
    join public.class_instance_memberships cim
      on cim.class_instance_id = a.class_instance_id
    where a.module_id = teacher_modules.id
      and a.is_active = true
      and cim.user_id = auth.uid()
      and cim.left_at is null
  )
);

drop policy if exists teacher_module_assignments_members_read on public.teacher_module_class_assignments;
create policy teacher_module_assignments_members_read
on public.teacher_module_class_assignments for select to authenticated
using (
  exists (
    select 1 from public.class_instance_memberships cim
    where cim.class_instance_id = teacher_module_class_assignments.class_instance_id
      and cim.user_id = auth.uid()
      and cim.left_at is null
  )
);

drop policy if exists teacher_module_assignments_teacher_manage on public.teacher_module_class_assignments;
create policy teacher_module_assignments_teacher_manage
on public.teacher_module_class_assignments for all to authenticated
using (
  assigned_by = auth.uid()
  and exists (
    select 1 from public.class_instance_memberships cim
    where cim.class_instance_id = teacher_module_class_assignments.class_instance_id
      and cim.user_id = auth.uid()
      and cim.role in ('teacher','school_admin')
      and cim.left_at is null
  )
)
with check (
  assigned_by = auth.uid()
  and exists (
    select 1 from public.class_instance_memberships cim
    where cim.class_instance_id = teacher_module_class_assignments.class_instance_id
      and cim.user_id = auth.uid()
      and cim.role in ('teacher','school_admin')
      and cim.left_at is null
  )
);

drop policy if exists teacher_module_posts_creator_manage on public.teacher_module_posts;
create policy teacher_module_posts_creator_manage
on public.teacher_module_posts for all to authenticated
using (
  exists (
    select 1 from public.teacher_modules m
    where m.id = teacher_module_posts.module_id
      and m.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.teacher_modules m
    where m.id = teacher_module_posts.module_id
      and m.created_by = auth.uid()
  )
);

drop policy if exists teacher_module_posts_assigned_read on public.teacher_module_posts;
create policy teacher_module_posts_assigned_read
on public.teacher_module_posts for select to authenticated
using (
  exists (
    select 1
    from public.teacher_modules m
    join public.teacher_module_class_assignments a on a.module_id = m.id
    join public.class_instance_memberships cim on cim.class_instance_id = a.class_instance_id
    where m.id = teacher_module_posts.module_id
      and m.status = 'published'
      and a.is_active = true
      and cim.user_id = auth.uid()
      and cim.left_at is null
  )
);

-- Private assets. Object path: <school_id>/<module_id>/<filename>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('teacher-module-assets', 'teacher-module-assets', false, 10485760, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

drop policy if exists teacher_module_assets_read on storage.objects;
create policy teacher_module_assets_read
on storage.objects for select to authenticated
using (
  bucket_id = 'teacher-module-assets'
  and exists (
    select 1
    from public.teacher_modules m
    where m.id::text = (storage.foldername(name))[2]
      and m.school_id::text = (storage.foldername(name))[1]
      and (
        m.created_by = auth.uid()
        or exists (
          select 1
          from public.teacher_module_class_assignments a
          join public.class_instance_memberships cim on cim.class_instance_id = a.class_instance_id
          where a.module_id = m.id and a.is_active = true
            and cim.user_id = auth.uid() and cim.left_at is null
        )
      )
  )
);

drop policy if exists teacher_module_assets_insert on storage.objects;
create policy teacher_module_assets_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'teacher-module-assets'
  and exists (
    select 1 from public.teacher_modules m
    where m.id::text = (storage.foldername(name))[2]
      and m.school_id::text = (storage.foldername(name))[1]
      and m.created_by = auth.uid()
  )
);

drop policy if exists teacher_module_assets_update on storage.objects;
create policy teacher_module_assets_update
on storage.objects for update to authenticated
using (
  bucket_id = 'teacher-module-assets'
  and exists (
    select 1 from public.teacher_modules m
    where m.id::text = (storage.foldername(name))[2] and m.created_by = auth.uid()
  )
)
with check (
  bucket_id = 'teacher-module-assets'
  and exists (
    select 1 from public.teacher_modules m
    where m.id::text = (storage.foldername(name))[2] and m.created_by = auth.uid()
  )
);

drop policy if exists teacher_module_assets_delete on storage.objects;
create policy teacher_module_assets_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'teacher-module-assets'
  and exists (
    select 1 from public.teacher_modules m
    where m.id::text = (storage.foldername(name))[2] and m.created_by = auth.uid()
  )
);
