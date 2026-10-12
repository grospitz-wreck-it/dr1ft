"use client";

export function PrintReportButton() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">
      Report generieren / drucken
    </button>
  );
}
