"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useFormStatus } from "react-dom";

export function AiGenerationButton({
  idleLabel,
  pendingLabel,
  className = "",
}: {
  idleLabel: string;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${className} disabled:cursor-wait disabled:opacity-70`}
    >
      {pending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Sparkles className="w-4 h-4" />
      )}
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
