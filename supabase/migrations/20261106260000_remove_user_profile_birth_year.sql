-- DR1FT: Remove the unused birth-year field from student profiles.
-- Age suitability is handled through content age ratings and class configuration;
-- individual birth years are not required by the current application.

alter table public.user_profiles
  drop column if exists birth_year;
