import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const revalidate = 0;

type GdeltArticle = { title?: string; url?: string; domain?: string; seendate?: string; socialimage?: string };

export async function GET() {
  if (!(await hasAdminSession())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const params = new URLSearchParams({
    query: '(finance OR "stock market" OR economy OR banking OR cryptocurrency)',
    mode: "ArtList", format: "json", maxrecords: "30", timespan: "24h", sort: "DateDesc",
  });

  try {
    const response = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?${params.toString()}`, {
      headers: { Accept: "application/json", "User-Agent": "FinanceWorld/1.0" },
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ error: "News discovery provider is temporarily unavailable." }, { status: 502 });
    const payload = await response.json();
    const articles = ((payload.articles ?? []) as GdeltArticle[])
      .filter((a) => a.title && a.url)
      .map((a) => ({
        title: a.title!, url: a.url!,
        domain: a.domain ?? new URL(a.url!).hostname,
        publishedAt: a.seendate ?? "", image: a.socialimage ?? null,
        status: "Needs review" as const,
      }));
    return NextResponse.json({ articles, count: articles.length, source: "GDELT", note: "Discovery only. These headlines have not been AI-verified or approved for publication." });
  } catch {
    return NextResponse.json({ error: "Could not retrieve the news discovery feed." }, { status: 502 });
  }
}
