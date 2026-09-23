import { NextRequest, NextResponse } from "next/server";

const COOKIE = "dr1ft_staging";

function base64Url(bytes: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function verifyToken(token: string, secret: string) {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;

  const timestamp = Number(parts[1]);
  if (!Number.isFinite(timestamp) || Date.now() - timestamp > 12 * 60 * 60 * 1000) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  return base64Url(signature) === parts[2];
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/staging" ||
    pathname.startsWith("/api/staging/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE)?.value;
  const secret = process.env.STAGING_SESSION_SECRET;

  if (token && secret && await verifyToken(token, secret)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/staging";
  url.searchParams.set("next", pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
