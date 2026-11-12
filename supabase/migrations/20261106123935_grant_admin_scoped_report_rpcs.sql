-- The functions below are protected internally by can_view_class_individual_reports.
-- Grant authenticated invocation so school admins, school leadership and platform
-- admins can use the scoped report path; non-admin callers are rejected in-function.
grant execute on function public.get_class_student_learning_evidence(uuid) to authenticated;
grant execute on function public.get_class_student_learning_evidence_v1(uuid) to authenticated;
grant execute on function public.get_class_student_mission_progress(uuid) to authenticated;
grant execute on function public.get_teacher_student_activity_time_v1(uuid, uuid) to authenticated;
grant execute on function public.get_teacher_student_learning_journey_v1(uuid, uuid) to authenticated;
grant execute on function public.get_teacher_student_scenario_report_v1(uuid, uuid) to authenticated;
grant execute on function public.get_teacher_student_social_pulse_v1(uuid, uuid) to authenticated;
