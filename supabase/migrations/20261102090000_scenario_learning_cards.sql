-- Independent scenario-level learning cards. These are deliberately separate
-- from content_items so they never appear as ordinary feed posts.
alter table public.scenarios
  add column if not exists learning_cards jsonb not null default '[]'::jsonb;

comment on column public.scenarios.learning_cards is
  'Ordered standalone learning cards for a scenario; independent from feed content_items.';
