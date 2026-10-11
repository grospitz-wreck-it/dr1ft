import type { Metadata } from "next";
import "./globals.css";
import { TeacherNav } from "../components/TeacherNav";

export const metadata: Metadata = {
  title: "DR1FT — Teacher",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-canvas text-slate-950">
        <TeacherNav />
        <main className="editorial-main min-w-0 lg:ml-[252px]"><div className="editorial-content">{children}</div></main>
      </body>
    </html>
  );
}
