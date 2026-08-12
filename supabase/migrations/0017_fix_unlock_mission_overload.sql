-- ============================================================
-- DR1FT — Korrektur: doppelte Funktionsüberladung auflösen
--
-- BEFUND (interne Konsistenzprüfung des Repos): 0007 definierte
-- unlock_mission_for_user(uuid, uuid). 0013 hat für den Pacing-Modus
-- eine NEUE Version mit drittem Parameter (p_delay_hours default 0)
-- angelegt — `create or replace function` ersetzt in Postgres aber nur
-- Funktionen mit IDENTISCHER Signatur. Da sich die Parameterliste
-- geändert hat, entstand eine zusätzliche Überladung statt eines
-- echten Ersatzes: die alte 2-Parameter-Version blieb bestehen.
--
-- Auswirkung: start_arc_for_user() (aus 0007, in 0013 nicht neu
-- definiert) ruft unlock_mission_for_user() weiterhin mit zwei
-- Argumenten auf. Postgres bevorzugt bei der Funktions-Auflösung eine
-- exakte Parameteranzahl-Übereinstimmung gegenüber einer Version mit
-- Default-Wert — der Aufruf landete also bei der ALTEN Funktion.
-- Funktional harmlos (available_at bekommt einfach den Spalten-Default
-- now(), was ohnehin "sofort" bedeutet), aber zwei parallele
-- Implementierungen derselben Sache sind ein Wartungsrisiko.
--
-- Lösung: alte Überladung entfernen, start_arc_for_user() explizit auf
-- die neue Signatur ausrichten (Verzögerung 0 für den allerersten
-- Schritt einer Arc — der Einstieg soll immer sofort verfügbar sein).
-- ============================================================

drop function if exists unlock_mission_for_user(uuid, uuid);

create or replace function start_arc_for_user(p_user_id uuid, p_arc_id uuid)
returns void
language plpgsql
as $$
declare
  v_first_mission_id uuid;
begin
  insert into user_story_arc_progress (user_id, arc_id, current_step_index, status)
  values (p_user_id, p_arc_id, 0, 'in_progress')
  on conflict (user_id, arc_id) do nothing;

  select mission_id into v_first_mission_id
    from story_arc_steps
    where arc_id = p_arc_id and order_index = 0;

  if v_first_mission_id is not null then
    perform unlock_mission_for_user(p_user_id, v_first_mission_id, 0);
  end if;
end;
$$;
