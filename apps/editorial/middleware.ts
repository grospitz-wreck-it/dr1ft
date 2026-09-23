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
  request.headers.set("x-pathname", request.nextUrl.pathname);

  // Auth pages do not need a Supabase server client at all.
  // This also keeps the login/reset pages completely independent of
  // session-cookie parsing.
  if (isPublicAuthPath(request.nextUrl.pathname)) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Keep both the request and response cookies in sync. This is
          // important when Supabase refreshes an expired session token:
          // Server Components must see the refreshed request cookie in the
          // same request in which middleware refreshes it.
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { data: staffRow } = await supabase
    .from("platform_staff")
    .select("user_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  // platform_admin is explicitly a global editorial super-admin.
  // Other platform_staff roles are also allowed into the editorial app.
  if (!staffRow) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "not-authorized");
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
