import type { Metadata } from "next";
import { EditorialAppShell } from "./EditorialAppShell";
import "./globals.css";

// Keep Editorial server rendering close to the Supabase project (eu-central-1).
export const preferredRegion = "fra1";

export const metadata: Metadata = {
  title: "DR1FT — Redaktion",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="font-sans">
        <EditorialAppShell>{children}</EditorialAppShell>
      </body>
    </html>
  );
}
