export default function AmbientContentLoading() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-6">
      <div className="mx-auto max-w-7xl space-y-6 animate-pulse">
        <div className="space-y-3">
          <div className="h-3 w-32 rounded bg-slate-200" />
          <div className="h-9 w-80 max-w-full rounded bg-slate-200" />
          <div className="h-4 w-[34rem] max-w-full rounded bg-slate-200" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="h-5 w-40 rounded bg-slate-200" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-11 rounded-xl bg-slate-100" />
            <div className="h-11 rounded-xl bg-slate-100" />
            <div className="h-11 rounded-xl bg-slate-100" />
            <div className="h-11 rounded-xl bg-slate-100" />
          </div>
          <div className="h-11 w-36 rounded-xl bg-slate-200" />
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="h-48 rounded-2xl bg-slate-200" />
          <div className="h-48 rounded-2xl bg-slate-200" />
        </div>
      </div>
    </main>
  );
}
