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

async function getSourceArticles(): Promise<SourceArticle[]> {
  const params = new URLSearchParams({
    query: '(finance OR "stock market" OR economy OR banking OR cryptocurrency)',
    mode: "ArtList",
    format: "json",
    maxrecords: "18",
    timespan: "24h",
    sort: "DateDesc",
  });
  const response = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?${params.toString()}`, {
    headers: { Accept: "application/json", "User-Agent": "FinanceWorld/1.0" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("The news source is temporarily unavailable.");
  const payload = await response.json();
  return ((payload.articles ?? []) as Array<{ title?: string; url?: string; domain?: string; seendate?: string }>)
    .filter((item) => item.title && item.url)
    .slice(0, 12)
    .map((item) => ({
      title: item.title!,
      url: item.url!,
      domain: item.domain ?? new URL(item.url!).hostname,
      publishedAt: item.seendate ?? "",
    }));
}

export async function POST(request: NextRequest) {
  if (!process.env.NEWSROOM_ADMIN_TOKEN) {
    return NextResponse.json({ error: "Newsroom security is not configured yet. Add NEWSROOM_ADMIN_TOKEN in Vercel." }, { status: 503 });
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Access denied. Check your newsroom access token." }, { status: 401 });
  }
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY is missing from the server environment." }, { status: 503 });
  }

  try {
    const sources = await getSourceArticles();
    if (sources.length < 3) {
      return NextResponse.json({ error: "Not enough current source headlines were found. Try again later." }, { status: 502 });
    }

    const prompt = `You are the careful newsroom assistant for Finance World, an international finance publication.
Create exactly 3 concise, publication-quality article DRAFTS based only on the source headlines and metadata below.
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

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 5000, responseMimeType: "application/json" },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const details = await response.text();
      console.error("Gemini newsroom error:", response.status, details.slice(0, 500));
      return NextResponse.json({ error: "Gemini could not generate drafts. Check the API key and model access in Google AI Studio." }, { status: 502 });
    }

    const result = await response.json();
    const generatedText = result.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("");
    if (!generatedText) throw new Error("Gemini returned an empty response.");

    const parsed = JSON.parse(generatedText);
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
