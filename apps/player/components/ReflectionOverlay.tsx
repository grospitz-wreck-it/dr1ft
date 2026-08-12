"use client";
// apps/player/components/ReflectionOverlay.tsx
//
// Das Signature-Element der App: statt eines Erfolgs-Badges oder
// Konfetti-Effekts erscheint eine ruhige "Beweisstück"-Ansicht.
// Erkannte Manipulationstechniken werden als Textmarker-Annotationen
// dargestellt (.marker-highlight, siehe globals.css) — visuell wie
// handschriftliche Anmerkungen auf einem ausgedruckten Dokument.
// Bewusst der einzige auffällige visuelle Moment der ganzen App.

import { useEffect, useState } from "react";
import type { ContentItem } from "@dr1ft/shared-types";
import { supabaseBrowserClient } from "../lib/supabaseBrowserClient";
import { Skeleton } from "./Skeleton";

const TECHNIQUE_LABELS: Record<string, string> = {
  false_authority: "Berufung auf unbenannte Autorität",
  emotional_urgency: "Künstliche Dringlichkeit",
  anecdotal_evidence: "Einzelfall als Beleg",
  urgency_to_share: "Teilen-Druck",
  peer_pressure: "Gruppendruck",
  source_evaluation: "Quellenprüfung",
};

export function ReflectionOverlay({
  contentItemId,
  onClose,
}: {
  contentItemId: string;
  onClose: () => void;
}) {
  const supabase = supabaseBrowserClient();
  const [content, setContent] = useState<ContentItem | null>(null);

  useEffect(() => {
    supabase
      .from("content_items")
      .select("*")
      .eq("id", contentItemId)
      .single()
      .then(({ data }) => setContent(data as unknown as ContentItem));
  }, [contentItemId]);

  const techniqueTags = content
    ? [...(content.manipulationTechniques ?? []), ...((content as any).manipulation_techniques ?? [])]
    : [];

  return (
    <div
      className="fixed inset-0 bg-ink/95 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-ink-light border border-ink-border rounded-t-card sm:rounded-card max-w-md w-full p-6 space-y-4 animate-[slide-up_0.25s_ease-out]">
        <p className="font-mono text-[11px] text-marker uppercase tracking-widest">
          Analyse
        </p>
        <h2 className="font-display text-xl text-paper leading-snug">
          Was hier gerade passiert ist
        </h2>

        {content ? (
          <p className="font-body text-paper/90 text-[15px] leading-relaxed">
            {content.body}
          </p>
        ) : (
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        )}

        {techniqueTags.length > 0 && (
          <div className="pt-2 space-y-2">
            <p className="font-mono text-[11px] text-ash uppercase tracking-wide">
              Erkannte Muster
            </p>
            <div className="flex flex-wrap gap-2">
              {[...new Set(techniqueTags)].map((tag) => (
                <span
                  key={String(tag)}
                  className="marker-highlight font-mono text-[12px] text-ink"
                >
                  {TECHNIQUE_LABELS[String(tag)] ?? tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-4 bg-marker text-ink font-body font-medium rounded-lg py-3 text-sm"
        >
          Weiter im Feed
        </button>
      </div>
    </div>
  );
}
