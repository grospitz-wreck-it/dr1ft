// apps/player/app/join/page.tsx
import { redirect } from "next/navigation";
import { supabaseServerClient } from "../../lib/supabaseServerClient";

export default async function JoinPage() {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Student onboarding/registration must not be shown at /join.
  // Existing sessions go straight to the feed; everyone else uses student login.
  redirect(user ? "/feed" : "/login");
}
