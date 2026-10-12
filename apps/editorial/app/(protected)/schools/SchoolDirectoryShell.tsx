import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";

export function SchoolDirectoryShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex bg-canvas">
      <aside className="editorial-sidebar sticky top-0 flex h-screen w-[252px] shrink-0 flex-col">
        <Link href="/schools" className="editorial-brand">
          <img
            src="/branding/drift-logo-appstore-transparent.webp"
            alt=""
            aria-hidden="true"
            className="h-12 w-12 shrink-0 rounded-xl object-contain"
          />
          <span className="min-w-0">
            <span className="block text-[15px] font-bold tracking-tight text-slate-950">
              DR1FT
            </span>
            <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.19em] text-slate-500">
              Schulbereich
            </span>
          </span>
        </Link>

        <div className="px-4 pb-2 pt-6 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Schulverwaltung
        </div>

        <nav aria-label="Schulnavigation" className="px-3">
          <ul className="space-y-1">
            <li>
              <Link
                href="/schools"
                aria-current="page"
                className="editorial-nav-link editorial-nav-link-active"
              >
                <Building2 className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
                <span className="min-w-0 flex-1">Schulen</span>
                <span className="editorial-nav-indicator" aria-hidden="true" />
              </Link>
            </li>
          </ul>
        </nav>

        <div className="mt-auto border-t border-slate-200/80 p-4">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-violet-50 hover:text-violet-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zum Editorial
          </Link>
          <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-slate-700">Schulbereich</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
              Schulen und Schulprofile zentral verwalten.
            </p>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
