-- ============================================================
-- DR1FT — Restore interaction profile runtime
-- Forward migration for remote databases where the historical
-- interaction-profile migration was never applied.
-- ============================================================

create table if not exists public.interaction_profiles (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  label text not null,
  description text,
  interaction_type text not null,
  dimensions jsonb not null default '{}',
  default_consequence jsonb not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.content_items
  add column if not exists interaction_profile_id uuid
    references public.interaction_profiles(id)
    on delete set null;

alter table public.content_items
  add column if not exists interaction_overrides jsonb
    not null default '{}';

create index if not exists idx_content_items_interaction_profile
  on public.content_items(interaction_profile_id);

alter table public.interaction_profiles enable row level security;

drop policy if exists "authenticated read interaction profiles"
  on public.interaction_profiles;

create policy "authenticated read interaction profiles"
  on public.interaction_profiles
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "staff manage interaction profiles"
  on public.interaction_profiles;

create policy "staff manage interaction profiles"
  on public.interaction_profiles
  for all
  using (is_platform_staff());

insert into public.interaction_profiles
  (key, label, description, interaction_type, dimensions, default_consequence)
values
  ('view', 'Ansehen', 'Content öffnen und konsumieren.', 'view',
   '{"risk":1,"impulsivity":0,"social_pressure":0,"source_awareness":0,"difficulty":1}',
   '{"attention":1}'),
  ('open_link', 'Link öffnen', 'Einen externen oder eingebetteten Link öffnen.', 'open_link',
   '{"risk":2,"impulsivity":1,"social_pressure":0,"source_awareness":-1,"difficulty":2}',
   '{"exposure":1}'),
  ('like', 'Gefällt mir', 'Einen Beitrag positiv markieren.', 'like',
   '{"risk":1,"impulsivity":1,"social_pressure":2,"source_awareness":0,"difficulty":1}',
   '{"social_signal":1}'),
  ('share', 'Teilen', 'Content an andere Personen weitergeben.', 'share',
   '{"risk":2,"impulsivity":2,"social_pressure":3,"source_awareness":-1,"difficulty":3}',
   '{"amplification":1}'),
  ('comment', 'Kommentieren', 'Einen eigenen Kommentar veröffentlichen.', 'comment',
   '{"risk":2,"impulsivity":2,"social_pressure":2,"source_awareness":0,"difficulty":3}',
   '{"participation":1}'),
  ('check_source', 'Quelle prüfen', 'Quelle, Beleg oder Kontext aktiv prüfen.', 'check_source',
   '{"risk":-2,"impulsivity":-2,"social_pressure":-1,"source_awareness":3,"difficulty":3}',
   '{"critical_check":1}'),
  ('report', 'Melden', 'Problematischen oder zweifelhaften Content melden.', 'report',
   '{"risk":-2,"impulsivity":-1,"social_pressure":-1,"source_awareness":2,"difficulty":3}',
   '{"protective_action":1}'),
  ('ignore', 'Ignorieren', 'Content bewusst nicht weiter verfolgen.', 'ignore',
   '{"risk":-1,"impulsivity":-1,"social_pressure":-1,"source_awareness":1,"difficulty":2}',
   '{"avoidance":1}')
on conflict (key) do nothing;

create or replace function public.enrich_interaction_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_overrides jsonb;
  v_effective jsonb;
begin
  select ip.key, ip.label, ip.dimensions
    into v_profile
  from public.content_items ci
  left join public.interaction_profiles ip
    on ip.id = ci.interaction_profile_id
  where ci.id = new.content_item_id;

  if v_profile.key is null then
    return new;
  end if;

  v_overrides := coalesce(
    (select interaction_overrides
     from public.content_items
     where id = new.content_item_id),
    '{}'::jsonb
  );

  v_effective := coalesce(v_profile.dimensions, '{}'::jsonb)
    || v_overrides;

  new.metadata := coalesce(new.metadata, '{}'::jsonb)
    || jsonb_build_object(
      'interaction_profile_key', v_profile.key,
      'interaction_profile_label', v_profile.label,
      'profile_dimensions', coalesce(v_profile.dimensions, '{}'::jsonb),
      'interaction_overrides', v_overrides,
      'effective_dimensions', v_effective
    );

  return new;
end;
$$;

drop trigger if exists trg_enrich_interaction_metadata
  on public.user_interactions;

create trigger trg_enrich_interaction_metadata
  before insert on public.user_interactions
  for each row
  execute function public.enrich_interaction_metadata();
