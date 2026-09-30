"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
export function GenerateReportButton({ classId, studentUserId }: { classId: string; studentUserId: string }) {
 const [pending,setPending]=useState(false); const [error,setError]=useState("");
 async function generate(){
  setPending(true); setError("");
  try{
   const supabase=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
   const {data:{session}}=await supabase.auth.getSession();
   const res=await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-teacher-report`,{method:"POST",headers:{Authorization:`Bearer ${session?.access_token}`,apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,"Content-Type":"application/json"},body:JSON.stringify({classId,studentId:studentUserId})});
   const data=await res.json().catch(()=>null);
   if(!res.ok) throw new Error(data?.error??"Report konnte nicht erstellt werden");
   window.location.href=`/classes/${classId}/reports/${studentUserId}`;
  }catch(e){setError(e instanceof Error?e.message:"Fehler");}finally{setPending(false);}
 }
 return <span className="inline-flex items-center gap-2"><button type="button" onClick={generate} disabled={pending} className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">{pending?"Erstelle …":"PDF-Report"}</button>{error&&<span className="text-xs text-red-600">{error}</span>}</span>;
}