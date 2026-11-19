import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "ttg_admin";

async function generateToken(secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("ttg_admin_session_v1"));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function isValidToken(token: string): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const expected = await generateToken(secret);
  // Constant-time comparison
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (pathname.startsWith("/admin")) {
    if (!token || !(await isValidToken(token))) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Backend API (proxied through /api): admin only, except signing in/out and reading published blogs.
  if (pathname.startsWith("/api/")) {
    const isAuth = pathname.startsWith("/api/auth/");
    const isPublicRead = request.method === "GET" && pathname.startsWith("/api/blogs/published");
    if (!isAuth && !isPublicRead && (!token || !(await isValidToken(token)))) {
      return NextResponse.json({ error: "Sign in to the admin to do this." }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
