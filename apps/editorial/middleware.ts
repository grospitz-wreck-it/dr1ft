// apps/admin/middleware.ts
// Session-Refresh + Zugangsprüfung für die Redaktionsanwendung.

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_AUTH_PATHS = ["/login", "/forgot-password", "/reset-password"];

function isPublicAuthPath(pathname: string) {
  return PUBLIC_AUTH_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );
}

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response = NextResponse.next({
            request: { headers: requestHeaders },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response = NextResponse.next({
            request: { headers: requestHeaders },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Auth pages are public. We still run the middleware here so the root
  // layout receives x-pathname and can hide the application navigation.
  if (isPublicAuthPath(request.nextUrl.pathname)) {
    return response;
  }

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Editorial access is explicitly limited to platform staff.
  const { data: staffRow } = await supabase
    .from("platform_staff")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!staffRow) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "not-authorized");
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  // Include the auth pages as well: they need x-pathname so the root
  // layout does not render the application navigation on the login screen.
  matcher: ["/((?!_next|favicon.ico).*)"],
};
