// apps/player/app/messages/[creatorId]/loading.tsx

import { Skeleton } from "../../../components/Skeleton";

export default function DmLoading() {
  return (
    <main className="min-h-screen bg-ink">
      <header className="sticky top-0 z-10 bg-ink/90 backdrop-blur border-b border-ink-border safe-top px-4 py-3" />
      <div className="max-w-md mx-auto px-3 py-4">
        <Skeleton className="h-24 w-full rounded-card" />
        <div className="space-y-2 mt-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </main>
  );
}
