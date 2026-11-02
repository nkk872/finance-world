import { NextResponse } from "next/server";

export const revalidate=60;
type MarketQuote={symbol:string;name:string;price:number;change24h?:number;currency:string;type:"crypto"|"forex";provider:string};
async function cryptoQuotes():Promise<MarketQuote[]>{
 const ids="bitcoin,ethereum,solana,binancecoin,ripple";
 const url="https://api.coingecko.com/api/v3/simple/price?ids="+ids+"&vs_currencies=usd&include_24hr_change=true";
 const res=await fetch(url,{headers:{accept:"application/json"},next:{revalidate:60},signal:AbortSignal.timeout(7000)});
 if(!res.ok)throw new Error("Crypto market provider unavailable");
 const data=await res.json();
 const defs=[["bitcoin","BTC","Bitcoin"],["ethereum","ETH","Ethereum"],["solana","SOL","Solana"],["binancecoin","BNB","BNB"],["ripple","XRP","XRP"]] as const;
 return defs.flatMap(([id,symbol,name])=>typeof data[id]?.usd==="number"?[{symbol,name,price:data[id].usd,change24h:typeof data[id].usd_24h_change==="number"?data[id].usd_24h_change:undefined,currency:"USD",type:"crypto" as const,provider:"CoinGecko"}]:[]);
}
async function forexQuotes():Promise<MarketQuote[]>{
 const symbols="EUR,GBP,JPY,INR,CNY,AUD,CAD,CHF,SGD";
 const res=await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols="+symbols,{headers:{accept:"application/json"},next:{revalidate:3600},signal:AbortSignal.timeout(7000)});
 if(!res.ok)throw new Error("Foreign exchange provider unavailable");
 const data=await res.json();
 const names:Record<string,string>={EUR:"Euro",GBP:"British pound",JPY:"Japanese yen",INR:"Indian rupee",CNY:"Chinese yuan",AUD:"Australian dollar",CAD:"Canadian dollar",CHF:"Swiss franc",SGD:"Singapore dollar"};
 return Object.entries(data.rates??{}).flatMap(([symbol,value])=>typeof value==="number"?[{symbol,name:names[symbol]??symbol,price:value,currency:symbol,type:"forex" as const,provider:"Frankfurter"}]:[]);
}
export async function GET(){
 const [crypto,forex]=await Promise.allSettled([cryptoQuotes(),forexQuotes()]);
 const quotes=[...(crypto.status==="fulfilled"?crypto.value:[]),...(forex.status==="fulfilled"?forex.value:[])];
 return NextResponse.json({quotes,updatedAt:new Date().toISOString(),sources:{crypto:crypto.status==="fulfilled"?"ok":"unavailable",forex:forex.status==="fulfilled"?"ok":"unavailable"},notes:{crypto:"Live market quotes; 24-hour change where supplied.",forex:"Latest published reference exchange rates; not tick-by-tick prices."}},{headers:{"Cache-Control":"s-maxage=60, stale-while-revalidate=300"}});
}