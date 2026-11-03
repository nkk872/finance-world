import { NextResponse } from "next/server";

type Article={title:string;url:string;domain:string;publishedAt:string;image:string|null;provider:string;summary:string;category:string;region:string};
type GdeltArticle={title?:string;url?:string;domain?:string;seendate?:string;socialimage?:string};
export const revalidate=600;

function decodeXml(v:string){return v.replace(/<!\[CDATA\[|\]\]>/g,"").replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(parseInt(n,10))).replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").trim();}
function tagText(b:string,t:string){const m=b.match(new RegExp("<"+t+"(?:\\s[^>]*)?>([\\s\\S]*?)</"+t+">","i"));return m?decodeXml(m[1].replace(/<[^>]+>/g," ").replace(/\s+/g," ")):"";}
function imageFrom(b:string){
 const decoded=decodeXml(b);
 const candidates:string[]=[];
 const add=(value?:string)=>{if(!value)return;const cleaned=value.trim();if(cleaned.startsWith("//"))candidates.push("https:"+cleaned);else if(/^https?:\/\//i.test(cleaned))candidates.push(cleaned);};
 const mediaTags=decoded.match(/<(?:media:content|media:thumbnail|enclosure)\b[^>]*>/gi)??[];
 for(const tag of mediaTags){
  const url=tag.match(/\b(?:url|href|src)=["']([^"']+)["']/i)?.[1];
  const type=tag.match(/\btype=["']([^"']+)["']/i)?.[1]??"";
  if(url&&(!type||type.toLowerCase().startsWith("image/")))add(url);
 }
 const imageTags=decoded.match(/<img\b[^>]*>/gi)??[];
 for(const tag of imageTags){
  add(tag.match(/\b(?:src|data-src|data-original)=["']([^"']+)["']/i)?.[1]);
  const srcset=tag.match(/\bsrcset=["']([^"']+)["']/i)?.[1];
  if(srcset)add(srcset.split(",")[0]?.trim().split(/\s+/)[0]);
 }
 const metaImage=decoded.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i)?.[1]
  ??decoded.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i)?.[1];
 add(metaImage);
 return candidates.find(v=>!/^data:/i.test(v))??null;
}
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
function cleanDomain(v:string){return v.replace(/^www\./i,"").trim();}
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
async function fromGdelt(query:string):Promise<Article[]>{
 const params=new URLSearchParams({query:query+" sourcelang:english",mode:"ArtList",format:"json",maxrecords:"250",timespan:"7d",sort:"DateDesc"});
 const response=await fetch("https://api.gdeltproject.org/api/v2/doc/doc?"+params,{headers:{Accept:"application/json","User-Agent":"FinanceWorld/1.0"},cache:"no-store",signal:AbortSignal.timeout(5500)});
 if(!response.ok)throw new Error("GDELT failed: "+response.status);
 const payload=await response.json();
 return ((payload.articles??[]) as GdeltArticle[]).filter(a=>a.title&&a.url).map(a=>{const domain=cleanDomain(a.domain??new URL(a.url!).hostname);return {title:a.title!,url:a.url!,domain,publishedAt:a.seendate??"",image:a.socialimage??null,provider:"GDELT Global Monitor",summary:"",category:categoryFor(a.title!),region:regionFor(domain,a.title!)};});
}
const finance=/\b(financ|market|stock|share|bank|econom|inflation|interest rate|bond|currency|forex|crypto|bitcoin|ethereum|invest|earnings|revenue|profit|ipo|treasury|monetary|fiscal|securities|fund|trading|gdp|central bank|credit|loan|mortgage|insurance|commodity|oil price|gold price|fintech|real estate|property|trade|tariff)\b/i;
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
 ["https://www.bankofcanada.ca/feed/press-releases/","Bank of Canada"],
 ["https://www.cnbc.com/id/10001147/device/rss/rss.html","CNBC World Markets"],
 ["https://www.cnbc.com/id/100003114/device/rss/rss.html","CNBC Finance"],
 ["https://www.cnbc.com/id/10000664/device/rss/rss.html","CNBC Economy"],
 ["https://www.npr.org/rss/rss.php?id=1017","NPR Economy"],
 ["https://www.aljazeera.com/xml/rss/all.xml","Al Jazeera World"],
 ["https://rss.dw.com/rdf/rss-en-bus","DW Business"],
 ["https://www.france24.com/en/rss","France 24"],
 ["https://www.abc.net.au/news/feed/51120/rss.xml","ABC Australia Business"],
 ["https://www.investing.com/rss/news_25.rss","Investing.com Economy"],
 ["https://www.investing.com/rss/news_1.rss","Investing.com Markets"],
 ["https://www.investing.com/rss/news_301.rss","Investing.com Crypto"],
 ["https://www.nasdaq.com/feed/rssoutbound?category=Markets","Nasdaq Markets"],
 ["https://www.nasdaq.com/feed/rssoutbound?category=Economy","Nasdaq Economy"],
 ["https://www.economist.com/finance-and-economics/rss.xml","The Economist Finance"],
 ["https://www.ft.com/?format=rss","Financial Times"],
 ["https://feeds.marketwatch.com/marketwatch/topstories/","MarketWatch"],
 ["https://feeds.marketwatch.com/marketwatch/marketpulse/","MarketWatch Market Pulse"],
 ["https://www.moneycontrol.com/rss/marketreports.xml","Moneycontrol Markets"],
 ["https://www.moneycontrol.com/rss/business.xml","Moneycontrol Business"],
 ["https://www.livemint.com/rss/markets","Mint Markets"],
 ["https://www.livemint.com/rss/money","Mint Money"],
 ["https://www.japantimes.co.jp/feed/","The Japan Times"],
 ["https://www.koreaherald.com/rss/011.xml","Korea Herald Business"],
 ["https://www.africanews.com/feed/rss","Africanews"],
 ["https://www.bnamericas.com/en/rss","BNamericas"]
] as const;

