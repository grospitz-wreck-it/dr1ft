// apps/player/app/feed/loading.tsx
// Next.js zeigt das automatisch, solange page.tsx (Server Component)
// noch Daten lädt — kein manueller Loading-State nötig.

import { PostCardSkeleton } from "../../components/Skeleton";

export default function FeedLoading() {
  return (
    <main className="min-h-screen bg-ink">
      <header className="sticky top-0 z-10 bg-ink/90 backdrop-blur border-b border-ink-border safe-top px-4 py-3">
        <p className="font-display text-paper text-lg tracking-tight">DR1FT</p>
      </header>
      <div className="md:max-w-4xl md:mx-auto md:grid md:grid-cols-[1fr_280px] md:gap-8 md:px-6 md:py-6">
        <div className="max-w-md mx-auto md:max-w-none py-4 px-3 md:px-0 space-y-4">
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
        <div className="hidden md:block" />
      </div>
    </main>
  );
}
