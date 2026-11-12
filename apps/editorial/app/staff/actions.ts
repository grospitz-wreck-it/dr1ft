// apps/admin/app/staff/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerClient } from "../../lib/supabaseServerClient";

/**
 * Fügt einen Nutzer per Auth-User-ID zum Redaktionsteam hinzu.
 * Erwartet die Supabase-Auth-ID (nicht die E-Mail) — ein Lookup per
 * E-Mail ist über den anon/authenticated-Client nicht möglich, dafür
 * bräuchte es den Service-Role-Key (bewusst nicht im Client-Code).
 * RLS erlaubt diese Aktion nur, wenn der Aufrufer selbst platform_admin ist
 * (siehe 0009_staff_admin_policy.sql) — zusätzliche Absicherung hier im
 * Code ist daher nicht nötig, RLS übernimmt die eigentliche Durchsetzung.
 */
export async function addStaffMember(formData: FormData) {
  const supabase = supabaseServerClient();

  const userId = String(formData.get("userId") ?? "").trim();
  const role = String(formData.get("role") ?? "editor");

  if (!userId) throw new Error("Auth-User-ID darf nicht leer sein");

  const { error } = await supabase.from("platform_staff").insert({
    user_id: userId,
    role,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/staff");
}

export async function removeStaffMember(userId: string) {
  const supabase = supabaseServerClient();
  const { error } = await supabase.from("platform_staff").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/staff");
}

export async function updateStaffRole(userId: string, role: string) {
  const supabase = supabaseServerClient();
  const { error } = await supabase.from("platform_staff").update({ role }).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/staff");
}
