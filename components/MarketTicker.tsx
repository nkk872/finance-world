"use client";
import { useEffect,useState } from "react";
import { RefreshCw } from "lucide-react";
type Quote={symbol:string;name:string;price:number;change24h?:number;currency:string;type:"crypto"|"forex";provider:string};
type Instrument={symbol:string;name:string;price:number;changePercent:number|null;currency:string;group:"index"|"commodity";provider:string;asOf:string|null};
export default function MarketTicker(){
 const [quotes,setQuotes]=useState<Quote[]>([]),[instruments,setInstruments]=useState<Instrument[]>([]),[updated,setUpdated]=useState(""),[loading,setLoading]=useState(true),[errors,setErrors]=useState<string[]>([]);
 useEffect(()=>{let alive=true;const load=async()=>{
  const results=await Promise.allSettled([
   fetch("/api/markets",{cache:"no-store"}).then(async r=>{if(!r.ok)throw new Error("Currency and crypto feed unavailable");return r.json();}),
   fetch("/api/markets/overview",{cache:"no-store"}).then(async r=>{if(!r.ok)throw new Error("Index and commodity feed unavailable");return r.json();})
  ]);
  if(!alive)return;
  const nextErrors:string[]=[];
  if(results[0].status==="fulfilled"){
   setQuotes(Array.isArray(results[0].value.quotes)?results[0].value.quotes:[]);
   if(results[0].value.sources&&Object.values(results[0].value.sources).every(v=>v!=="ok"))nextErrors.push("Currency and crypto providers did not return current data.");
  }else nextErrors.push("Currency and crypto data could not be loaded.");
  if(results[1].status==="fulfilled"){
   const data=results[1].value;
   setInstruments([...(Array.isArray(data.indexes)?data.indexes:[]),...(Array.isArray(data.commodities)?data.commodities:[])]);
   if(data.failed>0)nextErrors.push(data.failed+" index or commodity quote(s) are temporarily unavailable.");
  }else nextErrors.push("Index and commodity data could not be loaded.");
  setUpdated(new Date().toISOString());setErrors(nextErrors);setLoading(false);
 };load();const id=setInterval(load,60000);return()=>{alive=false;clearInterval(id);};},[]);
 const crypto=quotes.filter(q=>q.type==="crypto"),forex=quotes.filter(q=>q.type==="forex");
 const money=(v:number,c:string)=>new Intl.NumberFormat("en-US",{style:"currency",currency:c,maximumFractionDigits:v<1?5:2}).format(v);
 const indexes=instruments.filter(q=>q.group==="index"),commodities=instruments.filter(q=>q.group==="commodity");
 const marketPrice=(q:Instrument)=>new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(q.price)+" "+q.currency;
 const marketChange=(v:number|null)=>v===null?"Change unavailable":(v>=0?"+":"")+v.toFixed(2)+"%";
 const empty=(label:string)=><p className="meta" style={{gridColumn:"1 / -1"}}>{loading?"Loading "+label+"…":"No "+label+" data returned by the provider. Please check again shortly."}</p>;
 return <section className="market-board" aria-label="Global market snapshot">
  <div className="market-board-head"><div><span className="eyebrow">Global market snapshot</span><h2>Markets at a glance</h2></div><span className="market-updated" aria-live="polite"><RefreshCw size={12}/>{loading?"Loading market feeds":updated?"Checked "+new Date(updated).toLocaleTimeString():"Waiting for data"}</span></div>
  {errors.map(message=><p className="market-error" key={message} role="status">{message}</p>)}
  <div className="market-quotes">
   <div className="market-group"><h3>CRYPTOCURRENCY <small>USD • 24H CHANGE</small></h3><div className="market-quote-grid">{crypto.length?crypto.map(q=><div className="quote-card" key={q.symbol}><span>{q.name} <b>{q.symbol}</b></span><strong>{money(q.price,"USD")}</strong><small className={q.change24h===undefined?"":q.change24h>=0?"positive":"negative"}>{q.change24h===undefined?"—":(q.change24h>=0?"+":"")+q.change24h.toFixed(2)+"%"}</small></div>):empty("crypto quotes")}</div></div>
   <div className="market-group"><h3>GLOBAL CURRENCIES <small>1 USD =</small></h3><div className="market-quote-grid">{forex.length?forex.map(q=><div className="quote-card" key={q.symbol}><span>{q.name} <b>{q.symbol}</b></span><strong>{q.price.toLocaleString("en-US",{maximumFractionDigits:4})} {q.symbol}</strong><small className="quote-muted">Reference rate</small></div>):empty("currency rates")}</div></div>
  </div>
  <div className="market-extra-grid">
   <div className="market-group"><h3>GLOBAL STOCK INDICES <small>LATEST AVAILABLE</small></h3><div className="market-quote-grid">{indexes.length?indexes.map(q=><div className="quote-card" key={q.symbol}><span>{q.name} <b>{q.symbol.replace(/^\^/,"")}</b></span><strong>{marketPrice(q)}</strong><small className={q.changePercent===null?"quote-muted":q.changePercent>=0?"positive":"negative"}>{marketChange(q.changePercent)}</small></div>):empty("stock index quotes")}</div></div>
   <div className="market-group"><h3>COMMODITIES & ENERGY <small>FUTURES</small></h3><div className="market-quote-grid">{commodities.length?commodities.map(q=><div className="quote-card" key={q.symbol}><span>{q.name}</span><strong>{marketPrice(q)}</strong><small className={q.changePercent===null?"quote-muted":q.changePercent>=0?"positive":"negative"}>{marketChange(q.changePercent)}</small></div>):empty("commodity quotes")}</div></div>
  </div>
  <p className="market-disclaimer">Crypto: CoinGecko. FX: Frankfurter reference rates. Indices and commodities: Yahoo Finance latest available daily observations; data may be delayed. Gold and silver values are futures contracts, not spot prices. Prices are informational, not investment advice.</p>
 </section>;
}
