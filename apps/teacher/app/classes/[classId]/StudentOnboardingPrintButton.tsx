"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { FileText, LoaderCircle } from "lucide-react";

type Student = { user_id: string; display_name: string | null; username: string | null };

function getSupabase() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

export function StudentOnboardingPrintButton({ classId, students }: { classId: string; students: Student[] }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<Array<{ class_access_code: string; student_user_id: string; display_name: string | null; username: string; password: string }>>([]);

  async function prepareAndPrint() {
    if (!window.confirm("Fehlende Zugangsdaten werden jetzt ergänzt. Bei Schüler:innen ohne gespeichertes Druckpasswort wird ein neues Einmal-Passwort gesetzt; ein bisheriges Passwort wird dadurch ungültig. Danach öffnet sich der Druckdialog. Fortfahren?")) return;
    setPending(true);
    setError(null);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sitzung abgelaufen. Bitte erneut anmelden.");
      const { data: current, error: readError } = await supabase.rpc("get_class_onboarding_credentials", { p_class_id: classId });
      if (readError) throw new Error(readError.message);
      const existing = new Set((current ?? []).map((row: any) => row.student_user_id));
      const missing = students.filter((student) => !existing.has(student.user_id));
      for (const student of missing) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/reset-student-password`, {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ classId, studentUserId: student.user_id }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? `Passwort für ${student.display_name ?? student.username ?? "Schüler:in"} konnte nicht erstellt werden.`);
      }
      const { data, error: finalError } = await supabase.rpc("get_class_onboarding_credentials", { p_class_id: classId });
      if (finalError) throw new Error(finalError.message);
      const activeIds = new Set(students.map((student) => student.user_id));
      const printable = (data ?? []).filter((row: any) => activeIds.has(row.student_user_id));
      if (printable.length !== students.length) throw new Error("Der Druckbogen ist unvollständig. Bitte erneut versuchen oder die Klassenliste aktualisieren.");
      setCards(printable);
      document.body.classList.add("printing-onboarding");
      window.setTimeout(() => window.print(), 250);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Druckbogen konnte nicht vorbereitet werden.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button type="button" onClick={prepareAndPrint} disabled={pending || students.length === 0}
        aria-label="Onboarding-Dokument drucken" title="Onboarding-Dokument drucken"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-white text-slate-600 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-40">
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
      </button>
      {error && <span role="alert" className="basis-full text-xs text-red-600">{error}</span>}
      <section className="onboarding-print" aria-hidden="true">
        <header className="onboarding-print-header">
          <div className="onboarding-brand">DR1FT · SCHÜLER-LOGIN</div>
          <h1>Zugangskarten</h1>
          <p>Bitte die Karten entlang der Schnittlinien ausschneiden und einzeln ausgeben.</p>
        </header>
        <div className="onboarding-card-grid">
          {cards.map((card) => (
            <article className="onboarding-card" key={card.student_user_id}>
              <div className="onboarding-card-top"><strong>{card.display_name || card.username}</strong><span>DR1FT</span></div>
              <div className="onboarding-field"><span>KLASSENCODE</span><b>{card.class_access_code}</b></div>
              <div className="onboarding-field"><span>NUTZERNAME</span><b>{card.username}</b></div>
              <div className="onboarding-field"><span>STARTPASSWORT · EINMALIG</span><b>{card.password}</b></div>
              <p className="onboarding-note">Beim ersten Anmelden ein eigenes Passwort festlegen.</p>
            </article>
          ))}
        </div>
        <footer className="onboarding-print-footer">Zugangsdaten vertraulich behandeln · Nicht öffentlich aushängen</footer>
      </section>
      <style jsx global>{`
        .onboarding-print { display: none; }
        @page { size: A4 portrait; margin: 12mm; }
        @media print {
          body.printing-onboarding * { visibility: hidden !important; }
          body.printing-onboarding .onboarding-print,
          body.printing-onboarding .onboarding-print * { visibility: visible !important; }
          body.printing-onboarding .onboarding-print {
            display: block !important; position: absolute; inset: 0; width: 100%; color: #111827;
            font-family: Arial, sans-serif; background: white;
          }
          .onboarding-print-header { margin-bottom: 8mm; }
          .onboarding-brand { font-size: 8pt; letter-spacing: .18em; font-weight: 700; color: #6d28d9; }
          .onboarding-print-header h1 { margin: 2mm 0 1mm; font-size: 19pt; }
          .onboarding-print-header p { margin: 0; font-size: 9pt; color: #4b5563; }
          .onboarding-card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7mm 7mm; }
          .onboarding-card {
            box-sizing: border-box; min-height: 58mm; padding: 5mm;
            border: 1.5px dashed #6b7280; outline: 1px repeating-linear-gradient(135deg, transparent 0 3px, #d1d5db 3px 4px);
            outline-offset: -2px; break-inside: avoid; page-break-inside: avoid;
          }
          .onboarding-card-top { display:flex; justify-content:space-between; gap:3mm; align-items:center; margin-bottom:4mm; font-size:12pt; }
          .onboarding-card-top span { font-size:7pt; letter-spacing:.18em; color:#7c3aed; font-weight:700; }
          .onboarding-field { display:flex; justify-content:space-between; gap:3mm; align-items:baseline; padding:1.8mm 0; border-bottom:1px solid #e5e7eb; }
          .onboarding-field span { font-size:7pt; letter-spacing:.08em; color:#6b7280; }
          .onboarding-field b { font-family:monospace; font-size:11pt; letter-spacing:.04em; text-align:right; overflow-wrap:anywhere; }
          .onboarding-note { margin:3mm 0 0; font-size:8pt; color:#4b5563; }
          .onboarding-print-footer { margin-top:7mm; text-align:center; font-size:7pt; color:#6b7280; }
        }
      `}</style>
    </>
  );
}
