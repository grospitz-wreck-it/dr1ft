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
        <main className="min-w-0 lg:pl-[max(16rem,calc((100vw-80rem)/2+14.5rem))] lg:pr-[max(1.5rem,calc((100vw-80rem)/2))]">{children}</main>
      </body>
    </html>
  );
}
