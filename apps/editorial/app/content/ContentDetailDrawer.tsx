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
        className="fixed inset-0 bg-slate-900/20 z-20 lg:hidden"
        aria-label="Schließen"
      />
      <aside className="fixed lg:sticky top-0 right-0 h-screen w-full max-w-md bg-panel border-l border-border z-30 overflow-y-auto shadow-xl lg:shadow-none">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="text-xs2 uppercase text-slate-400">{item.type}</span>
          <a href="/content" className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </a>
        </div>

        <div className="p-5 space-y-4">
          {item.media_url && (
            <div className="rounded-xl border border-border bg-canvas overflow-hidden">
              <div className="aspect-[4/3] bg-slate-100">
                <img
                  src={item.media_url}
                  alt=""
                  className="h-full w-full object-contain"
                  loading="eager"
                />
              </div>
              <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Bild-Asset
                </span>
                <span className="inline-flex items-center gap-1.5">
                  {item.extra?.imageProvider === "cloudflare" && (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      FLUX
                    </>
                  )}
                  {item.extra?.imageProvider !== "cloudflare" && (item.extra?.imageProvider ?? "Quelle unbekannt")}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs2 text-slate-500 block mb-1">Inhalt</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="w-full border border-border rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs2 text-slate-500 block mb-1">Manipulationstechniken (kommagetrennt)</label>
            <input
              value={techniques}
              onChange={(e) => setTechniques(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm"
            />
          </div>

          <button
            onClick={save}
            disabled={isPending}
            className="w-full bg-accent hover:bg-accent-hover text-white text-sm py-2 rounded-md disabled:opacity-50"
          >
            {isPending ? "Speichert…" : saved ? "Gespeichert ✓" : "Speichern"}
          </button>

          <div className="pt-4 border-t border-border">
            <p className="text-xs2 text-slate-500 mb-2">Freigabe-Status: {item.status}</p>
            <div className="flex flex-wrap gap-2">
              {transitions.map((t) => (
                <button
                  key={t.next}
                  onClick={() =>
                    startTransition(() => updateContentItemStatusQuick(item.id, item.status, t.next))
                  }
                  className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-canvas"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-border text-xs2 text-slate-400 space-y-2">
            <p>Szenario: {item.scenarios?.title ?? "— Ambient —"}</p>
            <p>Creator: {item.creators?.display_name ?? "—"}</p>
            <p>Erstellt: {new Date(item.created_at).toLocaleString("de-DE")}</p>
            {item.media_url && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="rounded-full bg-slate-100 px-2 py-1">Bild</span>
                {item.extra?.generatedBy === "ai" && <span className="rounded-full bg-violet-50 text-violet-700 px-2 py-1">KI-generiert</span>}
                {item.extra?.imageProvider === "cloudflare" && <span className="rounded-full bg-slate-100 px-2 py-1">FLUX</span>}
                {item.extra?.format && <span className="rounded-full bg-slate-100 px-2 py-1">{item.extra.format}</span>}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
