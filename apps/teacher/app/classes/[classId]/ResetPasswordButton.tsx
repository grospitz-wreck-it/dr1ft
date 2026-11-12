"use client";
// apps/teacher/app/classes/[classId]/ResetPasswordButton.tsx

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { KeyRound } from "lucide-react";

function supabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function ResetPasswordButton({
  studentUserId,
  classId,
}: {
  studentUserId: string;
  classId: string;
}) {
  const supabase = supabaseBrowserClient();
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleReset() {
    if (!window.confirm("Das Passwort dieser Schüler:in wirklich zurücksetzen? Das bisherige Passwort wird sofort ungültig.")) return;
    setPending(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sitzung abgelaufen. Bitte erneut anmelden.");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/reset-student-password`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ studentUserId, classId }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler beim Zurücksetzen");
      setTempPassword(data.tempPassword);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Zurücksetzen");
    } finally {
      setPending(false);
    }
  }

  if (tempPassword) {
    return (
      <div className="text-xs bg-yellow-50 border border-yellow-300 rounded px-2 py-1">
        Neues Passwort (einmalig sichtbar, jetzt notieren):{" "}
        <code className="font-mono font-semibold">{tempPassword}</code>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleReset}
        disabled={pending}
        aria-label="Passwort zurücksetzen"
        title="Passwort zurücksetzen"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50"
      >
        <KeyRound className="h-4 w-4" />
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
