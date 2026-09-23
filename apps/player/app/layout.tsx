import type { Metadata } from "next";
import "./globals.css";
import { PlayerShell } from "../components/PlayerShell";

export const metadata: Metadata = {
  title: "DR1FT",
  description: "Medienkompetenz erleben.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body><PlayerShell>{children}</PlayerShell></body>
    </html>
  );
}
