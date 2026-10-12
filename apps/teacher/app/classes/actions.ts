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
  const { data: schoolMembership } = await supabase
    .from("school_memberships")
    .select("school_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const schoolId = schoolMembership?.school_id ?? null;
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
    // A class instance may have exactly one active module.
    // Remove the previous assignment first; progress remains in the
    // instance-scoped learning tables and is therefore not deleted.
    const { error: clearError } = await supabase
      .from("class_instance_scenario_assignments")
      .delete()
      .eq("class_instance_id", classId)
      .neq("scenario_id", scenarioId);
    if (clearError) throw new Error(clearError.message);

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


export async function setClassActive(classId: string, isActive: boolean) {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert");

  const { error } = await supabase
    .from("class_instances")
    .update({ is_active: isActive, status: isActive ? "active" : "paused" })
    .eq("id", classId);

  if (error) throw new Error(error.message);
  revalidatePath("/classes");
  revalidatePath(`/classes/${classId}`);
}


export async function changeClassState(classId: string, active: boolean) {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert");
  const { error } = await supabase.from("class_instances").update({ is_active: active, status: active ? "active" : "ended" }).eq("id", classId);
  if (error) throw new Error(error.message);
  revalidatePath("/classes");
  revalidatePath("/classes/" + classId);
}



export async function updateClassStatus(
  classId: string,
  formData: FormData,
) {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Nicht authentifiziert");

  const status = String(formData.get("status") ?? "");

  if (!["active", "paused", "ended"].includes(status)) {
    throw new Error("Ungültiger Klassenstatus");
  }

  const { error } = await supabase
    .from("class_instances")
    .update({
      status,
      is_active: status === "active",
    })
    .eq("id", classId);

  if (error) throw new Error(error.message);

  revalidatePath("/classes");
  revalidatePath(`/classes/${classId}`);
}


export async function updateClassDetails(classId: string, formData: FormData) {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert");

  const name = String(formData.get("name") ?? "").trim();
  const gradeLevelRaw = String(formData.get("gradeLevel") ?? "").trim();
  const schoolYear = String(formData.get("schoolYear") ?? "").trim();

  if (!name) throw new Error("Klassenname darf nicht leer sein");
  const gradeLevel = gradeLevelRaw ? Number(gradeLevelRaw) : null;
  if (gradeLevel !== null && (!Number.isInteger(gradeLevel) || gradeLevel < 1 || gradeLevel > 13)) {
    throw new Error("Ungültiger Jahrgang");
  }
  if (!schoolYear) throw new Error("Schuljahr darf nicht leer sein");

  const { error } = await supabase
    .from("class_instances")
    .update({ name, grade_level: gradeLevel, school_year: schoolYear })
    .eq("id", classId);

  if (error) throw new Error(error.message);
  revalidatePath("/classes");
  revalidatePath("/classes/" + classId);
}


export async function archiveClass(classId: string) {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert");
  const { error } = await supabase.from("class_instances").update({ is_active: false, status: "ended" }).eq("id", classId);
  if (error) throw new Error(error.message);
  revalidatePath("/classes");
  revalidatePath("/classes/" + classId);
}
