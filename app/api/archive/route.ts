import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || "30")));
  const query = (url.searchParams.get("q") || "").trim().replace(/[,*()]/g, " ").slice(0, 100);
  const category = (url.searchParams.get("category") || "").trim().slice(0, 40);
  const region = (url.searchParams.get("region") || "").trim().slice(0, 40);
  const country = (url.searchParams.get("country") || "").trim().slice(0, 60);
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!base || !key) {
    return NextResponse.json({ articles: [], total: 0, error: "News archive is not configured yet." }, { status: 503 });
  }

  const params = new URLSearchParams({
    select: "id,title,summary,article_url,source_name,source_domain,image_url,category,region,country,published_at",
    order: "published_at.desc.nullslast",
    limit: String(limit),
    offset: String((page - 1) * limit),
  });
  if (category && category !== "All") params.set("category", "eq." + category);
  if (region && region !== "All Regions") params.set("region", "eq." + region);
  if (country && country !== "All Countries") params.set("country", "eq." + country);
  if (query.length >= 2) {
    const pattern = "*" + query + "*";
    params.set("or", "(title.ilike." + pattern + ",summary.ilike." + pattern + ",source_name.ilike." + pattern + ")");
  }

  try {
    const response = await fetch(base + "/rest/v1/news_articles?" + params.toString(), {
      headers: { apikey: key, Authorization: "Bearer " + key, Prefer: "count=exact", Range: ((page - 1) * limit) + "-" + (page * limit - 1) },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Archive query failed: " + response.status);
    const rows = await response.json();
    const range = response.headers.get("content-range") || "";
    const total = Number(range.split("/")[1] || rows.length);
    const articles = rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      url: row.article_url,
      domain: row.source_domain || row.source_name || "Financial news source",
      publishedAt: row.published_at || "",
      image: row.image_url || null,
      summary: row.summary || "",
      category: row.category || "Markets",
      provider: row.source_name || "",
      region: row.region || "Global",
      country: row.country || "",
    }));
    return NextResponse.json({ articles, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) }, {
      headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    return NextResponse.json({ articles: [], total: 0, error: error instanceof Error ? error.message : "Unable to load archive" }, { status: 502 });
  }
}
