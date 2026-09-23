import { FormEvent } from "react";

export default function StagingPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const next = searchParams.next && searchParams.next.startsWith("/") ? searchParams.next : "/";

  async function unlock(event: FormEvent<HTMLFormElement>) {
    // Native POST keeps the gate usable without client-side state.
    // The actual password check happens in the server route.
  }

  return (
    <main className="min-h-screen bg-ink text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-10">
          <p className="font-display text-2xl font-bold tracking-tight">DR1FT</p>
          <p className="text-white/50 text-sm mt-2">Staging-Bereich</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-7 shadow-2xl">
          <h1 className="font-display text-2xl font-bold">Noch nicht öffentlich</h1>
          <p className="text-white/65 mt-3 leading-relaxed">
            Diese Website befindet sich aktuell im geschützten Testbetrieb.
            Erst nach Eingabe des Staging-Passworts wird die eigentliche Website geöffnet.
          </p>
          <form action="/api/staging/unlock" method="post" className="mt-7 space-y-4">
            <input type="hidden" name="next" value={next} />
            <label className="block">
              <span className="text-sm text-white/70">Passwort</span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                autoFocus
                className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 outline-none focus:border-white/40"
              />
            </label>
            <button className="w-full rounded-xl bg-white text-ink font-semibold px-4 py-3 hover:bg-white/90">
              Website öffnen
            </button>
          </form>
          <p className="mt-5 text-xs text-white/35">
            Der Zugang ist nur für den aktuellen Testbetrieb vorgesehen.
          </p>
        </div>
      </div>
    </main>
  );
}
