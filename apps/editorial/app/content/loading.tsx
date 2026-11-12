export default function ContentLibraryLoading() {
  return (
    <main className="min-w-0 animate-pulse space-y-5">
      <header className="space-y-3">
        <div className="h-6 w-40 rounded-full bg-slate-200" />
        <div className="h-9 w-72 max-w-full rounded bg-slate-200" />
        <div className="h-4 w-96 max-w-full rounded bg-slate-200" />
      </header>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="h-10 rounded-lg bg-slate-100 md:col-span-2" />
          <div className="h-10 rounded-lg bg-slate-100" />
          <div className="h-10 rounded-lg bg-slate-100" />
          <div className="h-10 rounded-lg bg-slate-100" />
          <div className="h-10 rounded-lg bg-slate-100" />
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 border-b border-slate-100 p-4">
            <div className="h-14 w-14 shrink-0 rounded-lg bg-slate-100" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-slate-100" />
              <div className="h-3 w-1/3 rounded bg-slate-100" />
            </div>
            <div className="hidden h-6 w-24 rounded-full bg-slate-100 sm:block" />
          </div>
        ))}
      </section>
    </main>
  );
}
