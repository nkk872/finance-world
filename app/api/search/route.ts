import { countryFromCode, regionFromCountryCode } from "../../../lib/countries";
import { NextRequest, NextResponse } from "next/server";
import { GET as getNewsFeed } from "../news/route";

export const maxDuration = 10;

type GdeltArticle = {
  title?: string;
  url?: string;
  domain?: string;
  seendate?: string;
  socialimage?: string;
  sourcecountry?: string;
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

function countryFor(title: string, domain: string): string {
  const v = (title + " " + domain).toLowerCase();
  const groups: [string, string[]][] = [
    ["India", ["india", "indian", "rbi", "sensex", "nifty", "mumbai", "rupee", "moneycontrol", "livemint", "businessline"]],
    ["China", ["china", "chinese", "beijing", "shanghai", "yuan"]],
    ["Japan", ["japan", "japanese", "tokyo", "nikkei", "yen"]],
    ["South Korea", ["south korea", "korean", "seoul", "koreaherald"]],
    ["Singapore", ["singapore"]], ["Hong Kong", ["hong kong"]],
    ["Indonesia", ["indonesia", "jakarta"]], ["Malaysia", ["malaysia", "kuala lumpur"]],
    ["Thailand", ["thailand", "bangkok"]], ["Vietnam", ["vietnam"]],
    ["Pakistan", ["pakistan", "karachi"]], ["Bangladesh", ["bangladesh", "dhaka"]],
    ["Sri Lanka", ["sri lanka", "colombo"]],
    ["Nigeria", ["nigeria", "lagos"]], ["Kenya", ["kenya", "nairobi"]],
    ["South Africa", ["south africa", "johannesburg"]], ["Egypt", ["egypt", "cairo"]],
    ["Ghana", ["ghana", "accra"]], ["Morocco", ["morocco", "casablanca"]], ["Ethiopia", ["ethiopia"]],
    ["Germany", ["germany", "berlin", "frankfurt"]], ["France", ["france", "paris"]],
    ["United Kingdom", ["united kingdom", "britain", "london", "uk"]],
    ["Italy", ["italy", "rome", "milan"]], ["Spain", ["spain", "madrid"]],
    ["Switzerland", ["switzerland", "zurich"]], ["Netherlands", ["netherlands", "amsterdam"]],
    ["Ireland", ["ireland", "dublin"]], ["Sweden", ["sweden", "stockholm"]],
    ["Norway", ["norway", "oslo"]], ["Denmark", ["denmark", "copenhagen"]],
    ["United States", ["united states", "u.s.", "wall street", "new york", "federal reserve"]],
    ["Canada", ["canada", "toronto"]], ["Mexico", ["mexico", "mexico city"]],
    ["Brazil", ["brazil", "sao paulo"]], ["Argentina", ["argentina", "buenos aires"]],
    ["Chile", ["chile", "santiago"]], ["Colombia", ["colombia", "bogota"]], ["Peru", ["peru", "lima"]],
    ["Australia", ["australia", "sydney", "melbourne"]], ["New Zealand", ["new zealand", "auckland"]],
    ["United Arab Emirates", ["united arab emirates", "dubai", "abu dhabi"]],
    ["Saudi Arabia", ["saudi arabia", "riyadh"]], ["Qatar", ["qatar", "doha"]], ["Türkiye", ["turkey", "turkish", "istanbul", "ankara"]]
  ];
  for (const [name, terms] of groups) if (terms.some(term => v.includes(term))) return name;
  return "";
}

function regionFor(title: string, domain: string): string {
  const country = countryFor(title, domain);
  const areas: [string, string[]][] = [
    ["Asia", ["India", "China", "Japan", "South Korea", "Singapore", "Hong Kong", "Indonesia", "Malaysia", "Thailand", "Vietnam", "Pakistan", "Bangladesh", "Sri Lanka", "United Arab Emirates", "Saudi Arabia", "Qatar", "Türkiye"]],
    ["Africa", ["Nigeria", "Kenya", "South Africa", "Egypt", "Ghana", "Morocco", "Ethiopia"]],
    ["Europe", ["Germany", "France", "United Kingdom", "Italy", "Spain", "Switzerland", "Netherlands", "Ireland", "Sweden", "Norway", "Denmark"]],
    ["North America", ["United States", "Canada", "Mexico"]],
    ["South America", ["Brazil", "Argentina", "Chile", "Colombia", "Peru"]],
    ["Oceania", ["Australia", "New Zealand"]]
  ];
  for (const [region, countries] of areas) if (countries.includes(country)) return region;
  const v = (title + " " + domain).toLowerCase();
  if (v.includes("africa")) return "Africa";
  if (v.includes("europe") || v.includes("eurozone") || v.includes("ecb")) return "Europe";
  if (v.includes("south america") || v.includes("latin america")) return "South America";
  if (v.includes("oceania") || v.includes("pacific islands")) return "Oceania";
  if (v.includes("asia") || v.includes("asean") || v.includes("middle east")) return "Asia";
  if (v.includes("united states") || v.includes("u.s.") || v.includes("wall street") || v.includes("canada")) return "North America";
  return "Global";
}

export async function GET(request: NextRequest) {
  const term = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 100);
  if (term.length < 2) return NextResponse.json({ articles: [], error: "Enter at least two characters to search." }, { status: 400 });
  try {
    const query = "(" + term.replace(/[()]/g, " ") + ") (finance OR markets OR banking OR economy OR business OR investment OR stocks OR cryptocurrency)";
    const params = new URLSearchParams({ query, mode: "ArtList", format: "json", maxrecords: "50", timespan: "30d", sort: "DateDesc" });
    const response = await fetch("https://api.gdeltproject.org/api/v2/doc/doc?" + params.toString(), {
      headers: { Accept: "application/json", "User-Agent": "FinanceWorld/1.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(2500)
    });
    if (!response.ok) throw new Error("News search provider returned " + response.status);
    const payload = await response.json();
    const articles = ((payload.articles || []) as GdeltArticle[])
      .filter(a => a.title && a.url)
      .map(a => {
        let domain = a.domain || "";
        try { domain = domain || new URL(a.url!).hostname; } catch {}
        domain = domain.replace(/^www\./i, "");
        return {
          title: a.title!,
          url: a.url!,
          domain,
          publishedAt: a.seendate || "",
          image: a.socialimage || null,
          summary: "",
          category: categoryFor(a.title!),
          provider: "GDELT Global Monitor",
          region: regionFromCountryCode(a.sourcecountry) || regionFor(a.title!, domain),
          country: countryFromCode(a.sourcecountry) || countryFor(a.title!, domain)
        };
      });
    return NextResponse.json({ articles, updatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // Use the same multi-provider feed directly instead of making a server
    // request back into this deployment (which can be blocked by deployment
    // protection on preview URLs).
    try {
      const feedResponse = await getNewsFeed();
      if (!feedResponse.ok) throw new Error("News feed fallback unavailable");
      const feed = await feedResponse.json();
      const needle = term.toLowerCase().replace(/s$/, "");
      const articles = (Array.isArray(feed.articles) ? feed.articles : [])
        .filter((article: Record<string, unknown>) => {
          const searchable = [
            article.title, article.summary, article.country, article.region, article.category
          ].filter(Boolean).join(" ").toLowerCase();
          return searchable.includes(needle) || searchable.includes(term.toLowerCase());
        })
        .slice(0, 50);
      return NextResponse.json(
        { articles, updatedAt: feed.updatedAt || new Date().toISOString(), fallback: true },
        { headers: { "Cache-Control": "no-store" } }
      );
    } catch {
      return NextResponse.json(
        { articles: [], fallback: true, message: "Search is temporarily unavailable. Please try again shortly." },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
  }
}
