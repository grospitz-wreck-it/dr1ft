"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function CollapsiblePanel({ title, description, children, defaultOpen = true }: {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-violet-50/40 sm:px-6"
      >
        <span className="min-w-0">
          <span className="block text-sm font-extrabold text-slate-950">{title}</span>
          {description && <span className="mt-1 block text-xs text-slate-500">{description}</span>}
        </span>
        <span className={"grid h-8 w-8 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 transition-transform " + (open ? "rotate-180" : "")}>
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>
      {open && <div className="border-t border-slate-100">{children}</div>}
    </section>
  );
}
