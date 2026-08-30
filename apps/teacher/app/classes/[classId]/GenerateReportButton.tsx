"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

function client() { return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); }

export function GenerateReportButton({ classId, studentUserId }: { classId: string; studentUserId: string }) {
  const router = useRouter(); const [pending, setPending] = useState(false); const [error, setError] = useState<string | null>(null);
  async function generate() {
    setPending(true); setError(null);
    const { data: { session } } = await client().auth.getSession();
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-teacher-report`, { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ classId, studentUserId }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Report konnte nicht erstellt werden"); setPending(false); return; }
    router.push(`/classes/${classId}/reports/${studentUserId}?report=${data.report.id}`);
    router.refresh();
  }
  return <span className="inline-flex items-center gap-1"><button type="button" onClick={generate} disabled={pending} className="rounded-lg bg-indigo-50 text-indigo-700 px-3 py-1.5 text-xs font-medium hover:bg-indigo-100 disabled:opacity-50">{pending ? "Erstelle …" : "Report erstellen"}</button>{error && <span className="text-xs text-red-600">{error}</span>}</span>;
}
