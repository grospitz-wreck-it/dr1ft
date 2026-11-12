"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { getAmbientInventorySummary, getAmbientNpcCreators } from "./actions";

type InventorySummary = Awaited<ReturnType<typeof getAmbientInventorySummary>>;
type NpcCreator = Awaited<ReturnType<typeof getAmbientNpcCreators>>[number];
type InventoryContextValue = {
  summary: InventorySummary | null;
  loading: boolean;
  error: string | null;
  npcCreators: NpcCreator[];
  npcLoading: boolean;
  npcError: string | null;
  loadNpcCreators: () => void;
};
const InventoryContext = createContext<InventoryContextValue>({
  summary: null,
  loading: true,
  error: null,
  npcCreators: [],
  npcLoading: false,
  npcError: null,
  loadNpcCreators: () => {},
});

export function AmbientInventoryProvider({ children }: { children: ReactNode }) {
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [npcCreators, setNpcCreators] = useState<NpcCreator[]>([]);
  const [npcLoading, setNpcLoading] = useState(false);
  const [npcError, setNpcError] = useState<string | null>(null);
  const npcRequestStarted = useRef(false);

  const loadNpcCreators = useCallback(() => {
    if (npcRequestStarted.current) return;
    npcRequestStarted.current = true;
    setNpcLoading(true);
    setNpcError(null);
    getAmbientNpcCreators()
      .then(setNpcCreators)
      .catch((reason: unknown) => {
        npcRequestStarted.current = false;
        setNpcError(reason instanceof Error ? reason.message : "NPCs konnten nicht geladen werden.");
      })
      .finally(() => setNpcLoading(false));
  }, []);

  useEffect(() => {
    let active = true;
    getAmbientInventorySummary()
      .then((result) => {
        if (active) setSummary(result);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Inventar konnte nicht geladen werden.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <InventoryContext.Provider value={{ summary, loading, error, npcCreators, npcLoading, npcError, loadNpcCreators }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useAmbientInventoryUsageCounts() {
  return useContext(InventoryContext).summary?.usageCounts ?? {};
}

export function useAmbientNpcCreators() {
  const { npcCreators, npcLoading, npcError, loadNpcCreators } = useContext(InventoryContext);
  return { creators: npcCreators, loading: npcLoading, error: npcError, load: loadNpcCreators };
}

export function AmbientInventoryPanel() {
  const { summary, loading, error } = useContext(InventoryContext);
  const interestCoverage = summary?.interestCoverage ?? [];
  const coveredInterestCount = summary?.coveredInterestCount ?? 0;

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Interessen-Abdeckung</h2>
          <p className="text-xs text-slate-500 mt-1">Inventar aller szenario-unabhängigen Posts; Tags werden anhand der gespeicherten interestKeys gezählt.</p>
        </div>
        <span className="text-[10px] rounded-full bg-violet-50 text-violet-700 px-2.5 py-1.5 font-medium">Katalog + Content-Inventar</span>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Ambient-Inventar und Interessen-Abdeckung werden geladen …</p>
      ) : error ? (
        <p className="text-sm text-red-700">Inventar konnte nicht vollständig geladen werden: {error}</p>
      ) : summary ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="INTERESSEN" value={interestCoverage.length} />
            <Stat label="MIT POSTS" value={coveredInterestCount} />
            <Stat label="OHNE POSTS" value={interestCoverage.length - coveredInterestCount} />
            <Stat label="OHNE TAGS" value={summary.untaggedPostCount} />
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
            <span className="rounded-full bg-slate-100 px-2.5 py-1">{summary.inventoryCount} Ambient-Posts inventarisiert</span>
            <span className="rounded-full bg-amber-50 text-amber-800 px-2.5 py-1">{summary.legacyTaggedCount} ältere KI-Posts mit Legacy-Tagging</span>
          </div>
          <details className="rounded-xl border border-slate-200">
            <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-3 text-sm font-medium text-slate-800">
              <span>Alle Interessen und Post-Zahlen ansehen</span>
              <span className="text-xs text-slate-400">{coveredInterestCount}/{interestCoverage.length} abgedeckt</span>
            </summary>
            <div className="border-t border-slate-100 p-3 space-y-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Noch ohne zugeordnete Posts</h3>
                {interestCoverage.filter((interest) => interest.total === 0).length === 0 ? (
                  <p className="text-xs text-emerald-700">Alle Interessen haben mindestens einen zugeordneten Post.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {interestCoverage.filter((interest) => interest.total === 0).map((interest) => (
                      <span key={interest.key} className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-900">{interest.emoji} {interest.label}</span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Vollständige Abdeckung</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                  {[...interestCoverage].sort((a, b) => a.label.localeCompare(b.label, "de")).map((interest) => (
                    <div key={interest.key} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-xs">
                      <span className="min-w-0 truncate">{interest.emoji} {interest.label}</span>
                      <span className={interest.total ? "shrink-0 font-semibold text-slate-700" : "shrink-0 text-amber-700"}>{interest.total} <span className="font-normal text-slate-400">({interest.live} live · {interest.draft} Draft)</span></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </details>
        </>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 min-w-20">
      <div className="text-[9px] font-semibold tracking-wider text-slate-400">{label}</div>
      <div className="text-xl font-semibold text-slate-900 mt-1">{value}</div>
    </div>
  );
}
