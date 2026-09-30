"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { GenerateReportButton } from "./GenerateReportButton";

function supabaseBrowserClient() { return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); }
type Student = { user_id: string; display_name: string | null; username: string | null; avatar_seed: string | null };

export function StudentRoster({ classId, initialStudents }: { classId: string; initialStudents: Student[] }) {
  const [students, setStudents] = useState(initialStudents);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Student | null>(null);
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filtered = useMemo(() => { const q = query.trim().toLowerCase(); return q ? students.filter(s => `${s.display_name ?? ""} ${s.username ?? ""}`.toLowerCase().includes(q)) : students; }, [students, query]);

  async function createStudent(values: { displayName: string; username: string; password?: string }) {
    setPending(true); setError(null);
    try {
      const supabase = supabaseBrowserClient(); const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-student-account`, { method:"POST", headers:{Authorization:`Bearer ${session?.access_token}`,"Content-Type":"application/json"}, body:JSON.stringify({classId,...values}) });
      const data = await res.json(); if(!res.ok) throw new Error(data.error ?? "Schüler:in konnte nicht angelegt werden");
      setStudents(cur => [...cur, {user_id:data.student.id,display_name:data.student.displayName,username:data.student.username,avatar_seed:data.student.id}]);
      setAdding(false); window.alert(`Schüler:in angelegt\n\nNutzername: ${data.student.username}\nPasswort: ${data.tempPassword}\n\nBitte die Zugangsdaten jetzt notieren.`);
    } catch(e) { setError(e instanceof Error ? e.message : "Unbekannter Fehler"); } finally { setPending(false); }
  }

  async function manage(action:"update"|"remove", student:Student, values?:{displayName:string;username:string}) {
    setPending(true); setError(null);
    try {
      const supabase=supabaseBrowserClient(); const {data:{session}}=await supabase.auth.getSession();
      const res=await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/manage-student-account`,{method:"POST",headers:{Authorization:`Bearer ${session?.access_token}`,"Content-Type":"application/json"},body:JSON.stringify({action,classId,studentUserId:student.user_id,...values})});
      const data=await res.json(); if(!res.ok) throw new Error(data.error ?? "Änderung konnte nicht gespeichert werden");
      if(action==="remove") setStudents(cur=>cur.filter(s=>s.user_id!==student.user_id));
      else setStudents(cur=>cur.map(s=>s.user_id===student.user_id?{...s,display_name:values?.displayName??s.display_name,username:values?.username??s.username}:s));
      setEditing(null);
    } catch(e) { setError(e instanceof Error ? e.message : "Unbekannter Fehler"); } finally { setPending(false); }
  }

  return <section className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
    <div className="px-5 py-4 border-b border-border flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div><h2 className="text-base font-semibold text-slate-900">Schüler:innen</h2><p className="text-sm text-slate-500 mt-0.5">{students.length} aktiv · Verwaltung und Lernreport direkt hier</p></div>
      <div className="flex flex-col sm:flex-row gap-2"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Schüler:in suchen …" className="rounded-xl border border-border bg-canvas px-3 py-2 text-sm"/><button onClick={()=>setAdding(true)} className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white">+ Schüler:in</button></div>
    </div>
    {error && <div className="mx-5 mt-4 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
    <div className="divide-y divide-border">
      {filtered.map(student=><div key={student.user_id} className="px-5 py-4 flex items-center gap-4">
        <div className="h-10 w-10 shrink-0 rounded-full bg-indigo-50 grid place-items-center text-sm font-semibold text-indigo-700">{(student.display_name??student.username??"?").slice(0,1).toUpperCase()}</div>
        <div className="min-w-0 flex-1"><p className="font-medium text-slate-900 truncate">{student.display_name||"Ohne Anzeigename"}</p><p className="text-sm text-slate-500">@{student.username||"—"}</p></div>
        <div className="flex flex-wrap justify-end gap-2"><GenerateReportButton classId={classId} studentUserId={student.user_id}/><button onClick={()=>setEditing(student)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium">Bearbeiten</button><button onClick={()=>{if(window.confirm(`${student.display_name||"Diese Person"} wirklich aus der Klasse entfernen?`)) manage("remove",student)}} disabled={pending} className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">Entfernen</button></div>
      </div>)}
      {!filtered.length && <div className="px-5 py-10 text-center text-sm text-slate-400">Keine Schüler:innen gefunden.</div>}
    </div>
    {adding && <AddStudentModal pending={pending} onClose={()=>setAdding(false)} onSave={createStudent}/>}
    {editing && <EditStudentModal student={editing} pending={pending} onClose={()=>setEditing(null)} onSave={values=>manage("update",editing,values)}/>}
  </section>;
}

function AddStudentModal({pending,onClose,onSave}:{pending:boolean;onClose:()=>void;onSave:(v:{displayName:string;username:string;password?:string})=>void}) {
 const [displayName,setDisplayName]=useState(""); const [username,setUsername]=useState(""); const [password,setPassword]=useState("");
 return <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm grid place-items-center p-4"><form onSubmit={e=>{e.preventDefault();onSave({displayName:displayName.trim(),username:username.trim(),password:password.trim()||undefined})}} className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-border p-6"><h3 className="text-lg font-semibold">Schüler:in hinzufügen</h3><p className="text-sm text-slate-500 mt-1">Der Account wird direkt dieser Klasseninstanz zugeordnet.</p><div className="space-y-4 mt-6"><label className="block"><span className="text-xs font-medium">Anzeigename</span><input required value={displayName} onChange={e=>setDisplayName(e.target.value)} className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm"/></label><label className="block"><span className="text-xs font-medium">Nutzername</span><input required value={username} onChange={e=>setUsername(e.target.value)} className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm"/></label><label className="block"><span className="text-xs font-medium">Passwort <span className="text-slate-400">optional</span></span><input minLength={6} type="password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm" placeholder="Automatisch generieren lassen"/></label></div><div className="flex justify-end gap-2 mt-6"><button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm">Abbrechen</button><button disabled={pending} className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white">{pending?"Wird angelegt …":"Anlegen"}</button></div></form></div>;
}
function EditStudentModal({student,pending,onClose,onSave}:{student:Student;pending:boolean;onClose:()=>void;onSave:(v:{displayName:string;username:string})=>void}) {
 const [displayName,setDisplayName]=useState(student.display_name??""); const [username,setUsername]=useState(student.username??"");
 return <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm grid place-items-center p-4"><div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-border p-6"><div className="flex justify-between"><div><h3 className="text-lg font-semibold">Schüler:in bearbeiten</h3><p className="text-sm text-slate-500 mt-1">Anzeigename und Nutzername.</p></div><button onClick={onClose} className="text-slate-400">×</button></div><div className="space-y-4 mt-6"><label className="block"><span className="text-xs font-medium">Anzeigename</span><input value={displayName} onChange={e=>setDisplayName(e.target.value)} className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm"/></label><label className="block"><span className="text-xs font-medium">Nutzername</span><input value={username} onChange={e=>setUsername(e.target.value)} className="mt-1 w-full rounded-xl border border-border px-3 py-2.5 text-sm"/></label></div><div className="flex justify-end gap-2 mt-6"><button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm">Abbrechen</button><button disabled={pending||!displayName.trim()||!username.trim()} onClick={()=>onSave({displayName:displayName.trim(),username:username.trim()})} className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white">{pending?"Speichert …":"Speichern"}</button></div></div></div>;
}
