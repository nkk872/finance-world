import { NextResponse } from "next/server";

type Article={title:string;url:string;domain:string;publishedAt:string;image:string|null;provider:string;summary:string;category:string;region:string};
type GdeltArticle={title?:string;url?:string;domain?:string;seendate?:string;socialimage?:string};
export const revalidate=600;

function decodeXml(v:string){return v.replace(/<!\\[CDATA\\[|\\]\\]>/g,"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").trim();}
function tagText(b:string,t:string){const m=b.match(new RegExp("<"+t+"(?:\\\\s[^>]*)?>([\\\\s\\\\S]*?)</"+t+">","i"));return m?decodeXml(m[1].replace(/<[^>]+>/g," ").replace(/\\s+/g," ")):"";}
function imageFrom(b:string){const a=[b.match(/<media:content[^>]+url=["']([^"']+)["']/i)?.[1],b.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i)?.[1],b.match(/<enclosure[^>]+url=["']([^"']+)["']/i)?.[1],b.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1]];return a.find(v=>v&&/^https?:\\/\\//i.test(v))??null;}
function categoryFor(title:string):string{const t=title.toLowerCase();
 if(/crypto|bitcoin|ethereum|blockchain|token|stablecoin|defi|web3/.test(t))return "Crypto";
 if(/bank|central bank|interest rate|loan|credit|mortgage|deposit|lender/.test(t))return "Banking";
 if(/inflation|gdp|econom|jobs|employment|trade|tariff|recession|budget|fiscal|monetary|consumer price/.test(t))return "Economy";
 if(/forex|currency|exchange rate|dollar|euro|yen|rupee/.test(t))return "Forex";
 if(/gold|silver|oil|gas|commodity|copper|wheat|crude/.test(t))return "Commodities";
 if(/real estate|property|housing|home price|commercial property/.test(t))return "Real Estate";
 if(/fintech|payment|digital banking|artificial intelligence|technology/.test(t))return "Fintech";
 if(/company|business|earnings|revenue|profit|merger|ipo|ceo|corporate/.test(t))return "Business";
 if(/stock|share|equity|bond|market|exchange|index|investor/.test(t))return "Markets";
 return "World Finance";
}
function regionFor(domain:string,title:string){const d=domain.toLowerCase(),t=title.toLowerCase();
 if(/india|rupee|rbi|sensex|nifty|mumbai|delhi/.test(t)||/rbi.org.in|businessline|livemint|moneycontrol/.test(d))return "Asia";
 if(/china|japan|korea|singapore|hong kong|australia|asia|yuan|yen/.test(t)||/scmp|nikkei|asia/.test(d))return "Asia-Pacific";
 if(/europe|eurozone|germany|france|switzerland|ecb|euro /.test(t)||/ecb.europa|bis.org|europarl/.test(d))return "Europe";
 if(/africa|nigeria|kenya|south africa|egypt|rand/.test(t))return "Africa";
 if(/brazil|argentina|mexico|latin america|chile/.test(t))return "Latin America";
 if(/uae|saudi|qatar|dubai|middle east|riyadh/.test(t))return "Middle East";
 if(/united states|u\.s\.|federal reserve|wall street|canada|mexico|dollar/.test(t)||/sec.gov|federalreserve.gov|bankofcanada/.test(d))return "North America";
 return "Global";
}
function cleanDomain(v:string){return v.replace(/^www\\./i,"").trim();}
async function fromRss(feedUrl:string,provider:string):Promise<Article[]>{
 const response=await fetch(feedUrl,{headers:{Accept:"application/rss+xml, application/xml, text/xml","User-Agent":"FinanceWorld/1.0 (global financial news aggregator)"},cache:"no-store",signal:AbortSignal.timeout(5500)});
 if(!response.ok)throw new Error(provider+" feed failed: "+response.status);
 const xml=await response.text();
 return xml.split("<item>").slice(1).map(b=>b.split("</item>")[0]).slice(0,35).map((b):Article|null=>{
  const title=tagText(b,"title"),url=tagText(b,"link");if(!title||!url)return null;
  let domain=tagText(b,"source");if(!domain){try{domain=new URL(url).hostname}catch{domain=provider;}}
  const summary=tagText(b,"description")||tagText(b,"content:encoded");
  const clean=cleanDomain(domain);
  return {title,url,domain:clean,publishedAt:tagText(b,"pubDate"),image:imageFrom(b),provider,summary:summary.slice(0,5000),category:categoryFor(title),region:regionFor(clean,title)};
 }).filter((a):a is Article=>a!==null);
}
async function fromGdelt():Promise<Article[]>{
 const params=new URLSearchParams({query:'(finance OR "stock market" OR economy OR banking OR cryptocurrency OR inflation OR earnings OR forex OR commodities) sourcelang:english',mode:"ArtList",format:"json",maxrecords:"75",timespan:"48h",sort:"DateDesc"});
 const response=await fetch("https://api.gdeltproject.org/api/v2/doc/doc?"+params,{headers:{Accept:"application/json","User-Agent":"FinanceWorld/1.0"},cache:"no-store",signal:AbortSignal.timeout(5500)});
 if(!response.ok)throw new Error("GDELT failed: "+response.status);
 const payload=await response.json();
 return ((payload.articles??[]) as GdeltArticle[]).filter(a=>a.title&&a.url).map(a=>{const domain=cleanDomain(a.domain??new URL(a.url!).hostname);return {title:a.title!,url:a.url!,domain,publishedAt:a.seendate??"",image:a.socialimage??null,provider:"GDELT Global Monitor",summary:"",category:categoryFor(a.title!),region:regionFor(domain,a.title!)};});
}
const finance=/\\b(financ|market|stock|share|bank|econom|inflation|interest rate|bond|currency|forex|crypto|bitcoin|ethereum|invest|earnings|revenue|profit|ipo|treasury|monetary|fiscal|securities|fund|trading|gdp|central bank|credit|loan|mortgage|insurance|commodity|oil price|gold price|fintech|real estate|property|trade|tariff)\\b/i;
const sources=[
 ["https://www.sec.gov/news/pressreleases.rss","U.S. SEC"],
 ["https://www.federalreserve.gov/feeds/press_all.xml","Federal Reserve"],
 ["https://www.ecb.europa.eu/rss/press.html","European Central Bank"],
 ["https://www.imf.org/en/News/RSS?language=eng","International Monetary Fund"],
 ["https://www.bis.org/doclist/all_pressrels.rss","Bank for International Settlements"],
 ["https://www.worldbank.org/en/news/all?feed=rss","World Bank"],
 ["https://feeds.bbci.co.uk/news/business/rss.xml","BBC Business"],
 ["https://www.theguardian.com/business/rss","The Guardian Business"],
 ["https://www.coindesk.com/arc/outboundfeeds/rss/","CoinDesk"],
 ["https://cointelegraph.com/rss","Cointelegraph"],
 ["https://www.business-standard.com/rss/markets-106.rss","Business Standard Markets"],
 ["https://www.business-standard.com/rss/finance-103.rss","Business Standard Finance"],
 ["https://www.scmp.com/rss/91/feed","South China Morning Post Business"],
 ["https://www.bankofcanada.ca/feed/press-releases/","Bank of Canada"]
] as const;

export async function GET(){
 const tasks=[...sources.map(([url,name])=>fromRss(url,name)),fromGdelt()];
 const results=await Promise.allSettled(tasks);
 const articles=results.flatMap(r=>r.status==="fulfilled"?r.value:[]);
 const unique=Array.from(new Map(articles.filter(a=>a.url&&finance.test(a.title)).map(a=>[a.url,a])).values())
  .sort((a,b)=>Date.parse(b.publishedAt||"")-Date.parse(a.publishedAt||"")).slice(0,150);
 const providers=Array.from(new Set(unique.map(a=>a.provider)));
 if(!unique.length)return NextResponse.json({articles:[],providers:[],error:"Global financial news providers are temporarily unavailable. Please refresh shortly."},{status:503,headers:{"Cache-Control":"no-store"}});
 return NextResponse.json({articles:unique,updatedAt:new Date().toISOString(),providers,sourceStatus:sources.map(([,name],i)=>({provider:name,status:results[i]?.status==="fulfilled"?"ok":"unavailable"}))},{headers:{"Cache-Control":"s-maxage=600, stale-while-revalidate=1800"}});
}