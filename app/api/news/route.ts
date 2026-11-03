import { countryFromCode, regionFromCountryCode, WORLD_COUNTRIES } from "../../../lib/countries";
import { NextResponse } from "next/server";

type Article={title:string;url:string;domain:string;publishedAt:string;image:string|null;provider:string;summary:string;category:string;region:string;country:string};
type GdeltArticle={title?:string;url?:string;domain?:string;seendate?:string;socialimage?:string;sourcecountry?:string};
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
 if(/central bank|interest rate|loan|credit|mortgage|deposit|lender|banking|\bbank\b/.test(t.replace(/\bwest bank\b/g," ")))return "Banking";
 if(/inflation|gdp|econom|jobs|employment|trade|tariff|recession|budget|fiscal|monetary|consumer price/.test(t))return "Economy";
 if(/forex|currency|exchange rate|dollar|euro|yen|rupee/.test(t))return "Forex";
 if(/gold|silver|oil|gas|commodity|copper|wheat|crude/.test(t))return "Commodities";
 if(/real estate|property|housing|home price|commercial property/.test(t))return "Real Estate";
 if(/fintech|payment|digital banking|artificial intelligence|technology/.test(t))return "Fintech";
 if(/company|business|earnings|revenue|profit|merger|ipo|ceo|corporate/.test(t))return "Business";
 if(/stock|shares|equity|bond|market|exchange|index|investor/.test(t))return "Markets";
 return "World Finance";
}
function countryFor(domain:string,title:string):string{
 const v=(title+" "+domain).toLowerCase();
 const groups:[string,string[]][]=[
 ["India",["india","indian","rbi","sensex","nifty","mumbai","delhi","rupee","moneycontrol","livemint","businessline"]],
 ["China",["china","chinese","beijing","shanghai","yuan"]],
 ["Japan",["japan","japanese","tokyo","nikkei","yen"]],
 ["South Korea",["south korea","korean","seoul","won","koreaherald"]],
 ["Singapore",["singapore"]],["Hong Kong",["hong kong"]],
 ["Indonesia",["indonesia","jakarta","rupiah"]],["Malaysia",["malaysia","kuala lumpur","ringgit"]],
 ["Thailand",["thailand","bangkok","baht"]],["Vietnam",["vietnam","dong"]],
 ["Pakistan",["pakistan","karachi","islamabad"]],["Bangladesh",["bangladesh","dhaka","taka"]],
 ["Sri Lanka",["sri lanka","colombo"]],["Australia",["australia","sydney","melbourne"]],
 ["New Zealand",["new zealand","auckland","wellington"]],
 ["Nigeria",["nigeria","lagos","naira"]],["Kenya",["kenya","nairobi"]],
 ["South Africa",["south africa","johannesburg","rand"]],["Egypt",["egypt","cairo"]],
 ["Ghana",["ghana","accra","cedi"]],["Morocco",["morocco","casablanca"]],["Ethiopia",["ethiopia","addis ababa"]],
 ["Germany",["germany","german","berlin","frankfurt"]],["France",["france","french","paris"]],
 ["United Kingdom",["united kingdom","britain","british","london","uk"]],
 ["Italy",["italy","italian","rome","milan"]],["Spain",["spain","spanish","madrid"]],
 ["Switzerland",["switzerland","zurich","geneva"]],["Netherlands",["netherlands","dutch","amsterdam"]],
 ["Ireland",["ireland","dublin"]],["Sweden",["sweden","stockholm"]],["Norway",["norway","oslo"]],
 ["Denmark",["denmark","copenhagen"]],["United States",["united states","u.s.","american","wall street","new york","federal reserve","sec.gov","federalreserve.gov"]],
 ["Canada",["canada","toronto","vancouver","bank of canada"]],["Mexico",["mexico","mexican","mexico city"]],
 ["Brazil",["brazil","brazilian","sao paulo"]],["Argentina",["argentina","buenos aires"]],
 ["Chile",["chile","santiago"]],["Colombia",["colombia","bogota"]],["Peru",["peru","lima"]],
 ["United Arab Emirates",["uae","united arab emirates","dubai","abu dhabi"]],
 ["Saudi Arabia",["saudi arabia","riyadh"]],["Qatar",["qatar","doha"]],["Türkiye",["turkey","turkish","istanbul","ankara"]]
 ];
 for(const [name,terms] of groups)if(terms.some(term=>v.includes(term)))return name;

 // Publisher-domain hints help classify local reporting when the headline
 // itself does not repeat the country name.
 const host=domain.toLowerCase().replace(/^www\./,"").split("/")[0];
 const publisherDomains:[string,string][]=[
  ["moneycontrol.com","India"],["business-standard.com","India"],["livemint.com","India"],
  ["economictimes.indiatimes.com","India"],["thehindubusinessline.com","India"],
  ["financialexpress.com","India"],["hindustantimes.com","India"],["firstpost.com","India"],
  ["scmp.com","Hong Kong"],["koreaherald.com","South Korea"],["abc.net.au","Australia"],
  ["japantimes.co.jp","Japan"],["sec.gov","United States"],
  ["federalreserve.gov","United States"],["bankofcanada.ca","Canada"],
  ["africanews.com","Africa"]
 ];
 for(const [suffix,country] of publisherDomains)if(host===suffix||host.endsWith("."+suffix))return country;
 const suffixCountries:[string,string][]=[
  [".co.uk","United Kingdom"],[".com.au","Australia"],[".net.au","Australia"],[".co.nz","New Zealand"],
  [".co.za","South Africa"],[".co.ke","Kenya"],[".com.ng","Nigeria"],[".com.pk","Pakistan"],
  [".com.bd","Bangladesh"],[".com.my","Malaysia"],[".co.id","Indonesia"],[".co.th","Thailand"],
  [".com.vn","Vietnam"],[".com.hk","Hong Kong"],[".co.jp","Japan"],[".com.cn","China"],
  [".com.br","Brazil"],[".com.mx","Mexico"],[".com.ar","Argentina"],[".com.tr","Türkiye"],
  [".in","India"],[".de","Germany"],[".fr","France"],[".it","Italy"],[".es","Spain"],
  [".ch","Switzerland"],[".nl","Netherlands"],[".ie","Ireland"],[".se","Sweden"],
  [".no","Norway"],[".dk","Denmark"],[".ca","Canada"],[".eg","Egypt"],[".gh","Ghana"],
  [".ma","Morocco"],[".ng","Nigeria"],[".ke","Kenya"],[".za","South Africa"],[".ae","United Arab Emirates"],
  [".sa","Saudi Arabia"],[".qa","Qatar"],[".pk","Pakistan"],[".bd","Bangladesh"],[".lk","Sri Lanka"]
 ];
 for(const [suffix,country] of suffixCountries)if(host.endsWith(suffix))return country;
 return "";
}
function regionFor(domain:string,title:string):string{
 const country=countryFor(domain,title);
 const areas:[string,string[]][]=[
 ["Asia",["India","China","Japan","South Korea","Singapore","Hong Kong","Indonesia","Malaysia","Thailand","Vietnam","Pakistan","Bangladesh","Sri Lanka","United Arab Emirates","Saudi Arabia","Qatar","Türkiye"]],
 ["Africa",["Nigeria","Kenya","South Africa","Egypt","Ghana","Morocco","Ethiopia"]],
 ["Europe",["Germany","France","United Kingdom","Italy","Spain","Switzerland","Netherlands","Ireland","Sweden","Norway","Denmark"]],
 ["North America",["United States","Canada","Mexico"]],
 ["South America",["Brazil","Argentina","Chile","Colombia","Peru"]],
 ["Oceania",["Australia","New Zealand"]]
 ];
 for(const [region,countries] of areas)if(countries.includes(country))return region;
 const v=(title+" "+domain).toLowerCase();
 if(v.includes("africa"))return "Africa";
 if(v.includes("europe")||v.includes("eurozone")||v.includes("ecb"))return "Europe";
 if(v.includes("south america")||v.includes("latin america"))return "South America";
 if(v.includes("oceania")||v.includes("pacific islands"))return "Oceania";
 if(v.includes("asia")||v.includes("asean")||v.includes("middle east"))return "Asia";
 if(v.includes("united states")||v.includes("u.s.")||v.includes("wall street"))return "North America";
 return "Global";
}
function cleanDomain(v:string){return v.replace(/^www\./i,"").trim();}
async function fromRss(feedUrl:string,provider:string):Promise<Article[]>{
 const response=await fetch(feedUrl,{headers:{Accept:"application/rss+xml, application/xml, text/xml","User-Agent":"FinanceWorld/1.0 (global financial news aggregator)"},cache:"no-store",signal:AbortSignal.timeout(5500)});
 if(!response.ok)throw new Error(provider+" feed failed: "+response.status);
 const xml=await response.text();
 return xml.split("<item>").slice(1).map(b=>b.split("</item>")[0]).slice(0,35).map((b):Article|null=>{
  const title=tagText(b,"title"),url=tagText(b,"link");if(!title||!url)return null;
  let domain="";
  try { domain=new URL(url).hostname; } catch { domain=tagText(b,"source")||provider; }
  const summary=tagText(b,"description")||tagText(b,"content:encoded");
  const clean=cleanDomain(domain);
  return {title,url,domain:clean,publishedAt:tagText(b,"pubDate"),image:imageFrom(b),provider,summary:summary.slice(0,5000),category:categoryFor(title),region:regionFor(clean,title),country:countryFor(clean,title)};
 }).filter((a):a is Article=>a!==null);
}
async function fromGdelt(query:string):Promise<Article[]>{
 const params=new URLSearchParams({query:query,mode:"ArtList",format:"json",maxrecords:"250",timespan:"7d",sort:"DateDesc"});
 const response=await fetch("https://api.gdeltproject.org/api/v2/doc/doc?"+params,{headers:{Accept:"application/json","User-Agent":"FinanceWorld/1.0"},cache:"no-store",signal:AbortSignal.timeout(5500)});
 if(!response.ok)throw new Error("GDELT failed: "+response.status);
 const payload=await response.json();
 return ((payload.articles??[]) as GdeltArticle[]).filter(a=>a.title&&a.url).map(a=>{const domain=cleanDomain(a.domain??new URL(a.url!).hostname);const country=countryFromCode(a.sourcecountry)||countryFor(domain,a.title!);const region=regionFromCountryCode(a.sourcecountry)||regionFor(domain,a.title!);return {title:a.title!,url:a.url!,domain,publishedAt:a.seendate??"",image:a.socialimage??null,provider:"GDELT Global Monitor",summary:"",category:categoryFor(a.title!),region,country};});
}
const finance=/\b(financ|market|stock|shares|bank|econom|inflation|interest rate|bond|currency|forex|crypto|bitcoin|ethereum|invest|earnings|revenue|profit|ipo|treasury|monetary|fiscal|securities|fund|trading|gdp|central bank|credit|loan|mortgage|insurance|commodity|oil price|gold price|fintech|real estate|property|trade|tariff)\b/i;
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
 ["https://www.business-standard.com/rss/latest.rss","Business Standard Latest"],
 ["https://www.business-standard.com/rss/home_page_top_stories.rss","Business Standard Top Stories"],
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
 ["https://www.thehindubusinessline.com/feeder/default.rss","The Hindu BusinessLine"],
 ["https://www.thehindubusinessline.com/markets/feeder/default.rss","BusinessLine Markets"],
 ["https://www.thehindubusinessline.com/economy/feeder/default.rss","BusinessLine Economy"],
 ["https://www.thehindubusinessline.com/companies/feeder/default.rss","BusinessLine Companies"],
 ["https://www.thehindubusinessline.com/markets/stock-markets/feeder/default.rss","BusinessLine Stocks"],
 ["https://www.thehindubusinessline.com/money-and-banking/feeder/default.rss","BusinessLine Money and Banking"],
 ["https://www.thehindu.com/business/feeder/default.rss","The Hindu Business"],
 ["https://www.thehindu.com/business/markets/feeder/default.rss","The Hindu Markets"],
 ["https://www.thehindu.com/business/Economy/feeder/default.rss","The Hindu Economy"],
 ["https://www.thehindu.com/business/Industry/feeder/default.rss","The Hindu Industry"],
 ["https://economictimes.indiatimes.com/rssfeedstopstories.cms","Economic Times"],
 ["https://www.livemint.com/rss/markets","Mint Markets"],
 ["https://www.livemint.com/rss/money","Mint Money"],
 ["https://www.livemint.com/rss/news","Mint News"],
 ["https://www.financialexpress.com/feed/","Financial Express"],
 ["https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml","Hindustan Times India"],
 ["https://feeds.bbci.co.uk/news/world/asia/india/rss.xml","BBC India"],
 ["https://www.firstpost.com/commonfeeds/v1/mfp/rss/india.xml","Firstpost India"],
 ["https://www.japantimes.co.jp/feed/","The Japan Times"],
 ["https://www.koreaherald.com/rss/011.xml","Korea Herald Business"],
 ["https://www.africanews.com/feed/rss","Africanews"],
 ["https://www.bnamericas.com/en/rss","BNamericas"]
] as const;

