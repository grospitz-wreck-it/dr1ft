"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

export function AiGenerationButton({
  idleLabel,
  pendingLabel,
  className = "",
  pendingSteps = [],
  apiEndpoint,
}: {
  idleLabel: string;
  pendingLabel: string;
  className?: string;
  pendingSteps?: string[];
  apiEndpoint?: string;
}) {
  const { pending: formPending } = useFormStatus();
  const [actionPending, setActionPending] = useState(false);
  const pending = apiEndpoint ? actionPending : formPending;
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!pending || pendingSteps.length < 2) {
      setStepIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % pendingSteps.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [pending, pendingSteps.length]);

  async function handleApiClick() {
    if (!apiEndpoint) return;
    try {
      setActionPending(true);
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "KI-Generierung fehlgeschlagen.");
      }
      window.location.reload();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "KI-Generierung fehlgeschlagen.");
    } finally {
      setActionPending(false);
    }
  }

  return (
    <button
      type={apiEndpoint ? "button" : "submit"}
      disabled={pending}
      onClick={apiEndpoint ? handleApiClick : undefined}
      aria-busy={pending}
      className={`${className} disabled:cursor-wait disabled:opacity-70`}
    >
      {pending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Sparkles className="w-4 h-4" />
      )}
      <span>{pending ? (pendingSteps[stepIndex] ?? pendingLabel) : idleLabel}</span>
    </button>
  );
}
