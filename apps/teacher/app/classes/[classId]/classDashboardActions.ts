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

  const { data: canAccessDashboard, error: dashboardPermissionError } = await supabase.rpc(
    "can_access_class_dashboard",
    { p_class_id: classId },
  );

  if (dashboardPermissionError || !canAccessDashboard) {
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


export async function loadClassAggregateReport(classId: string) {
  if (!classId) throw new Error("Ungültige Klassen-ID.");
  const supabase = supabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Bitte melde dich erneut an.");
  const { data, error } = await supabase.rpc("get_class_aggregate_learning_report_v1", {
    p_class_id: classId,
  });
  if (error) {
    console.error("[class-aggregate-report] failed", { classId, userId: user.id, code: error.code });
    throw new Error("Das aggregierte Klassenreporting konnte nicht geladen werden.");
  }
  return data;
}
