// apps/player/components/Skeleton.tsx
// Basis-Baustein + ein paar zusammengesetzte Skeletons, die die Form
// des tatsächlichen Contents nachbilden (statt generischer Spinner) —
// fühlt sich beim Laden weniger "leer" an.

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-ink-border/60 rounded ${className}`} />;
}

export function PostCardSkeleton() {
  return (
    <div className="bg-paper rounded-card overflow-hidden">
      <div className="p-4 pb-0 space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="w-full h-48 rounded-none" />
      <div className="p-4 pt-3 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <div className="flex gap-3 pt-3 mt-2 border-t border-ink/10">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-12" />
        </div>
      </div>
    </div>
  );
}

export function CommentSkeleton() {
  return (
    <div className="bg-ink/5 rounded-lg px-3 py-2 space-y-1.5">
      <Skeleton className="h-2.5 w-16" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <div className="flex items-center gap-4 mb-6">
      <Skeleton className="w-16 h-16 rounded-full shrink-0" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export function ListRowSkeleton() {
  return <Skeleton className="h-12 w-full rounded-card" />;
}
