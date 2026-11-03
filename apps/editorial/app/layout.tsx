import type { Metadata } from "next";
import { headers } from "next/headers";
import { EditorialSidebar } from "./EditorialSidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "DR1FT — Redaktion",
};

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = headers();
  const pathname =
    requestHeaders.get("x-pathname") ??
    requestHeaders.get("x-matched-path") ??
    requestHeaders.get("next-url") ??
    "";
  const host =
    requestHeaders.get("x-dr1ft-host") ??
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "";
  const hostname = host.split(",")[0].trim().split(":")[0].toLowerCase();
  const schoolHost = (process.env.SCHOOL_HOST ?? "schule.dr1ft.de").toLowerCase();

  const isPublicAuthPage = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  // The school portal renders its own navigation. Keep it outside the editorial shell
  // so school admins never get two sidebars when arriving via schule.dr1ft.de.
  const normalizedPathname =
    pathname.split("?")[0].replace(/\/+$/, "") || "/";

  const isSchoolDetailPage =
    requestHeaders.get("x-dr1ft-school-detail") === "1" ||
    normalizedPathname.startsWith("/schools/");

  if (isPublicAuthPage || hostname === schoolHost || isSchoolDetailPage) {
    return (
      <html lang="de">
        <body className="font-sans">{children}</body>
      </html>
    );
  }

  return (
    <html lang="de">
      <body className="font-sans">
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
      </body>
    </html>
  );
}
