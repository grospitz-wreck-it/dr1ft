-- DR1FT: pin search_path for all remaining functions flagged by the
-- Supabase function_search_path_mutable advisor on 2026-11-06.
--
-- pg_catalog comes first so built-ins cannot be shadowed by public objects.
-- public and auth remain available for the existing unqualified table/helper
-- references. pg_temp is explicitly last for SECURITY DEFINER safety.
--
-- No function bodies, signatures, grants, or business logic are changed.

alter function public.compute_competency_level(integer)
  set search_path = pg_catalog, public, auth, pg_temp;

alter function public.count_matching_interactions(uuid, uuid)
  set search_path = pg_catalog, public, auth, pg_temp;

alter function public.count_matching_interactions(uuid, uuid, uuid)
  set search_path = pg_catalog, public, auth, pg_temp;

alter function public.get_grade_class_overview(uuid, integer)
  set search_path = pg_catalog, public, auth, pg_temp;

alter function public.get_grade_competency_overview(uuid, integer)
  set search_path = pg_catalog, public, auth, pg_temp;

alter function public.get_grade_mission_overview(uuid, integer)
  set search_path = pg_catalog, public, auth, pg_temp;

alter function public.is_platform_staff()
  set search_path = pg_catalog, public, auth, pg_temp;

alter function public.is_teacher_of_class(uuid)
  set search_path = pg_catalog, public, auth, pg_temp;

alter function public.is_teacher_of_grade(uuid, integer)
  set search_path = pg_catalog, public, auth, pg_temp;

alter function public.join_class_as_student(text, text)
  set search_path = pg_catalog, public, auth, pg_temp;

alter function public.mission_event_to_interaction_type(text)
  set search_path = pg_catalog, public, auth, pg_temp;

alter function public.set_learning_updated_at()
  set search_path = pg_catalog, public, auth, pg_temp;

alter function public.unlock_mission_for_user(uuid, uuid, integer)
  set search_path = pg_catalog, public, auth, pg_temp;
