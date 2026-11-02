import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const maxDuration = 30;

type Item = { title: string; url: string; source: string; publishedAt: string };

function authorized(request: NextRequest) {
  const expected = process.env.NEWSROOM_ADMIN_TOKEN;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}
function decode(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
function tag(block: string, name: string) {
  const match = block.match(new RegExp("<" + name + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + name + ">", "i"));
  return match ? decode(match[1].replace(/<!\\[CDATA\\[|\\]\\]>/g, "").trim()) : "";
}
async function rss(url: string, source: string): Promise<Item[]> {
  const res = await fetch(url, { headers: { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": "FinanceWorld/1.0 (financial news reader)" }, cache: "no-store", signal: AbortSignal.timeout(9000) });
  if (!res.ok) throw new Error(source + " returned " + res.status);
  const xml = await res.text();
  return xml.split("<item>").slice(1).map(x => x.split("</item>")[0]).slice(0, 25).map(block => ({
    title: tag(block, "title"), url: tag(block, "link"), source, publishedAt: tag(block, "pubDate")
  })).filter(x => x.title && x.url);
}
async function gdelt(): Promise<Item[]> {
  const params = new URLSearchParams({
    query: '("stock market" OR stocks OR shares OR banking OR bank OR inflation OR "interest rates" OR economy OR finance OR earnings OR bonds OR cryptocurrency OR "central bank" OR investment OR "financial markets")',
    mode: "ArtList", format: "json", maxrecords: "50", timespan: "24h", sort: "DateDesc"
  });
  const res = await fetch("https://api.gdeltproject.org/api/v2/doc/doc?" + params.toString(), { headers: { Accept: "application/json", "User-Agent": "FinanceWorld/1.0" }, cache: "no-store", signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error("GDELT returned " + res.status);
  const data = await res.json();
  return ((data.articles ?? []) as Array<{title?:string;url?:string;domain?:string;seendate?:string}>)
    .filter(x => x.title && x.url)
    .map(x => ({ title:x.title!, url:x.url!, source:x.domain || "GDELT", publishedAt:x.seendate || "" }));
}
const financialTerms = /\b(financ|market|stock|share|bank|econom|inflation|interest rate|bond|currency|forex|crypto|bitcoin|ethereum|invest|earnings|revenue|profit|ipo|treasury|monetary|fiscal|sec filing|securities|fund|trading|trade deficit|gdp|central bank|credit|loan|mortgage|insurance|commodity|oil price|gold price)\b/i;

export async function POST(request: NextRequest) {
  if (!process.env.NEWSROOM_ADMIN_TOKEN) return NextResponse.json({ error: "Newsroom access is not configured." }, { status: 503 });
  if (!authorized(request)) return NextResponse.json({ error: "Access denied. Check your newsroom access token." }, { status: 401 });
  const providers = [
    () => gdelt(),
    () => rss("https://www.sec.gov/news/pressreleases.rss", "U.S. SEC"),
    () => rss("https://www.federalreserve.gov/feeds/press_all.xml", "Federal Reserve"),
    () => rss("https://www.ecb.europa.eu/rss/press.html", "European Central Bank")
  ];
  const results = await Promise.allSettled(providers.map(fn => fn()));
  const items = results.flatMap(x => x.status === "fulfilled" ? x.value : []);
  const unique = Array.from(new Map(items.filter(x => financialTerms.test(x.title)).map(x => [x.url, x])).values())
    .sort((a,b) => Date.parse(b.publishedAt || "") - Date.parse(a.publishedAt || "")).slice(0, 60);
  if (!unique.length) return NextResponse.json({ error: "Financial news sources are temporarily unavailable. Please refresh shortly." }, { status: 502 });
  return NextResponse.json({ articles: unique, updatedAt: new Date().toISOString(), providers: Array.from(new Set(unique.map(x => x.source))) });
}
