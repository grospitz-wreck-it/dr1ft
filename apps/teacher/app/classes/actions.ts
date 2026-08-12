// apps/teacher/app/classes/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServerClient } from "../../lib/supabaseServerClient";

/**
 * Erzeugt einen gut lesbaren, kollisionsarmen Zugangscode für Schüler:innen.
 * Bewusst ohne verwechselbare Zeichen (0/O, 1/I) — wird von Hand abgetippt.
 */
function generateAccessCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

/**
 * Legt eine neue Klasse an und macht den aktuellen Nutzer zur Lehrkraft.
 * Erwartet ein FormData mit "name" und optional "schoolId".
 */
export async function createClass(formData: FormData) {
  const supabase = supabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Nicht authentifiziert");
  }

  const name = String(formData.get("name") ?? "").trim();
  const schoolId = formData.get("schoolId") ? String(formData.get("schoolId")) : null;
  const gradeLevelRaw = formData.get("gradeLevel");
  const gradeLevel = gradeLevelRaw ? Number(gradeLevelRaw) : null;

  if (!name) {
    throw new Error("Klassenname darf nicht leer sein");
  }

  // Zugangscode generieren, bei (seltener) Kollision neu versuchen
  let accessCode = generateAccessCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await supabase
      .from("classes")
      .select("id")
      .eq("access_code", accessCode)
      .maybeSingle();
    if (!existing) break;
    accessCode = generateAccessCode();
  }

  const { data: newClass, error: classError } = await supabase
    .from("classes")
    .insert({
      name,
      school_id: schoolId,
      grade_level: gradeLevel,
      access_code: accessCode,
      created_by: user.id,
    })
    .select()
    .single();

  if (classError || !newClass) {
    throw new Error(classError?.message ?? "Klasse konnte nicht angelegt werden");
  }

  // Ersteller wird automatisch Lehrkraft dieser Klasse
  const { error: membershipError } = await supabase.from("class_memberships").insert({
    class_id: newClass.id,
    user_id: user.id,
    role: "teacher",
  });

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  revalidatePath("/classes");
  redirect(`/classes/${newClass.id}`);
}

/**
 * Schaltet ein Szenario für eine Klasse frei oder sperrt es wieder.
 * Sicherer Default bleibt erhalten: ohne Zeile in class_scenario_assignments
 * ist ein Szenario für die Klasse nicht sichtbar (siehe Feed Engine + RLS).
 */
export async function toggleScenarioAssignment(
  classId: string,
  scenarioId: string,
  shouldBeAssigned: boolean,
  pacingMode: "compact" | "as_designed" = "compact"
) {
  const supabase = supabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Nicht authentifiziert");
  }

  // Berechtigungsprüfung: nur Lehrkraft/Admin dieser Klasse darf das
  const { data: isTeacher } = await supabase.rpc("is_teacher_of_class", {
    target_class_id: classId,
  });
  if (!isTeacher) {
    throw new Error("Keine Berechtigung für diese Klasse");
  }

  if (shouldBeAssigned) {
    const { error } = await supabase.from("class_scenario_assignments").insert({
      class_id: classId,
      scenario_id: scenarioId,
      assigned_by: user.id,
      pacing_mode: pacingMode,
    });
    // Unique-Constraint-Verstoß (bereits zugewiesen) ist unkritisch, ignorieren
    if (error && error.code !== "23505") {
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase
      .from("class_scenario_assignments")
      .delete()
      .eq("class_id", classId)
      .eq("scenario_id", scenarioId);
    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath(`/classes/${classId}`);
}

/**
 * Wechselt den Pacing-Modus einer bestehenden Zuweisung, ohne sie neu
 * anzulegen — z.B. wenn eine Lehrkraft nachträglich von "kompakt" (eine
 * Schulstunde) auf "verteilt" (mehrere Tage, mit Wartezeiten zwischen
 * den Arc-Schritten) wechseln möchte.
 */
export async function updateScenarioPacing(
  classId: string,
  scenarioId: string,
  pacingMode: "compact" | "as_designed"
) {
  const supabase = supabaseServerClient();
  const { error } = await supabase
    .from("class_scenario_assignments")
    .update({ pacing_mode: pacingMode })
    .eq("class_id", classId)
    .eq("scenario_id", scenarioId);

  if (error) throw new Error(error.message);
  revalidatePath(`/classes/${classId}`);
}
