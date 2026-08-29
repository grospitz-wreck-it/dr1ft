"use client";

import { useState } from "react";

export function CopyAccessCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="text-sm border border-border rounded-md px-3 py-2 hover:bg-slate-50"
    >
      {copied ? "Kopiert ✓" : "Code kopieren"}
    </button>
  );
}
