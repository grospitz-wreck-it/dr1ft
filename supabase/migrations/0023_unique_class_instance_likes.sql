-- A student can like a content item at most once within a class instance.
-- Other interaction types (especially views) remain append-only analytics events.
create unique index if not exists uq_user_interactions_class_like
  on public.user_interactions(class_instance_id, user_id, content_item_id)
  where interaction_type = 'like' and class_instance_id is not null;
