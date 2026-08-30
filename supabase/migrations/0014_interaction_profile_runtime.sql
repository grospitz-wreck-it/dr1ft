-- ============================================================
-- DR1FT — Interaction Profile Runtime Bridge
-- Materialisiert die effektive Interaktionsbewertung beim Event.
-- Dadurch bleibt die Redaktion bei Defaults, während Analytics/
-- Consequence-Engine eine stabile Event-Snapshot-Bewertung erhalten.
-- ============================================================

create or replace function enrich_interaction_metadata()
returns trigger
language plpgsql
security definer
as $$
declare
  v_profile record;
  v_overrides jsonb;
  v_effective jsonb;
begin
  select ip.key, ip.label, ip.dimensions
    into v_profile
  from content_items ci
  left join interaction_profiles ip on ip.id = ci.interaction_profile_id
  where ci.id = new.content_item_id;

  if v_profile.key is null then
    return new;
  end if;

  v_overrides := coalesce(
    (select interaction_overrides from content_items where id = new.content_item_id),
    '{}'::jsonb
  );

  v_effective := coalesce(v_profile.dimensions, '{}'::jsonb) || v_overrides;

  new.metadata := coalesce(new.metadata, '{}'::jsonb) || jsonb_build_object(
    'interaction_profile_key', v_profile.key,
    'interaction_profile_label', v_profile.label,
    'profile_dimensions', coalesce(v_profile.dimensions, '{}'::jsonb),
    'interaction_overrides', v_overrides,
    'effective_dimensions', v_effective
  );

  return new;
end;
$$;

create trigger trg_enrich_interaction_metadata
  before insert on user_interactions
  for each row
  execute function enrich_interaction_metadata();
