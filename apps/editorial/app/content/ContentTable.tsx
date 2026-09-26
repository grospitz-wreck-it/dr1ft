"use client";
// apps/admin/app/content/ContentTable.tsx

import { useState, useTransition } from "react";
import { FileText, MessageSquare, Send, Target, Gamepad2, Lightbulb, Image as ImageIcon, Video, Sparkles } from "lucide-react";
import { bulkUpdateStatus } from "./actions";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-status-draft",
  in_review: "bg-status-review",
  approved: "bg-status-approved",
  live: "bg-status-live",
  rejected: "bg-status-rejected",
  archived: "bg-status-archived",
};

const TYPE_ICONS: Record<string, any> = {
  post: FileText,
  comment: MessageSquare,
  dm_message: Send,
  mission: Target,
  minigame: Gamepad2,
  reflection_prompt: Lightbulb,
};

type SearchParams = Record<string, string | undefined>;

export function ContentTable({
  rows,
  searchParams,
}: {
  rows: any[];
  searchParams: SearchParams;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [lastResult, setLastResult] = useState<string | null>(null);

  function hrefWith(overrides: Record<string, string | undefined>): string {
    const params = new URLSearchParams();
    const merged = { ...searchParams, ...overrides };
    Object.entries(merged).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return `/content?${params.toString()}`;
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))));
  }

  function runBulk(nextStatus: string) {
    startTransition(async () => {
      const result = await bulkUpdateStatus(Array.from(selected), nextStatus);
      setLastResult(`${result.updated} aktualisiert, ${result.skipped} übersprungen (ungültiger Übergang)`);
      setSelected(new Set());
    });
  }

  return (
    <div className="bg-panel border border-border rounded-lg overflow-hidden">
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-accent/5 border-b border-border text-sm">
          <span className="font-medium">{selected.size} ausgewählt</span>
          <button disabled={isPending} onClick={() => runBulk("in_review")} className="text-xs px-2 py-1 rounded border border-border hover:bg-panel">
            → Zur Prüfung
          </button>
          <button disabled={isPending} onClick={() => runBulk("approved")} className="text-xs px-2 py-1 rounded border border-border hover:bg-panel">
            → Freigeben
          </button>
          <button disabled={isPending} onClick={() => runBulk("live")} className="text-xs px-2 py-1 rounded border border-border hover:bg-panel">
            → Live schalten
          </button>
          <button disabled={isPending} onClick={() => runBulk("archived")} className="text-xs px-2 py-1 rounded border border-border hover:bg-panel">
            → Archivieren
          </button>
          {lastResult && <span className="text-slate-400 text-xs2 ml-auto">{lastResult}</span>}
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-slate-400 text-xs2 uppercase">
            <th className="w-10 px-3 py-2">
              <input type="checkbox" checked={selected.size === rows.length && rows.length > 0} onChange={toggleAll} />
            </th>
            <th className="w-20 px-2 py-2">Medium</th>
            <th className="px-2 py-2">Inhalt</th>
            <th className="px-2 py-2 w-36">Szenario</th>
            <th className="px-2 py-2 w-28">Creator</th>
            <th className="px-2 py-2 w-24">Status</th>
            <th className="px-2 py-2 w-20">Erstellt</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const Icon = TYPE_ICONS[row.type] ?? FileText;
            return (
              <tr key={row.id} className="table-row-dense border-b border-border last:border-0 hover:bg-canvas">
                <td className="px-3">
                  <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggle(row.id)} />
                </td>
                <td className="px-2">
                  <a href={hrefWith({ item: row.id })} className="flex items-center gap-2 min-w-0" aria-label={row.media_url ? "Content mit Bild öffnen" : "Content öffnen"}>
                    {row.media_url ? (
                      <span className="relative block w-14 h-14 shrink-0 overflow-hidden rounded-lg border border-border bg-canvas">
                        <img
                          src={row.media_url}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute bottom-1 right-1 rounded bg-black/65 p-0.5 text-white">
                          <ImageIcon className="h-3 w-3" />
                        </span>
                      </span>
                    ) : (
                      <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-canvas text-slate-400">
                        {row.media_type === "video" ? <Video className="h-4 w-4" /> : <Icon className="h-4 w-4" strokeWidth={1.75} />}
                      </span>
                    )}
                  </a>
                </td>
                <td className="px-2 min-w-0">
                  <a href={hrefWith({ item: row.id })} className="block min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate max-w-[440px]">{row.body || "—"}</span>
                      {row.extra?.generatedBy === "ai" && (
                        <span className="hidden xl:inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 text-[10px] font-medium">
                          <Sparkles className="h-3 w-3" />
                          KI
                        </span>
                      )}
                    </div>
                    {row.media_url && (
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400">
                        <span>Bild</span>
                        {row.extra?.imageProvider === "cloudflare" && <span>· FLUX</span>}
                        {row.extra?.imageModel && <span className="hidden 2xl:inline">· {row.extra.imageModel}</span>}
                      </div>
                    )}
                  </a>
                </td>
                <td className="px-2 text-slate-500 truncate">{row.scenarios?.title ?? "— Ambient —"}</td>
                <td className="px-2 text-slate-500 truncate">{row.creators?.display_name ?? "—"}</td>
                <td className="px-2">
                  <span className={`inline-flex items-center gap-1 text-xs2 text-white px-2 py-0.5 rounded-full ${STATUS_COLORS[row.status]}`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-2 text-slate-400 text-xs2">
                  {new Date(row.created_at).toLocaleDateString("de-DE")}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                Keine Einträge für diese Filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
