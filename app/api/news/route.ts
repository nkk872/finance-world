import { NextResponse } from "next/server";

type Article = { title:string; url:string; domain:string; publishedAt:string; image:string|null; provider:string; summary:string; category:string };
type GdeltArticle = { title?:string; url?:string; domain?:string; seendate?:string; socialimage?:string };

export const revalidate = 600;

function decodeXml(value:string) {
  return value.replace(/<!\\[CDATA\\[|\\]\\]>/g,"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").trim();
}
function tagText(block:string, tag:string) {
  const match=block.match(new RegExp("<"+tag+"(?:\\s[^>]*)?>([\\s\\S]*?)</"+tag+">","i"));
  return match ? decodeXml(match[1].replace(/<[^>]+>/g," ").replace(/\\s+/g," ")) : "";
}
function imageFrom(block:string) {
  const candidates=[
    block.match(/<media:content[^>]+url=["']([^"']+)["']/i)?.[1],
    block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i)?.[1],
    block.match(/<enclosure[^>]+url=["']([^"']+)["']/i)?.[1],
    block.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1]
  ];
  return candidates.find(v=>v && /^https?:\\/\\//i.test(v)) ?? null;
}
function categoryFor(title:string):string {
  const t=title.toLowerCase();
  if(/crypto|bitcoin|ethereum|blockchain|token/.test(t)) return "Crypto";
  if(/bank|central bank|fed |federal reserve|interest rate|loan|credit/.test(t)) return "Banking";
  if(/inflation|gdp|econom|jobs|employment|trade|tariff|recession|budget/.test(t)) return "Economy";
  if(/company|business|earnings|revenue|profit|merger|ipo|ceo/.test(t)) return "Business";
  return "Markets";
}
function cleanDomain(value:string){return value.replace(/^www\\./i,"").trim();}
async function fromRss(feedUrl:string,provider:string):Promise<Article[]> {
  const response=await fetch(feedUrl,{headers:{Accept:"application/rss+xml, application/xml, text/xml","User-Agent":"FinanceWorld/1.0 (news aggregator)"},cache:"no-store",signal:AbortSignal.timeout(7000)});
  if(!response.ok) throw new Error(provider+" feed failed: "+response.status);
  const xml=await response.text();
  return xml.split("<item>").slice(1).map(block=>block.split("</item>")[0]).slice(0,25).map((block):Article|null=>{
    const title=tagText(block,"title"), url=tagText(block,"link");
    if(!title||!url) return null;
    let domain=tagText(block,"source");
    if(!domain){try{domain=new URL(url).hostname}catch{domain=provider}}
    const summary=tagText(block,"description") || tagText(block,"content:encoded");
    return {title,url,domain:cleanDomain(domain),publishedAt:tagText(block,"pubDate"),image:imageFrom(block),provider,summary:summary.slice(0,5000),category:categoryFor(title)};
  }).filter((a):a is Article=>a!==null);
}
async function fromGdelt():Promise<Article[]> {
  const params=new URLSearchParams({query:'(finance OR "stock market" OR economy OR banking OR cryptocurrency OR inflation OR earnings)',mode:"ArtList",format:"json",maxrecords:"40",timespan:"48h",sort:"DateDesc"});
  const response=await fetch("https://api.gdeltproject.org/api/v2/doc/doc?"+params.toString(),{headers:{Accept:"application/json","User-Agent":"FinanceWorld/1.0"},cache:"no-store",signal:AbortSignal.timeout(7000)});
  if(!response.ok) throw new Error("GDELT request failed: "+response.status);
  const payload=await response.json();
  return ((payload.articles??[]) as GdeltArticle[]).filter(a=>a.title&&a.url).map(a=>({title:a.title!,url:a.url!,domain:cleanDomain(a.domain??new URL(a.url!).hostname),publishedAt:a.seendate??"",image:a.socialimage??null,provider:"GDELT",summary:"",category:categoryFor(a.title!)}));
}
const finance=/\\b(financ|market|stock|share|bank|econom|inflation|interest rate|bond|currency|forex|crypto|bitcoin|ethereum|invest|earnings|revenue|profit|ipo|treasury|monetary|fiscal|securities|fund|trading|gdp|central bank|credit|loan|mortgage|insurance|commodity|oil price|gold price)\\b/i;

export async function GET(){
  const feeds=[
    fromRss("https://www.sec.gov/news/pressreleases.rss","U.S. SEC"),
    fromRss("https://www.federalreserve.gov/feeds/press_all.xml","Federal Reserve"),
    fromRss("https://www.ecb.europa.eu/rss/press.html","European Central Bank"),
    fromGdelt()
  ];
  const results=await Promise.allSettled(feeds);
  const articles=results.flatMap(r=>r.status==="fulfilled"?r.value:[]);
  const unique=Array.from(new Map(articles.filter(a=>a.url&&finance.test(a.title)).map(a=>[a.url,a])).values())
    .sort((a,b)=>Date.parse(b.publishedAt||"")-Date.parse(a.publishedAt||"")).slice(0,60);
  if(!unique.length) return NextResponse.json({articles:[],error:"Financial news feeds are temporarily unavailable. Please refresh shortly."},{status:503,headers:{"Cache-Control":"no-store"}});
  return NextResponse.json({articles:unique,updatedAt:new Date().toISOString(),providers:Array.from(new Set(unique.map(a=>a.provider)))},{headers:{"Cache-Control":"s-maxage=600, stale-while-revalidate=1800"}});
}
