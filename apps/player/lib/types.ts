// apps/player/lib/types.ts

import type { ContentItem } from "@dr1ft/shared-types";

export interface CreatorSummary {
  id: string;
  displayName: string;
  handle: string;
  avatarUrl?: string | null;
}

export interface FeedItem extends ContentItem {
  creator?: CreatorSummary;
}

export function mapCreatorRow(row: any): CreatorSummary | undefined {
  if (!row) return undefined;
  return {
    id: row.id,
    displayName: row.display_name,
    handle: row.handle,
    avatarUrl: row.avatar_url,
  };
}
