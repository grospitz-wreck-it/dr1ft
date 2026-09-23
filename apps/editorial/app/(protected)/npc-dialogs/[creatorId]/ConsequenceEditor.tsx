"use client";
// apps/admin/app/npc-dialogs/[creatorId]/ConsequenceEditor.tsx

import { useState, useTransition } from "react";
import { setConsequence } from "../actions";

interface MessageOption {
  id: string;
  bodyPreview: string;
}

export function ConsequenceEditor({
  messageId,
  creatorId,
  initialConsequence,
  availableMessages,
}: {
  messageId: string;
  creatorId: string;
  initialConsequence: { contentItemId: string; delayHours: number } | null;
  availableMessages: MessageOption[];
}) {
  const [targetId, setTargetId] = useState(initialConsequence?.contentItemId ?? "");
  const [delayHours, setDelayHours] = useState(initialConsequence?.delayHours ?? 24);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    if (!targetId) return;
    startTransition(async () => {
      await setConsequence(messageId, creatorId, targetId, delayHours);
      setSaved(true);
    });
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs bg-status-review/5 border border-status-review/30 rounded px-2 py-2">
      <span className="text-status-review">⏱ Konsequenz nach</span>
      <input
        type="number"
        min={1}
        value={delayHours}
        onChange={(e) => { setDelayHours(Number(e.target.value)); setSaved(false); }}
        className="border border-border rounded-md px-2 py-1 w-16"
      />
      <span className="text-status-review">Std.:</span>
      <select
        value={targetId}
        onChange={(e) => { setTargetId(e.target.value); setSaved(false); }}
        className="border border-border rounded-md px-2 py-1"
      >
        <option value="">keine Konsequenz</option>
        {availableMessages.map((m) => (
          <option key={m.id} value={m.id}>{m.bodyPreview}</option>
        ))}
      </select>
      <button
        onClick={save}
        disabled={isPending || !targetId}
        className="bg-accent hover:bg-accent-hover text-white px-2 py-1 rounded-md disabled:opacity-50"
      >
        {isPending ? "…" : "Speichern"}
      </button>
      {saved && <span className="text-status-live">gespeichert</span>}
    </div>
  );
}
