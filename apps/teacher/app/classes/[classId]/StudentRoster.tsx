"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

function supabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

type Student = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_seed: string | null;
};

export function StudentRoster({ classId, initialStudents }: { classId: string; initialStudents: Student[] }) {
  const [students, setStudents] = useState(initialStudents);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Student | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => `${s.display_name ?? ""} ${s.username ?? ""}`.toLowerCase().includes(q));
  }, [students, query]);

  async function manage(action: "update" | "remove", student: Student, values?: { displayName: string; username: string }) {
    setPending(true);
    setError(null);
    try {
      const supabase = supabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/manage-student-account`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action, classId, studentUserId: student.user_id, ...values }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Änderung konnte nicht gespeichert werden");
      if (action === "remove") setStudents((current) => current.filter((s) => s.user_id !== student.user_id));
      else setStudents((current) => current.map((s) => s.user_id === student.user_id ? { ...s, display_name: values?.displayName ?? s.display_name, username: values?.username ?? s.username } : s));
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="bg-panel border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-border flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Schüler:innen</h2>
          <p className="text-sm text-slate-500 mt-0.5">{students.length} aktive Schüler:innen · Verwaltung direkt in der Liste</p>
        </div>
        <div className="relative w-full md:w-72">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Schüler:in suchen …" className="w-full rounded-xl border border-border bg-canvas px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/10" />
        </div>
      </div>

      {error && <div className="mx-5 mt-4 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="divide-y divide-border">
        {filtered.map((student) => (
          <div key={student.user_id} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50/70 transition">
            <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-indigo-100 to-slate-200 grid place-items-center text-sm font-semibold text-indigo-700">
              {(student.display_name ?? student.username ?? "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-900 truncate">{student.display_name || "Ohne Anzeigename"}</p>
              <p className="text-sm text-slate-500 truncate">@{student.username || "—"}</p>
            </div>
            <div className="hidden sm:block text-xs text-slate-400">Schüler:in</div>
            <div className="flex items-center gap-2">
              <a href={`/classes/${classId}/reports/${student.user_id}`} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">Report</a>
              <button type="button" onClick={() => setEditing(student)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">Bearbeiten</button>
              <button type="button" onClick={() => { if (window.confirm(`${student.display_name || "Diese Person"} wirklich aus der Klasse entfernen?`)) manage("remove", student); }} disabled={pending} className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">Entfernen</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-400">Keine Schüler:innen gefunden.</div>}
      </div>

      {editing && (
        <EditStudentModal student={editing} pending={pending} onClose={() => setEditing(null)} onSave={(values) => manage("update", editing, values)} />
      )}
    </section>
  );
}

function EditStudentModal({ student, pending, onClose, onSave }: { student: Student; pending: boolean; onClose: () => void; onSave: (values: { displayName: string; username: string }) => void }) {
  const [displayName, setDisplayName] = useState(student.display_name ?? "");
  const [username, setUsername] = useState(student.username ?? "");
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-border p-6">
        <div className="flex items-start justify-between gap-4">
          <div><h3 className="text-lg font-semibold text-slate-900">Schüler:in bearbeiten</h3><p className="text-sm text-slate-500 mt-1">Anzeigename und Nutzername werden sofort übernommen.</p></div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">×</button>
        </div>
        <div className="space-y-4 mt-6">
          <label className="block"><span className="text-xs font-medium text-slate-600">Anzeigename</span><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm" /></label>
          <label className="block"><span className="text-xs font-medium text-slate-600">Nutzername</span><input value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm" /></label>
        </div>
        <div className="flex justify-end gap-2 mt-6"><button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm">Abbrechen</button><button type="button" disabled={pending || !displayName.trim() || !username.trim()} onClick={() => onSave({ displayName: displayName.trim(), username: username.trim() })} className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">{pending ? "Speichert …" : "Speichern"}</button></div>
      </div>
    </div>
  );
}
