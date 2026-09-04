"use client";

import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  async function signOut() {
    if (pending) return;
    setPending(true);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Editorial sign out failed:", error);
      setPending(false);
      return;
    }

    window.location.href = "/login";
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-slate-500 transition hover:bg-canvas hover:text-slate-900 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" strokeWidth={1.75} />
      )}
      {pending ? "Abmelden …" : "Abmelden"}
    </button>
  );
}
