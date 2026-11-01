"use client";

import { useEffect, useMemo, useState } from "react";
import { UserRound, X } from "lucide-react";
import { updateContentItemCreator } from "../actions";

type Creator = { id: string; display_name: string; creator_role?: string | null };

export function ContentNpcAssignmentEditor({
  scenarioId,
  contentItemId,
  initialCreatorId,
  creators = [],
}: {
  scenarioId: string;
  contentItemId: string;
  initialCreatorId: string | null;
  creators?: Creator[];
}) {
  const [open, setOpen] = useState(false);
  const [creatorId, setCreatorId] = useState(initialCreatorId ?? "");
  const [busy, setBusy] = useState(false);
  const current = useMemo(() => creators.find((creator) => creator.id === (initialCreatorId ?? "")) ?? null, [creators, initialCreatorId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function save() {
    setBusy(true);
    try {
      await updateContentItemCreator(contentItemId, scenarioId, creatorId || null);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700">
            <UserRound className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-slate-900">Figur / NPC</h3>
            <p className="mt-0.5 truncate text-xs text-slate-500">{current ? current.display_name : "Keine Figur zugeordnet"}</p>
          </div>
          <button type="button" onClick={() => { setCreatorId(initialCreatorId ?? ""); setOpen(true); }} className="shrink-0 rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-50">
            {current ? "Ändern" : "Zuordnen"}
          </button>
        </div>
      </section>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
        >
          <div role="dialog" aria-modal="true" aria-label="Figur oder NPC zuordnen" className="relative w-full max-w-lg rounded-3xl border border-violet-100 bg-white p-5 shadow-2xl">
            <button type="button" onClick={() => setOpen(false)} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Modal schließen">
              <X className="h-4 w-4" />
            </button>
            <div className="pr-10">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-600">Figur im Beitrag</div>
              <h2 className="mt-1 text-lg font-bold text-slate-950">Figur / NPC zuordnen</h2>
              <p className="mt-1 text-sm text-slate-500">Lege fest, welche Figur diesen Inhalt im DR1FT-Erlebnis repräsentiert.</p>
            </div>
            <div className="mt-5 space-y-2">
              <button type="button" onClick={() => setCreatorId("")} className={"flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition " + (!creatorId ? "border-violet-500 bg-violet-50 ring-1 ring-violet-100" : "border-slate-200 hover:border-violet-200")}>
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500"><UserRound className="h-4 w-4" /></span>
                <span><span className="block text-sm font-semibold text-slate-800">Keine Figur</span><span className="block text-xs text-slate-500">Der Inhalt bleibt keiner Figur zugeordnet.</span></span>
              </button>
              {creators.map((creator) => (
                <button key={creator.id} type="button" onClick={() => setCreatorId(creator.id)} className={"flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition " + (creatorId === creator.id ? "border-violet-500 bg-violet-50 ring-1 ring-violet-100" : "border-slate-200 hover:border-violet-200")}>
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-700"><UserRound className="h-4 w-4" /></span>
                  <span className="min-w-0"><span className="block text-sm font-semibold text-slate-800">{creator.display_name}</span>{creator.creator_role && <span className="block text-xs text-slate-500">{creator.creator_role}</span>}</span>
                </button>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600">Abbrechen</button>
              <button type="button" disabled={busy} onClick={save} className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60">{busy ? "Wird gespeichert …" : "Zuordnung speichern"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
