import type { Metadata } from "next";
import "./globals.css";
import { TeacherNav } from "../components/TeacherNav";

export const metadata: Metadata = { title: "DR1FT — Teacher" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="de"><body><TeacherNav />{children}</body></html>;
}
