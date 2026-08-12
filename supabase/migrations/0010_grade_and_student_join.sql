-- ============================================================
-- DR1FT — Jahrgang + Schüler-Beitritt
--
-- Hierarchie wie gefordert: Schule -> Jahrgang -> Klasse -> Schüler:in.
-- "Jahrgang" wird bewusst NICHT als eigene Tabelle modelliert, sondern
-- als grade_level (int) direkt an classes — spart einen Join für den
-- Normalfall, erlaubt aber weiterhin Jahrgangs-Auswertungen per
-- "group by school_id, grade_level".
-- ============================================================

alter table classes add column grade_level int;

-- Schüler:innen melden sich per Zugangscode + selbstgewähltem
-- Nutzernamen an (siehe apps/player/app/join) — KEIN Klarname, KEINE
-- echte E-Mail nötig. Diese Funktion verknüpft die bereits über
-- supabase.auth.signUp() angelegte Auth-Identität (auth.uid()) mit
-- Klasse + Profil.
create or replace function join_class_as_student(
  p_access_code text,
  p_display_name text
)
returns uuid -- gibt die class_id zurück
language plpgsql
security definer
as $$
declare
  v_class_id uuid;
begin
  select id into v_class_id
    from classes
    where access_code = upper(p_access_code) and is_active = true;

  if v_class_id is null then
    raise exception 'Ungültiger oder inaktiver Zugangscode';
  end if;

  insert into user_profiles (id, display_name)
  values (auth.uid(), p_display_name)
  on conflict (id) do update set display_name = excluded.display_name;

  insert into class_memberships (class_id, user_id, role)
  values (v_class_id, auth.uid(), 'student')
  on conflict (class_id, user_id) do nothing;

  return v_class_id;
end;
$$;
