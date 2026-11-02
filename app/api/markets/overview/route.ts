import { NextResponse } from "next/server";

export const revalidate=300;
type Instrument={symbol:string;name:string;price:number;changePercent:number|null;currency:string;group:"index"|"commodity";provider:string;asOf:string|null};
const instruments=[
 {symbol:"^GSPC",name:"S&P 500",group:"index"},{symbol:"^DJI",name:"Dow Jones",group:"index"},{symbol:"^IXIC",name:"Nasdaq Composite",group:"index"},{symbol:"^FTSE",name:"FTSE 100",group:"index"},{symbol:"^GDAXI",name:"DAX",group:"index"},{symbol:"^N225",name:"Nikkei 225",group:"index"},{symbol:"^HSI",name:"Hang Seng",group:"index"},{symbol:"^BSESN",name:"BSE Sensex",group:"index"},{symbol:"^NSEI",name:"Nifty 50",group:"index"},
 {symbol:"GC=F",name:"Gold Futures",group:"commodity"},{symbol:"SI=F",name:"Silver Futures",group:"commodity"},{symbol:"CL=F",name:"WTI Crude Oil",group:"commodity"},{symbol:"BZ=F",name:"Brent Crude Oil",group:"commodity"},{symbol:"NG=F",name:"Natural Gas",group:"commodity"}
] as const;
async function quote(item:typeof instruments[number]):Promise<Instrument|null>{
 const url="https://query1.finance.yahoo.com/v8/finance/chart/"+encodeURIComponent(item.symbol)+"?range=5d&interval=1d";
 const res=await fetch(url,{headers:{accept:"application/json","user-agent":"Mozilla/5.0 FinanceWorld/1.0"},next:{revalidate:300},signal:AbortSignal.timeout(6500)});
 if(!res.ok)throw new Error("Quote unavailable: "+item.symbol);
 const json=await res.json(),result=json.chart?.result?.[0];
 if(!result)return null;
 const meta=result.meta??{},timestamps=result.timestamp??[],closes=result.indicators?.quote?.[0]?.close??[];
 const valid=closes.map((v:number|null,i:number)=>({value:v,time:timestamps[i]})).filter((v:{value:number|null;time:number})=>typeof v.value==="number");
 if(!valid.length)return null;
 const latest=valid[valid.length-1],previous=valid.length>1?valid[valid.length-2].value:null;
 return {symbol:item.symbol,name:item.name,price:latest.value as number,changePercent:previous&&previous!==0?((latest.value as number-previous)/previous)*100:null,currency:meta.currency??"USD",group:item.group,provider:"Yahoo Finance market data",asOf:new Date(latest.time*1000).toISOString()};
}
export async function GET(){
 const results=await Promise.allSettled(instruments.map(quote));
 const quotes=results.flatMap(r=>r.status==="fulfilled"&&r.value?[r.value]:[]);
 const indexes=quotes.filter(q=>q.group==="index"),commodities=quotes.filter(q=>q.group==="commodity");
 return NextResponse.json({indexes,commodities,updatedAt:new Date().toISOString(),source:"Yahoo Finance",note:"Latest available daily market observations; quotes may be delayed. Futures are not the same as spot prices.",failed:results.filter(r=>r.status==="rejected").length},{headers:{"Cache-Control":"s-maxage=300, stale-while-revalidate=900"}});
}