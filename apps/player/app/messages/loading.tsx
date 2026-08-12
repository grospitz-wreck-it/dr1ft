// apps/player/app/messages/loading.tsx

import { ListRowSkeleton } from "../../components/Skeleton";

export default function MessagesLoading() {
  return (
    <main className="min-h-screen bg-ink">
      <header className="sticky top-0 z-10 bg-ink/90 backdrop-blur border-b border-ink-border safe-top px-4 py-3" />
      <div className="max-w-md mx-auto px-3 py-4 space-y-2">
        <ListRowSkeleton />
        <ListRowSkeleton />
        <ListRowSkeleton />
      </div>
    </main>
  );
}
