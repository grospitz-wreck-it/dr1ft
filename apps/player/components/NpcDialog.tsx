"use client";
// apps/player/components/NpcDialog.tsx
//
// Zeigt eine NPC-Nachricht + Antwortoptionen. Nutzt getReplyOptions()
// und selectNpcReply() aus der bereits gebauten NPC Engine
// (packages/engine-core). Kein Freitext — bewusst, siehe README.

import { useState } from "react";
import Link from "next/link";
import { getReplyOptions, isConversationEnd, selectNpcReply } from "@dr1ft/engine-core";
import type { ContentItem } from "@dr1ft/shared-types";
import { supabaseBrowserClient } from "../lib/supabaseBrowserClient";

export function NpcDialog({
  initialMessage,
  creatorId,
  creatorName,
  userId,
}: {
  initialMessage: ContentItem;
  creatorId: string;
  creatorName: string;
  userId: string;
}) {
  const supabase = supabaseBrowserClient();
  const [message, setMessage] = useState(initialMessage);
  const [ended, setEnded] = useState(isConversationEnd(initialMessage));
  const [pendingResumeAt, setPendingResumeAt] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const options = getReplyOptions(message);

  async function choose(option: (typeof options)[number]) {
    setPending(true);
    const result = await selectNpcReply(supabase, {
      userId,
      creatorId,
      chosenOption: option,
    });
    if (result.nextMessage) {
      setMessage(result.nextMessage);
    }
    setEnded(result.conversationEnded);
    setPendingResumeAt(result.pendingResumeAt ?? null);
    setPending(false);
  }

  return (
    <div className="bg-paper text-ink rounded-card p-4 space-y-3">
      <Link href={`/creator/${creatorId}`} className="font-mono text-[11px] text-ink/50 uppercase tracking-wide hover:underline">
        DM · {creatorName}
      </Link>
      <p className="font-body text-[15px] leading-relaxed">{message.body}</p>

      {!ended && (
        <div className="space-y-2 pt-2">
          {options.map((opt) => (
            <button
              key={opt.nextContentItemId}
              disabled={pending}
              onClick={() => choose(opt)}
              className="w-full text-left border border-ink/15 rounded-lg px-3 py-2 text-sm hover:bg-ink/5 disabled:opacity-50"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {ended && !pendingResumeAt && (
        <p className="font-mono text-[11px] text-ash pt-2">— Gespräch beendet —</p>
      )}
      {pendingResumeAt && (
        <p className="font-mono text-[11px] text-ash pt-2">
          — {creatorName} meldet sich wieder —
        </p>
      )}
    </div>
  );
}
