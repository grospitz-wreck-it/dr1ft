import type { SupabaseClient } from "@supabase/supabase-js";

export async function getCurrentClassInstanceId(
  supabase: SupabaseClient
): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_current_class_instance_id");

  if (error || !data) return null;

  return data;
}
