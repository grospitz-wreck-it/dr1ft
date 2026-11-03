"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { EditorialSidebar } from "./EditorialSidebar";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];

export function EditorialAppShell({ children }: { children: ReactNode }) {
  const pathname = (usePathname() ?? "/").split("?")[0].replace(/\\/+$/, "") || "/";
  const isPublicAuthPage = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );
  const isSchoolWorkspace = pathname.startsWith("/schools/");

  // SchoolDetailWorkspace owns its complete navigation and header.
  // Do not wrap it in the Editorial shell.
  if (isPublicAuthPage || isSchoolWorkspace) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex bg-canvas">
      <EditorialSidebar />
      <div className="editorial-main min-w-0 flex-1">
        <header className="editorial-topbar">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600">DR1FT / REDAKTION</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">Lerninhalte gestalten</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-500 sm:inline-flex">Content Studio</span>
            <span className="editorial-avatar" aria-label="DR1FT Redaktion">D</span>
          </div>
        </header>
        <main className="editorial-content">{children}</main>
      </div>
    </div>
  );
}
