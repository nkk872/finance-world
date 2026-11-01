import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const expected = process.env.NEWSROOM_ADMIN_TOKEN;
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Basic\s+(.+)$/i);
  let supplied = "";
  if (match) {
    try {
      const decoded = atob(match[1]);
      const separator = decoded.indexOf(":");
      supplied = separator >= 0 ? decoded.slice(separator + 1) : "";
    } catch {}
  }
  if (expected && supplied && supplied === expected) {
    return NextResponse.next();
  }
  return new NextResponse("Owner login required. Sign in with your owner credentials.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Finance World Owner", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

export const config = { matcher: ["/admin/:path*"] };
