"use client";
// apps/admin/app/content/ContentDetailDrawer.tsx
//
// Bewusst KEIN Seitenwechsel bei Klick auf eine Zeile — bei 1000+
// Einträgen wäre "Liste -> Detail -> zurück -> Liste (Scroll-Position
// weg)" der größte Zeitfresser. Der Drawer rendert bedingt (item
// vorhanden oder nicht), URL trägt ?item=<id>, "Schließen" ist einfach
// ein Link ohne diesen Parameter — kein zusätzlicher Client-State nötig.

import { useState, useTransition } from "react";
import { X, Image as ImageIcon, Sparkles } from "lucide-react";
import { updateContentItemQuick, updateContentItemStatusQuick } from "./actions";

const ALLOWED_TRANSITIONS: Record<string, { label: string; next: string }[]> = {
  draft: [{ label: "Zur Prüfung einreichen", next: "in_review" }],
  in_review: [
    { label: "Freigeben", next: "approved" },
    { label: "Ablehnen", next: "rejected" },
    { label: "Zurück zu Entwurf", next: "draft" },
  ],
  approved: [{ label: "Live schalten", next: "live" }],
  live: [{ label: "Archivieren", next: "archived" }],
  rejected: [{ label: "Zurück zu Entwurf", next: "draft" }],
  archived: [{ label: "Zurück zu Entwurf", next: "draft" }],
};

export function ContentDetailDrawer({
  item,
  competencies,
}: {
  item: any;
  competencies: { id: string; title: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [body, setBody] = useState(item?.body ?? "");
  const [techniques, setTechniques] = useState((item?.manipulation_techniques ?? []).join(", "));
  const [saved, setSaved] = useState(false);

  if (!item) return null;

  const transitions = ALLOWED_TRANSITIONS[item.status] ?? [];

  function save() {
    startTransition(async () => {
      await updateContentItemQuick(item.id, {
        body,
        manipulationTechniques: techniques.split(",").map((t: string) => t.trim()).filter(Boolean),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  return (
    <>
      <a
        href="/content"
        className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px]"
        aria-label="Schließen"
      />
      <aside className="fixed inset-y-0 right-0 z-50 h-screen w-full max-w-lg overflow-y-auto border-l border-border bg-panel shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-border bg-panel/95 px-5 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Content-Detail</p>
              <h2 className="mt-1 truncate text-lg font-semibold tracking-tight text-slate-900">{item.type}</h2>
              <span className="mt-2 inline-flex items-center gap-2 rounded-full border border-border bg-canvas px-2.5 py-1 text-xs font-medium text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {item.status}
              </span>
            </div>
            <a
              href="/content"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-white text-slate-500 transition hover:bg-canvas hover:text-slate-900"
              aria-label="Detail schließen"
            >
              <X className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="space-y-6 p-5">
          {item.media_url && (
            <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Medienvorschau</p>
                  <p className="mt-0.5 text-xs text-slate-500">Verknüpftes Asset</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-slate-600">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Bild
                </span>
              </div>
              <div className="aspect-[4/3] bg-slate-50">
                <img
                  src={item.media_url}
                  alt=""
                  className="h-full w-full object-contain"
                  loading="eager"
                />
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3 text-xs text-slate-500">
                <span className="font-medium">Quelle</span>
                <span className="inline-flex items-center gap-1.5 text-right">
                  {item.extra?.imageProvider === "cloudflare" && (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      FLUX
                    </>
                  )}
                  {item.extra?.imageProvider !== "cloudflare" && (item.extra?.imageProvider ?? "Quelle unbekannt")}
                </span>
              </div>
            </section>
          )}

          <section className="space-y-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Bearbeitung</p>
              <h3 className="mt-1 text-base font-semibold text-slate-900">Inhalt bearbeiten</h3>
              <p className="mt-1 text-sm leading-5 text-slate-500">Passe den Inhalt und die zugeordneten Manipulationstechniken an.</p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Inhalt</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                className="w-full resize-y rounded-xl border border-border bg-white px-3.5 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-4 focus:ring-violet-500/10"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Manipulationstechniken</label>
              <input
                value={techniques}
                onChange={(e) => setTechniques(e.target.value)}
                placeholder="z. B. Framing, falsche Dichotomie"
                className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-4 focus:ring-violet-500/10"
              />
              <p className="mt-1.5 text-xs text-slate-400">Mehrere Einträge durch Kommas trennen.</p>
            </div>

            <button
              onClick={save}
              disabled={isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Speichert…" : saved ? "Gespeichert ✓" : "Änderungen speichern"}
            </button>
          </section>

          <section className="border-t border-border pt-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Workflow</p>
            <h3 className="mt-1 text-base font-semibold text-slate-900">Freigabe</h3>
            <p className="mt-1 text-sm leading-5 text-slate-500">Verändere den Status entsprechend dem nächsten Arbeitsschritt.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {transitions.map((t) => (
                <button
                  key={t.next}
                  onClick={() =>
                    startTransition(() => updateContentItemStatusQuick(item.id, item.status, t.next))
                  }
                  className="rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-accent/40 hover:bg-canvas"
                >
                  {t.label}
                </button>
              ))}
              {transitions.length === 0 && (
                <p className="rounded-xl bg-canvas px-3 py-2 text-xs text-slate-500">Für diesen Status ist keine weitere Aktion definiert.</p>
              )}
            </div>
          </section>

          <section className="border-t border-border pt-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Herkunft</p>
            <h3 className="mt-1 text-base font-semibold text-slate-900">Details</h3>
            <dl className="mt-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-xs text-slate-500">Szenario</dt>
                <dd className="max-w-[65%] text-right text-xs font-medium text-slate-700">{item.scenarios?.title ?? "— Ambient —"}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-xs text-slate-500">Creator</dt>
                <dd className="max-w-[65%] text-right text-xs font-medium text-slate-700">{item.creators?.display_name ?? "—"}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-xs text-slate-500">Erstellt</dt>
                <dd className="text-right text-xs font-medium text-slate-700">{new Date(item.created_at).toLocaleString("de-DE")}</dd>
              </div>
            </dl>
            {item.media_url && (
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border pt-4">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Bild</span>
                {item.extra?.generatedBy === "ai" && <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">KI-generiert</span>}
                {item.extra?.imageProvider === "cloudflare" && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">FLUX</span>}
                {item.extra?.format && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{item.extra.format}</span>}
              </div>
            )}
          </section>
        </div>
      </aside>
    </>
  );
}
