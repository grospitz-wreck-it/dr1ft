"use client";
// apps/admin/app/scenarios/[scenarioId]/ContentStatusControl.tsx
// Wiederverwendet in scenarios/[id], npc-dialogs/[id], ambient-content —
// deshalb hier zentral auf die neuen Statusfarben-Tokens umgestellt.

import { useState, useTransition } from "react";
import { updateContentItemStatus } from "../actions";

const TRANSITIONS: Record<string, { label: string; next: string }[]> = {
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

const STATUS_LABEL: Record<string, string> = {
  draft: "Entwurf",
  in_review: "In Prüfung",
  approved: "Freigegeben",
  live: "Live",
  archived: "Archiviert",
  rejected: "Abgelehnt",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-status-draft",
  in_review: "bg-status-review",
  approved: "bg-status-approved",
  live: "bg-status-live",
  archived: "bg-status-archived",
  rejected: "bg-status-rejected",
};

export function ContentStatusControl({
  contentItemId,
  status,
}: {
  contentItemId: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");
  const options = TRANSITIONS[status] ?? [];
  const needsNotes = status === "in_review"; // Freigabe/Ablehnung sollte begründet sein

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`text-xs2 text-white px-2 py-0.5 rounded-full ${STATUS_COLOR[status] ?? "bg-slate-400"}`}>
        {STATUS_LABEL[status] ?? status}
      </span>

      {needsNotes && (
        <input
          type="text"
          placeholder="Review-Notiz (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="border border-border rounded-md px-2 py-1 text-xs"
        />
      )}

      {options.map((opt) => (
        <button
          key={opt.next}
          disabled={isPending}
          onClick={() =>
            startTransition(() => {
              updateContentItemStatus(contentItemId, status, opt.next, notes || undefined);
            })
          }
          className="text-xs border border-border rounded-md px-2 py-1 hover:bg-canvas disabled:opacity-50"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
