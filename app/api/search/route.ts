import { NextRequest, NextResponse } from "next/server";

type GdeltArticle = {
  title?: string;
  url?: string;
  domain?: string;
  seendate?: string;
  socialimage?: string;
  language?: string;
};

function categoryFor(title: string): string {
  const t = title.toLowerCase();
  if (/crypto|bitcoin|ethereum|blockchain|token|stablecoin|defi|web3/.test(t)) return "Crypto";
  if (/bank|central bank|interest rate|loan|credit|mortgage|deposit|lender/.test(t)) return "Banking";
  if (/inflation|gdp|econom|jobs|employment|trade|tariff|recession|budget|fiscal|monetary/.test(t)) return "Economy";
  if (/forex|currency|exchange rate|dollar|euro|yen|rupee/.test(t)) return "Forex";
  if (/gold|silver|oil|gas|commodity|copper|wheat|crude/.test(t)) return "Commodities";
  if (/real estate|property|housing|commercial property/.test(t)) return "Real Estate";
  if (/fintech|payment|digital banking|artificial intelligence|technology/.test(t)) return "Fintech";
  if (/company|business|earnings|revenue|profit|merger|ipo|ceo|corporate/.test(t)) return "Business";
  if (/stock|share|equity|bond|market|exchange|index|investor/.test(t)) return "Markets";
  return "World Finance";
}

function regionFor(title: string, domain: string): string {
  const t = title.toLowerCase(), d = domain.toLowerCase();
  if (/india|rupee|rbi|sensex|nifty|mumbai|delhi/.test(t) || /moneycontrol|livemint|businessline/.test(d)) return "Asia";
  if (/china|japan|korea|singapore|hong kong|australia|yuan|yen/.test(t) || /scmp|nikkei/.test(d)) return "Asia-Pacific";
  if (/europe|eurozone|germany|france|switzerland|ecb|euro /.test(t)) return "Europe";
  if (/africa|nigeria|kenya|south africa|egypt|rand/.test(t)) return "Africa";
  if (/brazil|argentina|mexico|latin america|chile/.test(t)) return "Latin America";
  if (/uae|saudi|qatar|dubai|middle east|riyadh/.test(t)) return "Middle East";
  if (/united states|u\.s\.|federal reserve|wall street|canada/.test(t)) return "North America";
  return "Global";
}

function toIsoDate(value?: string): string {
  if (!value) return new Date().toISOString();
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
  if (match) return new Date(Date.UTC(+match[1], +match[2] - 1, +match[3], +match[4], +match[5], +match[6])).toISOString();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? new Date().toISOString() : new Date(parsed).toISOString();
}

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get("q") ?? "";
  const query = rawQuery.trim().replace(/\s+/g, " ").slice(0, 120);
  if (query.length < 2) {
    return NextResponse.json({ articles: [], error: "Enter at least two characters to search." }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({
      query: query + " sourcelang:english",
      mode: "ArtList",
      format: "json",
      maxrecords: "75",
      timespan: "30d",
      sort: "DateDesc"
    });
    const response = await fetch("https://api.gdeltproject.org/api/v2/doc/doc?" + params.toString(), {
      headers: { Accept: "application/json", "User-Agent": "FinanceWorld/1.0 (financial news search)" },
      cache: "no-store",
      signal: AbortSignal.timeout(9000)
    });
    if (!response.ok) throw new Error("News search provider returned " + response.status);
    const payload = await response.json() as { articles?: GdeltArticle[] };
    const articles = (payload.articles ?? [])
      .filter((item): item is GdeltArticle & { title: string; url: string } => Boolean(item.title && item.url))
      .map(item => {
        let domain = item.domain ?? "";
        try { domain = domain || new URL(item.url).hostname; } catch { domain = "News source"; }
        domain = domain.replace(/^www\./i, "");
        return {
          title: item.title,
          url: item.url,
          domain,
          publishedAt: toIsoDate(item.seendate),
          image: item.socialimage && /^https?:\/\//i.test(item.socialimage) ? item.socialimage : null,
          summary: "",
          category: categoryFor(item.title),
          region: regionFor(item.title, domain),
          provider: "GDELT Global Monitor"
        };
      });
    const unique = Array.from(new Map(articles.map(article => [article.url, article])).values()).slice(0, 75);
    return NextResponse.json(
      { articles: unique, query, updatedAt: new Date().toISOString(), provider: "GDELT Global Monitor" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { articles: [], error: error instanceof Error ? error.message : "News search is temporarily unavailable." },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
