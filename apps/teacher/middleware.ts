// apps/teacher/middleware.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      get(name: string) { return request.cookies.get(name)?.value; },
      set(name: string, value: string, options: CookieOptions) { response = NextResponse.next({ request: { headers: request.headers } }); response.cookies.set({ name, value, ...options }); },
      remove(name: string, options: CookieOptions) { response = NextResponse.next({ request: { headers: request.headers } }); response.cookies.set({ name, value: "", ...options }); },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  const publicRoute = request.nextUrl.pathname.startsWith("/login") || request.nextUrl.pathname.startsWith("/signup") || request.nextUrl.pathname.startsWith("/reset-password");
  if (!user && !publicRoute) return NextResponse.redirect(new URL("/login", request.url));
  return response;
}

export const config = { matcher: ["/((?!login|signup|reset-password|_next|favicon.ico).*)"] };
