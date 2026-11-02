import { NextResponse } from "next/server";

type Article = { title: string; url: string; domain: string; publishedAt: string; image: string | null };
type GdeltArticle = { title?: string; url?: string; domain?: string; seendate?: string; socialimage?: string };

export const revalidate = 900;

function decodeXml(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function tagText(block: string, tag: string) {
  const match = block.match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tag + ">","i"));
  return match ? decodeXml(match[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim()) : "";
}

function cleanPublisher(value: string) {
  return value.replace(/^www\./i, "").trim();
}

async function fromGoogleNews(): Promise<Article[]> {
  const url = "https://news.google.com/rss/search?q=finance+OR+stock+market+OR+economy+OR+banking+OR+cryptocurrency&hl=en-US&gl=US&ceid=US:en";
  const response = await fetch(url, { headers: { Accept: "application/rss+xml, application/xml", "User-Agent": "FinanceWorld/1.0" }, cache: "no-store", signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error("Google News RSS request failed.");
  const xml = await response.text();
  return xml.split("<item>").slice(1).map(block => block.split("</item>")[0]).slice(0, 30).map((block): Article | null => {
    const title = tagText(block, "title");
    const articleUrl = tagText(block, "link");
    if (!title || !articleUrl) return null;
    const sourceStart = block.indexOf("<source");
    const sourceOpenEnd = sourceStart >= 0 ? block.indexOf(">", sourceStart) : -1;
    const sourceClose = sourceOpenEnd >= 0 ? block.indexOf("</source>", sourceOpenEnd) : -1;
    let domain = sourceOpenEnd >= 0 && sourceClose > sourceOpenEnd
      ? cleanPublisher(decodeXml(block.slice(sourceOpenEnd + 1, sourceClose).trim()))
      : "";
    if (!domain) {
      try { domain = new URL(articleUrl).hostname; } catch { domain = "Unknown publisher"; }
    }
    return { title, url: articleUrl, domain, publishedAt: tagText(block, "pubDate"), image: null };
  }).filter((item): item is Article => item !== null);
}

export async function GET() {
  const params = new URLSearchParams({ query: '(finance OR "stock market" OR economy OR banking OR cryptocurrency)', mode: "ArtList", format: "json", maxrecords: "30", timespan: "24h", sort: "DateDesc" });
  try {
    const response = await fetch("https://api.gdeltproject.org/api/v2/doc/doc?" + params.toString(), { headers: { Accept: "application/json", "User-Agent": "FinanceWorld/1.0" }, cache: "no-store", signal: AbortSignal.timeout(12000) });
    if (response.ok) {
      const payload = await response.json();
      const articles = ((payload.articles ?? []) as GdeltArticle[]).filter(item => item.title && item.url).map(item => ({ title: item.title!, url: item.url!, domain: cleanPublisher(item.domain ?? new URL(item.url!).hostname), publishedAt: item.seendate ?? "", image: item.socialimage ?? null }));
      if (articles.length) return NextResponse.json({ articles, updatedAt: new Date().toISOString(), source: "GDELT" }, { headers: { "Cache-Control": "s-maxage=900, stale-while-revalidate=3600" } });
    }
  } catch (error) {
    console.warn("GDELT news feed unavailable; trying Google News RSS.", error);
  }
  try {
    const articles = await fromGoogleNews();
    return NextResponse.json({ articles, updatedAt: new Date().toISOString(), source: "Google News RSS" }, { headers: { "Cache-Control": "s-maxage=900, stale-while-revalidate=3600" } });
  } catch (error) {
    console.error("All news providers failed.", error);
    return NextResponse.json({ articles: [], error: "Live headlines are temporarily unavailable. Please try again shortly." }, { status: 502 });
  }
}
