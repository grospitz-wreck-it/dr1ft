// apps/teacher/app/classes/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServerClient } from "../../lib/supabaseServerClient";

function generateAccessCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

export async function createClass(formData: FormData) {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert");

  const name = String(formData.get("name") ?? "").trim();
  const schoolId = formData.get("schoolId") ? String(formData.get("schoolId")) : null;
  const gradeLevelRaw = formData.get("gradeLevel");
  const gradeLevel = gradeLevelRaw ? Number(gradeLevelRaw) : null;
  if (!name) throw new Error("Klassenname darf nicht leer sein");

  const { error: profileError } = await supabase
    .from("user_profiles")
    .upsert({ id: user.id }, { onConflict: "id" });
  if (profileError) throw new Error(profileError.message);

  let accessCode = generateAccessCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await supabase.from("classes").select("id").eq("access_code", accessCode).maybeSingle();
    if (!existing) break;
    accessCode = generateAccessCode();
  }

  const { data: newClass, error: classError } = await supabase
    .from("classes")
    .insert({ name, school_id: schoolId, grade_level: gradeLevel, access_code: accessCode, created_by: user.id })
    .select()
    .single();
  if (classError || !newClass) throw new Error(classError?.message ?? "Klasse konnte nicht angelegt werden");

  const { error: membershipError } = await supabase.from("class_memberships").insert({
    class_id: newClass.id,
    user_id: user.id,
    role: "teacher",
  });
  if (membershipError) throw new Error(membershipError.message);

  const schoolYear = String(formData.get("schoolYear") ?? "2026/27").trim() || "2026/27";
  const { data: instanceId, error: instanceError } = await supabase.rpc("create_class_instance_from_class", {
    p_class_id: newClass.id,
    p_school_year: schoolYear,
  });
  if (instanceError || !instanceId) throw new Error(instanceError?.message ?? "Klasseninstanz konnte nicht angelegt werden");

  revalidatePath("/classes");
  redirect(`/classes/${instanceId}`);
}

export async function toggleScenarioAssignment(
  classId: string,
  scenarioId: string,
  shouldBeAssigned: boolean,
  pacingMode: "compact" | "as_designed" = "compact"
) {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert");

  if (shouldBeAssigned) {
    const { error } = await supabase.rpc("upsert_class_instance_scenario_assignment", {
      p_instance_id: classId,
      p_scenario_id: scenarioId,
      p_pacing_mode: pacingMode,
    });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.rpc("remove_class_instance_scenario_assignment", {
      p_instance_id: classId,
      p_scenario_id: scenarioId,
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/classes/${classId}`);
}

export async function updateScenarioPacing(
  classId: string,
  scenarioId: string,
  pacingMode: "compact" | "as_designed"
) {
  const supabase = supabaseServerClient();
  const { error } = await supabase.rpc("update_class_instance_scenario_pacing", {
    p_instance_id: classId,
    p_scenario_id: scenarioId,
    p_pacing_mode: pacingMode,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/classes/${classId}`);
}
