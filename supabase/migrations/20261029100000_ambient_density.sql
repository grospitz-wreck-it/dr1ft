-- Per-scenario control for the amount of global ambient posts in the learner feed.
-- Existing scenes default to a balanced feed; teachers can adjust this later in the Scene Editor.
alter table public.scenarios
  add column if not exists ambient_density text not null default 'medium'
  check (ambient_density in ('off', 'low', 'medium', 'high'));

comment on column public.scenarios.ambient_density is
  'Controls the density of scenario-independent ambient posts in the player feed: off, low, medium, or high.';
