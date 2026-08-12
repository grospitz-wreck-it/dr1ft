// apps/admin/lib/supabaseServerClient.ts
// Echter Server Client mit Cookie-basierter Session (Next.js App Router).
// Voraussetzung: `npm install @supabase/ssr` in apps/admin.

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export function supabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // In Server Components kann set() fehlschlagen (readonly context) —
          // in Server Actions/Route Handlers funktioniert es. Bewusst try/catch,
          // damit Aufrufe aus Server Components nicht crashen.
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // no-op: Session-Refresh übernimmt dann die Middleware
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // no-op, siehe oben
          }
        },
      },
    }
  );
}