export async function GET(){
 const financialTerms='(finance OR "financial market" OR stocks OR banking OR economy OR business OR investment OR inflation OR GDP OR currency OR trade OR company OR earnings)';
 const regions=["Asia","Africa","Europe","North America","South America","Oceania"];
 const regionalQueries=regions.map(region=>{
  const names=WORLD_COUNTRIES.filter(item=>regionFromCountryCode(item.code)===region).map(item=>'"'+item.name+'"');
  return '('+names.join(' OR ')+') '+financialTerms;
 });
 const gdeltQueries=[
  '(finance OR "stock market" OR banking OR investment OR earnings OR economy OR inflation OR GDP)',
  ...regionalQueries,
  '(cryptocurrency OR bitcoin OR blockchain OR fintech OR forex OR currency OR gold OR silver OR oil OR commodities)'
 ];
 const tasks=[...sources.map(([url,name])=>fromRss(url,name)),...gdeltQueries.map(q=>fromGdelt(q))];
 const results=await Promise.allSettled(tasks);
 const articles=results.flatMap(r=>r.status==="fulfilled"?r.value:[]);
 const cutoff=Date.now()-30*24*60*60*1000;
 const unique=Array.from(new Map(articles.filter(a=>{
  if(!a.url)return false;
  const title=a.title.toLowerCase();
  const withoutWestBank=title.replace(/\bwest bank\b/g," ");
  if(!finance.test(withoutWestBank))return false;
  const published=Date.parse(a.publishedAt);
  return Number.isFinite(published)&&published>=cutoff&&published<=Date.now()+24*60*60*1000;
 }).map(a=>[a.url,a])).values())
  .sort((a,b)=>Date.parse(b.publishedAt||"")-Date.parse(a.publishedAt||"")).slice(0,1000);
 const providers=Array.from(new Set(unique.map(a=>a.provider)));
 if(!unique.length)return NextResponse.json({articles:[],providers:[],error:"Global financial news providers are temporarily unavailable. Please refresh shortly."},{status:503,headers:{"Cache-Control":"no-store"}});
 return NextResponse.json({articles:unique,updatedAt:new Date().toISOString(),providers,sourceStatus:sources.map(([,name],i)=>({provider:name,status:results[i]?.status==="fulfilled"?"ok":"unavailable"}))},{headers:{"Cache-Control":"s-maxage=600, stale-while-revalidate=1800"}});
}