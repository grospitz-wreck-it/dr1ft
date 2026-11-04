"use server";

import { supabaseServerClient } from "../../../lib/supabaseServerClient";

export async function loadClassDashboardReport(classId: string) {
  if (!classId || typeof classId !== "string") {
    throw new Error("Ungültige Klassen-ID.");
  }

  const supabase = supabaseServerClient();
  const [{ data: { user }, error: userError }, { data: instance, error: instanceError }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("class_instances").select("id,school_id").eq("id", classId).maybeSingle(),
  ]);

  if (userError || !user) throw new Error("Bitte melde dich erneut an.");
  if (instanceError || !instance) throw new Error("Klasse nicht gefunden.");

  const [{ data: schoolMembership }, { data: teacherMembership }] = await Promise.all([
    instance.school_id
      ? supabase.from("school_memberships").select("role").eq("school_id", instance.school_id).eq("user_id", user.id).eq("active", true).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("class_instance_memberships").select("id").eq("class_instance_id", classId).eq("user_id", user.id).eq("role", "teacher").is("left_at", null).maybeSingle(),
  ]);

  if (schoolMembership?.role !== "school_admin" && !teacherMembership) {
    throw new Error("Du darfst das Lernreporting dieser Klasse nicht einsehen.");
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.access_token) throw new Error("Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.");

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/teacher-dashboard`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ classId }),
      cache: "no-store",
    },
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("[class-dashboard-report] edge function failed", response.status, payload);
    throw new Error(payload?.error || "Das Lernreporting konnte nicht erstellt werden.");
  }
  return payload;
}
