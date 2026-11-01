import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

export function middleware(request: NextRequest) {
  const secret = process.env.NEWSROOM_ADMIN_TOKEN;
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Basic\s+(.+)$/i);
  let supplied = "";
  if (match) {
    try {
      const decoded = atob(match[1]);
      supplied = decoded.slice(decoded.indexOf(":") + 1);
    } catch {}
  }
  const expectedBuffer = Buffer.from(secret ?? "");
  const suppliedBuffer = Buffer.from(supplied);
  const authorized = Boolean(secret && match && expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer));
  if (authorized) return NextResponse.next();
  return new NextResponse("Owner login required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Finance World Owner", charset="UTF-8"', "Cache-Control": "no-store" },
  });
}

export const config = { matcher: ["/admin/:path*"] };