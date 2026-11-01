import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

type SourceArticle = {
  title: string;
  url: string;
  domain: string;
  publishedAt: string;
};

function isAuthorized(request: NextRequest) {
  const expected = process.env.NEWSROOM_ADMIN_TOKEN;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function getGoogleNewsArticles(): Promise<SourceArticle[]> {
  const url = "https://news.google.com/rss/search?q=finance+OR+stock+market+OR+economy+OR+banking+OR+cryptocurrency&hl=en-US&gl=US&ceid=US:en";
  const response = await fetch(url, {
    headers: { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": "FinanceWorld/1.0" },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("Google News RSS is unavailable.");
  const xml = await response.text();
  const items = xml.split("<item>").slice(1).map((part) => part.split("</item>")[0]).slice(0, 18);
  return items.map((block) => {
    const read = (tag: string) => {
      const open = `<${tag}>`;
      const close = `</${tag}>`;
      const start = block.indexOf(open);
      const end = start < 0 ? -1 : block.indexOf(close, start + open.length);
      return start < 0 || end < 0 ? "" : decodeXml(block.slice(start + open.length, end).trim());
    };
    const title = read("title");
    const url = read("link");
    const publishedAt = read("pubDate");
    if (!title || !url) return null;
    let domain = "news.google.com";
    try { domain = new URL(url).hostname; } catch {}
    return { title, url, domain, publishedAt };
  }).filter((item): item is SourceArticle => item !== null);
}

async function getSourceArticles(): Promise<SourceArticle[]> {
  const params = new URLSearchParams({
    query: '(finance OR "stock market" OR economy OR banking OR cryptocurrency)',
    mode: "ArtList",
    format: "json",
    maxrecords: "18",
    timespan: "24h",
    sort: "DateDesc",
  });
  try {
    const response = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?${params.toString()}`, {
      headers: { Accept: "application/json", "User-Agent": "FinanceWorld/1.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (response.ok) {
      const payload = await response.json();
      const articles = ((payload.articles ?? []) as Array<{ title?: string; url?: string; domain?: string; seendate?: string }>)
        .filter((item) => item.title && item.url)
        .slice(0, 12)
        .map((item) => ({
          title: item.title!,
          url: item.url!,
          domain: item.domain ?? new URL(item.url!).hostname,
          publishedAt: item.seendate ?? "",
        }));
      if (articles.length >= 3) return articles;
    }
  } catch (error) {
    console.warn("GDELT source unavailable; trying Google News RSS fallback:", error);
  }
  const fallback = await getGoogleNewsArticles();
  if (fallback.length < 3) throw new Error("Both news sources returned too few articles.");
  return fallback;
}

export async function POST(request: NextRequest) {
  if (!process.env.NEWSROOM_ADMIN_TOKEN) {
    return NextResponse.json({ error: "Newsroom security is not configured yet. Add NEWSROOM_ADMIN_TOKEN in Vercel." }, { status: 503 });
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Access denied. Check your newsroom access token." }, { status: 401 });
  }
  const geminiApiKey = process.env.GEMINI_API_KEY ?? process.env.Gemini_Api_key;
  if (!geminiApiKey) {
    return NextResponse.json({ error: "Gemini API key is missing. Check the GEMINI_API_KEY environment variable in Vercel." }, { status: 503 });
  }

  try {
    const sources = await getSourceArticles();
    if (sources.length < 3) {
      return NextResponse.json({ error: "Not enough current source headlines were found. Try again later." }, { status: 502 });
    }

    const prompt = `You are the careful newsroom assistant for Finance World, an international finance publication.
Create exactly 3 SHORT article DRAFTS based only on the source headlines and metadata below. Keep each body to 2 short paragraphs and the entire JSON under 3000 tokens.
Important rules:
- Do not invent facts, quotes, numbers, dates, company actions, causes, or market movements.
- A headline is not proof of the full story. Use cautious language and clearly label anything that needs reporter verification.
- Do not give personalized investment advice, price targets, or buy/sell recommendations.
- Do not claim that any fact has been independently verified.
- Use only source URLs supplied below. Never invent URLs.
- If the source material is too thin for a factual article, write a short context-led draft and list what an editor must verify.
Return valid JSON only, matching this shape:
{"drafts":[{"title":"...","category":"Markets|Economy|Business|Banking|Crypto","summary":"...","body":"...","sourceUrls":["https://..."],"editorChecks":["..."]}]}
Source headlines:
${JSON.stringify(sources, null, 2)}`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": geminiApiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 4000, responseMimeType: "application/json" },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) {
      const details = await response.text();
      console.error("Gemini newsroom error:", response.status, details.slice(0, 500));
      return NextResponse.json({ error: "Gemini could not generate drafts. Check the API key and model access in Google AI Studio." }, { status: 502 });
    }

    const result = await response.json();
    const generatedText = result.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("");
    if (!generatedText) throw new Error("Gemini returned an empty response.");

    const cleanedText = generatedText.replace(/^```(?:json)?\\s*/i, "").replace(/\\s*```$/, "").trim();\n    const parsed = JSON.parse(cleanedText);
    const allowedUrls = new Set(sources.map((source) => source.url));
    const drafts = (Array.isArray(parsed.drafts) ? parsed.drafts : []).slice(0, 3).map((draft: Record<string, unknown>) => ({
      title: String(draft.title ?? "").slice(0, 180),
      category: String(draft.category ?? "Business").slice(0, 40),
      summary: String(draft.summary ?? "").slice(0, 500),
      body: String(draft.body ?? "").slice(0, 10000),
      sourceUrls: Array.isArray(draft.sourceUrls) ? draft.sourceUrls.filter((url: unknown) => typeof url === "string" && allowedUrls.has(url)) : [],
      editorChecks: Array.isArray(draft.editorChecks) ? draft.editorChecks.map(String).slice(0, 8) : [],
      status: "Needs editor review" as const,
    })).filter((draft: { title: string; body: string }) => draft.title && draft.body);

    return NextResponse.json({ drafts, generatedAt: new Date().toISOString(), sourceCount: sources.length });
  } catch (error) {
    console.error("Newsroom draft generation failed:", error);
    return NextResponse.json({ error: "Could not prepare drafts. Please try again." }, { status: 500 });
  }
}
