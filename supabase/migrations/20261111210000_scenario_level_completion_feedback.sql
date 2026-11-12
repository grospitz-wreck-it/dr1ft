-- Scenario-level completion feedback and configurable progress thresholds.
-- Additive only; existing scenario assignments and assessment snapshots are untouched.
alter table public.scenarios
  add column if not exists completion_feedback jsonb not null
  default jsonb_build_object(
    'low_threshold_percent', 25,
    'middle_threshold_percent', 75,
    'low_message', 'Bist du sicher? Du hast bisher kaum etwas entdeckt. Schau dich noch einmal um.',
    'middle_message', 'Willst du DR1FT wirklich schon beenden? Es gibt noch Hinweise zu finden.',
    'high_message', 'Du hast das Thema bereits gut erfasst. Deine Auswertung wird jetzt erstellt.'
  );

comment on column public.scenarios.completion_feedback is
  'Scenario-level student completion messages and progress thresholds. Thresholds are percentages of the required, scoreable requirements captured by the assignment snapshot; never competency levels.';
