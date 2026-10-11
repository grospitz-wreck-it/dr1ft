import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { TeacherNav } from "../components/TeacherNav";

export const metadata: Metadata = {
  title: "DR1FT — Lehrkraft",
};

const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password"];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = headers();
  const pathname = requestHeaders.get("x-pathname") ?? "";
  const isPublicPage = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isPublicPage) {
    return (
      <html lang="de">
        <body className="min-h-screen bg-white text-slate-950">{children}</body>
      </html>
    );
  }

  return (
    <html lang="de">
      <body className="min-h-screen bg-canvas text-slate-950">
        <TeacherNav />
        <main className="editorial-main min-w-0 lg:ml-[252px]"><div className="editorial-content">{children}</div></main>
      </body>
    </html>
  );
}
