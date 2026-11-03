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

function countryFor(title:string,domain:string):string{
 const v=(title+" "+domain).toLowerCase();
 const groups:[string,string[]][]=[
 ["India",["india","indian","rbi","sensex","nifty","mumbai","rupee","moneycontrol","livemint","businessline"]],["China",["china","chinese","beijing","shanghai","yuan","scmp"]],["Japan",["japan","japanese","tokyo","nikkei","yen"]],["South Korea",["south korea","korean","seoul","koreaherald"]],["Singapore",["singapore"]],["Hong Kong",["hong kong"]],["Indonesia",["indonesia","jakarta"]],["Malaysia",["malaysia","kuala lumpur"]],["Thailand",["thailand","bangkok"]],["Vietnam",["vietnam"]],["Pakistan",["pakistan","karachi"]],["Bangladesh",["bangladesh","dhaka"]],["Sri Lanka",["sri lanka","colombo"]],
 ["Nigeria",["nigeria","lagos"]],["Kenya",["kenya","nairobi"]],["South Africa",["south africa","johannesburg"]],["Egypt",["egypt","cairo"]],["Ghana",["ghana","accra"]],["Morocco",["morocco","casablanca"]],["Ethiopia",["ethiopia"]],
 ["Germany",["germany","berlin","frankfurt"]],["France",["france","paris"]],["United Kingdom",["united kingdom","britain","london","uk"]],["Italy",["italy","rome","milan"]],["Spain",["spain","madrid"]],["Switzerland",["switzerland","zurich"]],["Netherlands",["netherlands","amsterdam"]],["Ireland",["ireland","dublin"]],["Sweden",["sweden","stockholm"]],["Norway",["norway","oslo"]],["Denmark",["denmark","copenhagen"]],
 ["United States",["united states","u.s.","wall street","new york","federal reserve"]],["Canada",["canada","toronto"]],["Mexico",["mexico","mexico city"]],["Brazil",["brazil","sao paulo"]],["Argentina",["argentina","buenos aires"]],["Chile",["chile","santiago"]],["Colombia",["colombia","bogota"]],["Peru",["peru","lima"]],["Australia",["australia","sydney","melbourne"]],["New Zealand",["new zealand","auckland"]]
 ];
 for(const [name,terms] of groups)if(terms.some(term=>v.includes(term)))return name;
 return "";
}
function regionFor(title: string, domain: string): string {
 const country=countryFor(title,domain);
 const areas:[string,string[]][]=[
 ["Asia",["India","China","Japan","South Korea","Singapore","Hong Kong","Indonesia","Malaysia","Thailand","Vietnam","Pakistan","Bangladesh","Sri Lanka","United Arab Emirates","Saudi Arabia","Qatar","Türkiye"]],
 ["Africa",["Nigeria","Kenya","South Africa","Egypt","Ghana","Morocco","Ethiopia"]],
 ["Europe",["Germany","France","United Kingdom","Italy","Spain","Switzerland","Netherlands","Ireland","Sweden","Norway","Denmark"]],
 ["North America",["United States","Canada","Mexico"]],["South America",["Brazil","Argentina","Chile","Colombia","Peru"]],["Oceania",["Australia","New Zealand"]]
 ];
 for(const [region,countries] of areas)if(countries.includes(country))return region;
 const v=(title+" "+domain).toLowerCase();
 if(v.includes("africa"))return "Africa";if(v.includes("europe")||v.includes("eurozone")||v.includes("ecb"))return "Europe";
 if(v.includes("south america")||v.includes("latin america"))return "South America";if(v.includes("oceania")||v.includes("pacific islands"))return "Oceania";
 if(v.includes("asia")||v.includes("asean")||v.includes("middle east"))return "Asia";
 if(v.includes("united states")||v.includes("u.s.")||v.includes("wall street")||v.includes("canada"))return "North America";
 return "Global";
}
