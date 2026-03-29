import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";

const SESSION_COOKIE = "demo_session";
const SESSION_EXPIRY = "7d";

function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  const demoPassword = process.env.DEMO_PASSWORD;
  if (!demoPassword || password !== demoPassword) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = getSessionSecret();
  const token = await new SignJWT({ role: "demo" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(SESSION_EXPIRY)
    .sign(secret);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 días
    path: "/",
  });

  return response;
}
