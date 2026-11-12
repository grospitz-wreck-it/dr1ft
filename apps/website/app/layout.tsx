import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DR1FT — Medienkompetenz erleben",
  description: "Die Lernplattform, die Schüler:innen Manipulation im Feed selbst erkennen lässt.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
