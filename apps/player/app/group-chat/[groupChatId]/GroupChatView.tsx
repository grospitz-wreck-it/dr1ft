"use client";
// Kaskadierendes Reveal statt alles auf einmal — simuliert, dass mehrere Personen
// nacheinander in den Chat schreiben. Die Instance-Scoping-Logik bleibt unverändert.

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Radio, ThumbsUp } from "lucide-react";
import { recordInteraction } from "@dr1ft/engine-core";
import type { FeedItem } from "../../../lib/types";
import { supabaseBrowserClient } from "../../../lib/supabaseBrowserClient";
import { Skeleton } from "../../../components/Skeleton";

const REVEAL_DELAY_MS = 900;

export function GroupChatView({ messages, userId, classInstanceId }: { messages: FeedItem[]; userId: string; classInstanceId: string }) {
  const supabase = supabaseBrowserClient();
  const [visibleCount, setVisibleCount] = useState(Math.min(1, messages.length));
  const seenRef = useRef<Set<string>>(new Set());

  function recordView(message: FeedItem | undefined) {
    if (!message || seenRef.current.has(message.id)) return;
    seenRef.current.add(message.id);
    void recordInteraction(supabase, { userId, contentItemId: message.id, interactionType: "view", classInstanceId });
  }
  useEffect(() => { recordView(messages[0]); }, [messages, userId, classInstanceId, supabase]);
  useEffect(() => { if (visibleCount >= messages.length) return; const timer = setTimeout(() => { const msg = messages[visibleCount]; setVisibleCount((c) => c + 1); recordView(msg); }, REVEAL_DELAY_MS); return () => clearTimeout(timer); }, [visibleCount, messages, userId, classInstanceId, supabase]);

  return <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-gradient-to-b from-[#17142f] via-[#21183e] to-[#17142f] p-4 md:p-6 shadow-[0_24px_70px_rgba(40,20,65,.22)]">
    <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#ff4fd8]/12 blur-3xl" /><div className="absolute -left-20 bottom-0 h-48 w-48 rounded-full bg-[#48d9ff]/10 blur-3xl" />
    <div className="relative flex items-center justify-between mb-5 pb-4 border-b border-white/10"><div className="flex items-center gap-2"><span className="grid place-items-center h-9 w-9 rounded-xl bg-gradient-to-br from-[#8b55e8] to-[#ff4fd8] text-white shadow-lg"><MessageCircle className="w-4 h-4" /></span><div><p className="font-display text-sm font-semibold text-white">Gruppen-Feed</p><p className="text-[9px] uppercase tracking-[.16em] text-white/35">live conversation</p></div></div><span className="inline-flex items-center gap-1.5 rounded-full border border-[#65f5bd]/15 bg-[#65f5bd]/8 px-2.5 py-1 text-[9px] font-mono uppercase tracking-[.12em] text-[#9dffd7]"><Radio className="w-3 h-3" /> live</span></div>
    <div className="relative space-y-3">
      {messages.slice(0, visibleCount).map((m, index) => <div key={m.id} className={`max-w-[88%] ${index % 3 === 1 ? "ml-4" : ""}`}><div className="flex items-center gap-2 mb-1.5 px-1"><span className="text-[10px] font-semibold text-[#bca7df]">{m.creator?.displayName ?? "?"}</span><span className="text-[8px] font-mono text-white/20">NOW</span></div><div className="rounded-[20px] rounded-tl-[7px] bg-white/[.08] border border-white/[.08] px-4 py-3 text-white shadow-[0_8px_24px_rgba(0,0,0,.12)]"><p className="text-sm leading-6 text-white/85">{m.body}</p>{typeof (m.extra as any)?.reactionCount === "number" && <p className="flex items-center gap-1 text-[11px] text-white/35 mt-2"><ThumbsUp className="w-3 h-3" /> {(m.extra as any).reactionCount}</p>}</div></div>)}
      {visibleCount < messages.length && <div className="rounded-[20px] bg-white/[.05] border border-white/[.06] px-4 py-3 max-w-[42%] flex gap-1.5 items-center"><Skeleton className="w-1.5 h-1.5 rounded-full" /><Skeleton className="w-1.5 h-1.5 rounded-full" /><Skeleton className="w-1.5 h-1.5 rounded-full" /></div>}
    </div>
  </div>;
}