export async function GET(){
 const gdeltQueries=[
  '(finance OR "stock market" OR banking OR investment OR earnings)',
  '(economy OR inflation OR GDP OR "interest rates" OR employment)',
  '(cryptocurrency OR bitcoin OR blockchain OR fintech)',
  '(forex OR currency OR gold OR silver OR oil OR commodities)',
  '("Asia markets" OR "European markets" OR "African economy" OR "Latin America economy" OR "Middle East economy")'
 ];
 const tasks=[...sources.map(([url,name])=>fromRss(url,name)),...gdeltQueries.map(q=>fromGdelt(q))];
 const results=await Promise.allSettled(tasks);
 const articles=results.flatMap(r=>r.status==="fulfilled"?r.value:[]);
 const cutoff=Date.now()-30*24*60*60*1000;
 const unique=Array.from(new Map(articles.filter(a=>{if(!a.url||!finance.test(a.title))return false;const published=Date.parse(a.publishedAt);return Number.isFinite(published)&&published>=cutoff&&published<=Date.now()+24*60*60*1000;}).map(a=>[a.url,a])).values())
  .sort((a,b)=>Date.parse(b.publishedAt||"")-Date.parse(a.publishedAt||"")).slice(0,500);
 const providers=Array.from(new Set(unique.map(a=>a.provider)));
 if(!unique.length)return NextResponse.json({articles:[],providers:[],error:"Global financial news providers are temporarily unavailable. Please refresh shortly."},{status:503,headers:{"Cache-Control":"no-store"}});
 return NextResponse.json({articles:unique,updatedAt:new Date().toISOString(),providers,sourceStatus:sources.map(([,name],i)=>({provider:name,status:results[i]?.status==="fulfilled"?"ok":"unavailable"}))},{headers:{"Cache-Control":"s-maxage=600, stale-while-revalidate=1800"}});
}