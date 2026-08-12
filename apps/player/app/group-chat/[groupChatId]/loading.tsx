// apps/player/app/group-chat/[groupChatId]/loading.tsx

import { Skeleton } from "../../../components/Skeleton";

export default function GroupChatLoading() {
  return (
    <main className="min-h-screen bg-ink">
      <header className="sticky top-0 z-10 bg-ink/90 backdrop-blur border-b border-ink-border safe-top px-4 py-3" />
      <div className="max-w-md mx-auto px-3 py-4 space-y-3">
        <Skeleton className="h-14 w-[70%] rounded-card" />
        <Skeleton className="h-10 w-[50%] rounded-card ml-auto" />
        <Skeleton className="h-14 w-[65%] rounded-card" />
      </div>
    </main>
  );
}
