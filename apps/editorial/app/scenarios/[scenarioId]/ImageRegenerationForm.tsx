"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { regenerateLearningImage } from "../learning-content-actions";

export function ImageRegenerationForm({ contentItemId, scenarioId }: { contentItemId: string; scenarioId: string }) {
  const [feedback, setFeedback] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [busy, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsError(false);
    const formData = new FormData();
    formData.set("feedback", feedback);
    startTransition(async () => {
      try {
        await regenerateLearningImage(contentItemId, scenarioId, formData);
        setMessage("Neues Bild erstellt. Die Vorschau wird aktualisiert.");
        setFeedback("");
      } catch (error) {
        setIsError(true);
        setMessage(error instanceof Error ? error.message : "Das Bild konnte nicht neu erstellt werden. Bitte versuche es erneut.");
      }
    });
  }

  return <form onSubmit={submit} className="mt-2 space-y-2">
    <div className="flex gap-2">
      <input value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Was soll anders sein? (optional)" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-2 text-[11px]" />
      <button type="submit" disabled={busy} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-50"><RefreshCw className={"h-3.5 w-3.5 " + (busy ? "animate-spin" : "")} />{busy ? "Erstellt …" : "Neu erstellen"}</button>
    </div>
    {message && <p role="status" className={"text-[11px] " + (isError ? "text-rose-600" : "text-emerald-700")}>{message}</p>}
  </form>;
}
