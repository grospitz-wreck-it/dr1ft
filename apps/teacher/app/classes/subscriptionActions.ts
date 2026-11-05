"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerClient } from "../../../lib/supabaseServerClient";

export async function subscribeToClass(classInstanceId: string) {
  if (!classInstanceId) throw new Error("Bitte wähle eine Klasse aus.");
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Bitte melde dich erneut an.");

  const { error } = await supabase.rpc("subscribe_teacher_to_class_instance", {
    p_class_instance_id: classInstanceId,
  });
  if (error) throw new Error(error.message || "Die Klasse konnte nicht abonniert werden.");

  revalidatePath("/");
  revalidatePath(`/classes/${classInstanceId}`);
  return { success: true };
}
