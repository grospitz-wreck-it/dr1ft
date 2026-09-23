import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

function sign(value: string) {
  return createHmac("sha256", process.env.STAGING_SESSION_SECRET ?? "")
    .update(value)
    .digest("base64url");
}

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const nextValue = String(form.get("next") ?? "/");
  const next = nextValue.startsWith("/") ? nextValue : "/";

  const expected = process.env.STAGING_PASSWORD ?? "";
  if (!expected || password.length !== expected.length) {
    return NextResponse.redirect(new URL("/staging?error=1", request.url), 303);
  }

  const passwordOk = timingSafeEqual(Buffer.from(password), Buffer.from(expected));
  if (!passwordOk || !process.env.STAGING_SESSION_SECRET) {
    return NextResponse.redirect(new URL("/staging?error=1", request.url), 303);
  }

  const payload = `v1.${Date.now()}`;
  const token = `${payload}.${sign(payload)}`;

  const response = NextResponse.redirect(new URL(next, request.url), 303);
  response.cookies.set("dr1ft_staging", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
