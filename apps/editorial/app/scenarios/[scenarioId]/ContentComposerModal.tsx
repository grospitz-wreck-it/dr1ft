"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { ContentComposer } from "./ContentComposer";

type Creator = { id: string; display_name: string; creator_role?: string | null };

export function ContentComposerModal({ scenarioId, creators = [] }: { scenarioId: string; creators?: Creator[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-500/20 transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        <Plus className="h-4 w-4" />
        Inhalt hinzufügen
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/35 px-4 py-6 backdrop-blur-sm sm:items-center sm:py-10">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Inhalt erstellen"
            className="relative w-full max-w-6xl"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-violet-200 hover:text-violet-700"
              aria-label="Modal schließen"
            >
              <X className="h-4 w-4" />
            </button>
            <ContentComposer scenarioId={scenarioId} creators={creators} />
          </div>
        </div>
      )}
    </>
  );
}
