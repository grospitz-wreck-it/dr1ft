import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_AUTH_PATHS = ["/login", "/forgot-password", "/reset-password"];
const SCHOOL_HOST = (process.env.SCHOOL_HOST ?? "schule.dr1ft.de").toLowerCase();

function isPublicAuthPath(pathname: string) {
  return PUBLIC_AUTH_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );
}

function withRequestContext(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);
  headers.set("x-dr1ft-host", request.nextUrl.hostname.toLowerCase());
  return headers;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hostname = request.nextUrl.hostname.toLowerCase();
  const isSchoolHost = hostname === SCHOOL_HOST;

  if (isPublicAuthPath(pathname)) {
    return NextResponse.next({
      request: { headers: withRequestContext(request) },
    });
  }

  let response = NextResponse.next({
    request: { headers: withRequestContext(request) },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: { headers: withRequestContext(request) },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const { data: membership } = await supabase
    .from("school_memberships")
    .select("school_id, role")
    .eq("user_id", user.id)
    .eq("active", true)
    .in("role", ["school_admin", "school_lead"])
    .maybeSingle();

  if (isSchoolHost) {
    if (!membership) {
      const url = new URL("/login", request.url);
      url.searchParams.set("error", "not-authorized");
      return NextResponse.redirect(url);
    }

    const ownSchoolPath = `/schools/${membership.school_id}`;

    if (pathname === "/" || pathname === "/school-admin" || pathname.startsWith("/school-admin/")) {
      return NextResponse.redirect(new URL(ownSchoolPath, request.url));
    }

    if (pathname === ownSchoolPath) {
      return response;
    }

    if (pathname.startsWith("/schools/")) {
      return NextResponse.redirect(new URL(ownSchoolPath, request.url));
    }

    return NextResponse.redirect(new URL(ownSchoolPath, request.url));
  }

  const { data: staff } = await supabase
    .from("platform_staff")
    .select("user_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (staff?.role === "platform_admin") {
    return response;
  }

  const url = new URL("/login", request.url);
  url.searchParams.set("error", "not-authorized");
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
