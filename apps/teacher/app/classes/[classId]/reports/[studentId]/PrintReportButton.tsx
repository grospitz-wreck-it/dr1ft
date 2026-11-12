"use client";

import { Printer } from "lucide-react";

export function PrintReportButton() {
  return (
    <button type="button" onClick={() => window.print()} title="Szenario-Report drucken oder als PDF speichern" className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-2.5 py-2 text-[10px] font-bold text-white transition hover:bg-violet-700 sm:text-[11px]">
      <Printer className="h-3.5 w-3.5" />Drucken
    </button>
  );
}
