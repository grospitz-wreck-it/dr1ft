"use client";
// apps/teacher/app/classes/[classId]/ResetPasswordButton.tsx

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

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
    setPending(true);
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/reset-student-password`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ studentUserId, classId }),
      }
    );
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Fehler beim Zurücksetzen");
    } else {
      setTempPassword(data.tempPassword);
    }
    setPending(false);
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
        onClick={handleReset}
        disabled={pending}
        className="text-xs underline disabled:opacity-50"
      >
        {pending ? "…" : "Passwort zurücksetzen"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
