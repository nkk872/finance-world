import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

type SourceArticle = { title: string; url: string; domain: string; publishedAt: string };

function isAuthorized(request: NextRequest) {
  const expected = process.env.NEWSROOM_ADMIN_TOKEN;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\\s+/i, "");
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}
function decodeXml(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
function readTag(block: string, tag: string) {
  const start = block.indexOf("<" + tag);
  const openEnd = start >= 0 ? block.indexOf(">", start) : -1;
  const close = openEnd >= 0 ? block.indexOf("</" + tag + ">", openEnd) : -1;
  return openEnd >= 0 && close > openEnd ? decodeXml(block.slice(openEnd + 1, close).replace(/<!\\[CDATA\\[|\\]\\]>/g, "").trim()) : "";
}
async function getRss(url: string, domain: string): Promise<SourceArticle[]> {
  const response = await fetch(url, { headers: { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": "FinanceWorld/1.0" }, cache: "no-store", signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(domain + " feed returned " + response.status);
  const xml = await response.text();
  return xml.split("<item>").slice(1).map(item => item.split("</item>")[0]).slice(0, 20).map(block => ({
    title: readTag(block, "title"),
    url: readTag(block, "link"),
    domain,
    publishedAt: readTag(block, "pubDate"),
  })).filter(item => item.title && item.url);
}
async function getSourceArticles(): Promise<SourceArticle[]> {
  const params = new URLSearchParams({
    query: '(finance OR "stock market" OR economy OR banking OR cryptocurrency)',
    mode: "ArtList", format: "json", maxrecords: "25", timespan: "24h", sort: "DateDesc",
  });
  const results = await Promise.allSettled([
    fetch("https://api.gdeltproject.org/api/v2/doc/doc?" + params.toString(), {
      headers: { Accept: "application/json", "User-Agent": "FinanceWorld/1.0" },
      cache: "no-store", signal: AbortSignal.timeout(12000),
    }).then(async response => {
      if (!response.ok) throw new Error("GDELT returned " + response.status);
      const payload = await response.json();
      return ((payload.articles ?? []) as Array<{ title?: string; url?: string; domain?: string; seendate?: string }>)
        .filter(item => item.title && item.url)
        .map(item => ({ title: item.title!, url: item.url!, domain: item.domain ?? new URL(item.url!).hostname, publishedAt: item.seendate ?? "" }));
    }),
    getRss("https://www.sec.gov/news/pressreleases.rss", "U.S. SEC"),
    getRss("https://data.gdeltproject.org/gdeltv3/gal/feed.rss", "GDELT Global Article List"),
  ]);
  const articles = results.flatMap(result => result.status === "fulfilled" ? result.value : []);
  const unique = Array.from(new Map(articles.map(article => [article.url, article])).values()).slice(0, 35);
  if (unique.length < 3) throw new Error("News providers returned fewer than three usable headlines.");
  return unique;
}

export async function POST(request: NextRequest) {
  if (!process.env.NEWSROOM_ADMIN_TOKEN) {
    return NextResponse.json({ error: "Newsroom security is not configured. Check NEWSROOM_ADMIN_TOKEN in Vercel." }, { status: 503 });
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Access denied. Check your newsroom access token." }, { status: 401 });
  }
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.Gemini_Api_key;
  if (!apiKey) {
    return NextResponse.json({ error: "Gemini API key is missing. Check the existing Gemini_Api_key setting in Vercel." }, { status: 503 });
  }

  try {
    const sources = await getSourceArticles();
    const prompt = `You are the careful newsroom assistant for Finance World, an international financial news publication.
Write exactly 3 concise original article drafts using ONLY the source headlines and metadata below. Each draft has a headline, category, summary, two short paragraphs and a source list.
Never invent figures, quotes, dates, company actions, causes or market movements. A headline alone is not proof of the full story. Clearly say when a detail requires verification. No personal investment advice or buy/sell recommendations. Use only supplied source URLs.
Return valid JSON only:
{"drafts":[{"title":"...","category":"Markets|Economy|Business|Banking|Crypto","summary":"...","body":"...","sourceUrls":["https://..."],"editorChecks":["..."]}]}
SOURCE HEADLINES:
${JSON.stringify(sources)}`;

    let response: Response | null = null;
    for (const model of ["gemini-3.8-flash", "gemini-3.6-flash"]) {
      response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 4000, responseMimeType: "application/json" },
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(35000),
      });
      if (response.ok) break;
      const providerError = (await response.text()).slice(0, 500);
      console.error("Gemini model request failed:", model, response.status, providerError);
      if (![404, 429, 500, 502, 503].includes(response.status)) break;
    }
    if (!response || !response.ok) {
      if (response?.status === 401 || response?.status === 403) {
        return NextResponse.json({ error: "Gemini rejected the saved API key. Check its status and API access in Google AI Studio." }, { status: 502 });
      }
      if (response?.status === 429) {
        return NextResponse.json({ error: "Gemini rate limit or free quota reached. Wait a little and try again." }, { status: 502 });
      }
      return NextResponse.json({ error: "Gemini is temporarily unavailable. Please try again shortly." }, { status: 502 });
    }

    const result = await response.json();
    const generatedText = result.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("");
    if (!generatedText) throw new Error("Gemini returned an empty response.");
    const cleaned = generatedText.replace(/^\`\`\`(?:json)?\\s*/i, "").replace(/\\s*\`\`\`$/, "").trim();
    const parsed = JSON.parse(cleaned);
    const allowedUrls = new Set(sources.map(source => source.url));
    const drafts = (Array.isArray(parsed.drafts) ? parsed.drafts : []).slice(0, 3).map((draft: Record<string, unknown>) => ({
      title: String(draft.title ?? "").slice(0, 180),
      category: String(draft.category ?? "Business").slice(0, 40),
      summary: String(draft.summary ?? "").slice(0, 500),
      body: String(draft.body ?? "").slice(0, 10000),
      sourceUrls: Array.isArray(draft.sourceUrls) ? draft.sourceUrls.filter((url: unknown) => typeof url === "string" && allowedUrls.has(url)) : [],
      editorChecks: Array.isArray(draft.editorChecks) ? draft.editorChecks.map(String).slice(0, 8) : [],
      status: "Needs editor review" as const,
    })).filter((draft: { title: string; body: string }) => draft.title && draft.body);
    if (!drafts.length) throw new Error("AI response did not contain usable drafts.");
    return NextResponse.json({ drafts, generatedAt: new Date().toISOString(), sourceCount: sources.length });
  } catch (error) {
    console.error("Newsroom draft generation failed:", error);
    return NextResponse.json({ error: "Could not prepare drafts. Check the news providers and Gemini service, then try again." }, { status: 500 });
  }
}
