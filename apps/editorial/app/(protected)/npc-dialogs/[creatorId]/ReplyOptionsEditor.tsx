"use client";
// apps/admin/app/npc-dialogs/[creatorId]/ReplyOptionsEditor.tsx

import { useState, useTransition } from "react";
import type { ReplyOption } from "@dr1ft/shared-types";
import { updateReplyOptions } from "../actions";

interface MessageOption {
  id: string;
  bodyPreview: string;
}

export function ReplyOptionsEditor({
  messageId,
  creatorId,
  initialOptions,
  availableMessages,
}: {
  messageId: string;
  creatorId: string;
  initialOptions: ReplyOption[];
  availableMessages: MessageOption[]; // alle Nachrichten dieses NPCs außer sich selbst
}) {
  const [rows, setRows] = useState<ReplyOption[]>(
    initialOptions.length > 0 ? initialOptions : []
  );
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function addRow() {
    setRows((r) => [...r, { label: "", nextContentItemId: "", techniqueTag: "" }]);
  }

  function updateRow(index: number, patch: Partial<ReplyOption>) {
    setRows((r) => r.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setSaved(false);
  }

  function removeRow(index: number) {
    setRows((r) => r.filter((_, i) => i !== index));
    setSaved(false);
  }

  function save() {
    const cleaned = rows.filter((r) => r.label.trim() && r.nextContentItemId);
    startTransition(async () => {
      await updateReplyOptions(messageId, creatorId, cleaned);
      setSaved(true);
    });
  }

  return (
    <div className="pl-4 border-l-2 border-border space-y-2 mt-2">
      {rows.map((row, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400">↳</span>
          <input
            value={row.label}
            onChange={(e) => updateRow(i, { label: e.target.value })}
            placeholder="Antworttext (z.B. 'Klar, weiterleiten!')"
            className="border border-border rounded-md px-2 py-1 flex-1 min-w-[160px]"
          />
          <select
            value={row.nextContentItemId}
            onChange={(e) => updateRow(i, { nextContentItemId: e.target.value })}
            className="border border-border rounded-md px-2 py-1"
          >
            <option value="">→ führt zu…</option>
            {availableMessages.map((m) => (
              <option key={m.id} value={m.id}>
                {m.bodyPreview}
              </option>
            ))}
          </select>
          <input
            value={row.techniqueTag ?? ""}
            onChange={(e) => updateRow(i, { techniqueTag: e.target.value })}
            placeholder="Technik-Tag (optional)"
            className="border border-border rounded-md px-2 py-1 w-32"
          />
          <button onClick={() => removeRow(i)} className="text-status-rejected">
            entfernen
          </button>
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button onClick={addRow} className="text-xs underline">
          + Antwortoption
        </button>
        <button
          onClick={save}
          disabled={isPending}
          className="text-xs bg-accent hover:bg-accent-hover text-white px-3 py-1 rounded-md disabled:opacity-50"
        >
          {isPending ? "speichert…" : "Speichern"}
        </button>
        {saved && <span className="text-xs text-status-live">gespeichert</span>}
      </div>
    </div>
  );
}
