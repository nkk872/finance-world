import { NextResponse } from "next/server";

type GdeltArticle = {
  title?: string;
  url?: string;
  domain?: string;
  seendate?: string;
  socialimage?: string;
};

export const revalidate = 900;

export async function GET() {
  const params = new URLSearchParams({
    query: '(finance OR "stock market" OR economy OR banking OR cryptocurrency)',
    mode: "ArtList",
    format: "json",
    maxrecords: "30",
    timespan: "24h",
    sort: "DateDesc",
  });

  try {
    const response = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?${params.toString()}`, {
      headers: { Accept: "application/json", "User-Agent": "FinanceWorld/1.0" },
      next: { revalidate: 900 },
    });
    if (!response.ok) {
      return NextResponse.json({ articles: [], error: "News provider request failed." }, { status: 502 });
    }

    const payload = await response.json();
    const articles = ((payload.articles ?? []) as GdeltArticle[])
      .filter((article) => article.title && article.url)
      .map((article) => ({
        title: article.title!,
        url: article.url!,
        domain: article.domain ?? new URL(article.url!).hostname,
        publishedAt: article.seendate ?? "",
        image: article.socialimage ?? null,
      }));

    return NextResponse.json(
      { articles, updatedAt: new Date().toISOString(), source: "GDELT" },
      { headers: { "Cache-Control": "s-maxage=900, stale-while-revalidate=3600" } },
    );
  } catch {
    return NextResponse.json({ articles: [], error: "Could not load the live news feed." }, { status: 502 });
  }
}
