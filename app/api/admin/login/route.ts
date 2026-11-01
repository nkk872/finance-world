import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminSession, adminCookieName, adminSessionSeconds } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const configured = process.env.ADMIN_PASSWORD;
  if (!configured) return NextResponse.json({ error: "Admin login is not configured yet." }, { status: 503 });

  let body: { password?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const supplied = Buffer.from(typeof body.password === "string" ? body.password : "");
  const expected = Buffer.from(configured);
  const valid = supplied.length === expected.length && timingSafeEqual(supplied, expected);
  if (!valid) return NextResponse.json({ error: "Incorrect password." }, { status: 401 });

  try {
    const session = createAdminSession();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(adminCookieName, session.value, {
      httpOnly: true, secure: process.env.NODE_ENV === "production",
      sameSite: "strict", path: "/", maxAge: adminSessionSeconds,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Admin session secret is not configured correctly." }, { status: 503 });
  }
}
