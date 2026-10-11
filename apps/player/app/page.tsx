import { redirect } from "next/navigation";
import { supabaseServerClient } from "../lib/supabaseServerClient";

export default async function PlayerHomePage() {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  redirect(user ? "/feed" : "/login");
}
