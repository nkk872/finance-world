import { NextResponse } from "next/server";

type Article = { title: string; url: string; domain: string; publishedAt: string; image: string | null; provider: string };
type GdeltArticle = { title?: string; url?: string; domain?: string; seendate?: string; socialimage?: string };

export const revalidate = 900;

function decodeXml(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
function tagText(block: string, tag: string) {
  const match = block.match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tag + ">","i"));
  return match ? decodeXml(match[1].replace(/<!\\[CDATA\\[|\\]\\]>/g, "").trim()) : "";
}
function cleanPublisher(value: string) { return value.replace(/^www\\./i, "").trim(); }

async function fromRss(feedUrl: string, provider: string): Promise<Article[]> {
  const response = await fetch(feedUrl, { headers: { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": "FinanceWorld/1.0 (news aggregator)" }, cache: "no-store", signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(provider + " feed request failed: " + response.status);
  const xml = await response.text();
  return xml.split("<item>").slice(1).map(block => block.split("</item>")[0]).slice(0, 30).map((block): Article | null => {
    const title = tagText(block, "title");
    const articleUrl = tagText(block, "link");
    if (!title || !articleUrl) return null;
    const sourceStart = block.indexOf("<source");
    const sourceOpenEnd = sourceStart >= 0 ? block.indexOf(">", sourceStart) : -1;
    const sourceClose = sourceOpenEnd >= 0 ? block.indexOf("</source>", sourceOpenEnd) : -1;
    let domain = sourceOpenEnd >= 0 && sourceClose > sourceOpenEnd ? cleanPublisher(tagText(block, "source")) : "";
    if (!domain) { try { domain = new URL(articleUrl).hostname; } catch { domain = provider; } }
    return { title, url: articleUrl, domain, publishedAt: tagText(block, "pubDate"), image: null, provider };
  }).filter((item): item is Article => item !== null);
}

async function fromGdelt(): Promise<Article[]> {
  const params = new URLSearchParams({ query: '(finance OR "stock market" OR economy OR banking OR cryptocurrency)', mode: "ArtList", format: "json", maxrecords: "40", timespan: "24h", sort: "DateDesc" });
  const response = await fetch("https://api.gdeltproject.org/api/v2/doc/doc?" + params.toString(), { headers: { Accept: "application/json", "User-Agent": "FinanceWorld/1.0" }, cache: "no-store", signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error("GDELT request failed: " + response.status);
  const payload = await response.json();
  return ((payload.articles ?? []) as GdeltArticle[]).filter(item => item.title && item.url).map(item => ({ title: item.title!, url: item.url!, domain: cleanPublisher(item.domain ?? new URL(item.url!).hostname), publishedAt: item.seendate ?? "", image: item.socialimage ?? null, provider: "GDELT" }));
}

export async function GET() {
  const results = await Promise.allSettled([
    fromGdelt(),
    fromRss("https://www.sec.gov/news/pressreleases.rss", "U.S. SEC"),
    fromRss("https://data.gdeltproject.org/gdeltv3/gal/feed.rss", "GDELT Global Article List"),
  ]);
  const articles = results.flatMap(result => result.status === "fulfilled" ? result.value : []);
  const unique = Array.from(new Map(articles.filter(a => a.url).map(a => [a.url, a])).values())
    .sort((a,b) => Date.parse(b.publishedAt || "") - Date.parse(a.publishedAt || ""))
    .slice(0, 60);
  if (!unique.length) return NextResponse.json({ articles: [], error: "News sources are temporarily unavailable. Please try again shortly." }, { status: 502 });
  const providers = Array.from(new Set(unique.map(a => a.provider)));
  return NextResponse.json({ articles: unique, updatedAt: new Date().toISOString(), source: providers.join(" + "), providers }, { headers: { "Cache-Control": "s-maxage=600, stale-while-revalidate=1800" } });
}
