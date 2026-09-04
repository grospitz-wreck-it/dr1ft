"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

function supabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function GenerateReportButton({
  classId,
  studentUserId,
}: {
  classId: string;
  studentUserId: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setPending(true);
    setError("");

    try {
      const supabase = supabaseBrowserClient();

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Session error:", sessionError);
        setError("Sitzung konnte nicht gelesen werden.");
        return;
      }

      if (!session?.access_token) {
        setError("Sitzung abgelaufen. Bitte neu anmelden.");
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-teacher-report`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            classId,
            studentId: studentUserId,
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        console.error("Generate report error:", {
          status: response.status,
          data,
        });

        setError(
          data?.error ??
            `Report konnte nicht erstellt werden (${response.status})`
        );
        return;
      }

      if (!data?.reportId) {
        console.error("Generate report returned no reportId:", data);
        setError(
          "Report wurde erstellt, aber keine Report-ID erhalten."
        );
        return;
      }

      window.location.href =
        `/classes/${classId}/reports/${studentUserId}`;
    } catch (err) {
      console.error("Generate report failed:", err);
      setError("Verbindung zum Server fehlgeschlagen.");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={generate}
        disabled={pending}
        className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
      >
        {pending ? "Erstelle …" : "Report erstellen"}
      </button>

      {error && (
        <span className="text-xs text-red-600">
          {error}
        </span>
      )}
    </span>
  );
}