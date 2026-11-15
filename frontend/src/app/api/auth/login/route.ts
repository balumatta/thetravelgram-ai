import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "ttg_admin";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

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

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    // Constant delay to prevent timing attacks
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = await generateToken(process.env.ADMIN_SECRET!);
  const response = NextResponse.json({ success: true });

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return response;
}
