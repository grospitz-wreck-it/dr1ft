// apps/player/app/creator/[creatorId]/loading.tsx

import { ProfileHeaderSkeleton, PostCardSkeleton } from "../../../components/Skeleton";

export default function CreatorLoading() {
  return (
    <main className="min-h-screen bg-ink">
      <header className="sticky top-0 z-10 bg-ink/90 backdrop-blur border-b border-ink-border safe-top px-4 py-3" />
      <div className="max-w-md mx-auto px-3 py-6">
        <ProfileHeaderSkeleton />
        <div className="space-y-4">
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      </div>
    </main>
  );
}
