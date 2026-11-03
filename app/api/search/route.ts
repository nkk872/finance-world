import { NextRequest, NextResponse } from "next/server";
import { GET as getNewsFeed } from "../news/route";

export const maxDuration = 10;

export async function GET(request: NextRequest) {
  const term = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 100);
  if (term.length < 2) {
    return NextResponse.json({ articles: [], error: "Enter at least two characters to search." }, { status: 400 });
  }

  try {
    // Search the same verified multi-publisher feed used by the homepage.
    // This avoids relying on the external GDELT search endpoint, which is
    // timing out from the current hosting environment.
    const feedResponse = await getNewsFeed();
    if (!feedResponse.ok) throw new Error("News feed unavailable");
    const feed = await feedResponse.json();
    const lower = term.toLowerCase();
    const stem = lower.replace(/s$/, "");
    const articles = (Array.isArray(feed.articles) ? feed.articles : [])
      .filter((article: Record<string, unknown>) => {
        const searchable = [
          article.title, article.summary, article.country,
          article.region, article.category
        ].filter(Boolean).join(" ").toLowerCase();
        return searchable.includes(stem) || searchable.includes(lower);
      })
      .slice(0, 50);

    return NextResponse.json(
      { articles, updatedAt: feed.updatedAt || new Date().toISOString(), source: "Finance World live feed" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { articles: [], message: "Search is temporarily unavailable. Please try again shortly." },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
