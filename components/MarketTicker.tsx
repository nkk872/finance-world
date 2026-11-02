"use client";
import { useEffect,useState } from "react";
import { ArrowDownRight,ArrowUpRight,RefreshCw } from "lucide-react";
type Quote={symbol:string;name:string;price:number;change24h?:number;currency:string;type:"crypto"|"forex";provider:string};
export default function MarketTicker(){
 const [quotes,setQuotes]=useState<Quote[]>([]),[updated,setUpdated]=useState(""),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{let alive=true;const load=async()=>{try{const r=await fetch("/api/markets",{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error("Market data unavailable");if(alive){setQuotes(d.quotes??[]);setUpdated(d.updatedAt??"");setError("");}}catch(e){if(alive)setError(e instanceof Error?e.message:"Market data unavailable");}finally{if(alive)setLoading(false);}};load();const id=setInterval(load,60000);return()=>{alive=false;clearInterval(id);};},[]);
 const crypto=quotes.filter(q=>q.type==="crypto"),forex=quotes.filter(q=>q.type==="forex");
 const money=(v:number,c:string)=>new Intl.NumberFormat("en-US",{style:"currency",currency:c,maximumFractionDigits:v<1?5:2}).format(v);
 return <section className="market-board" aria-label="Global market snapshot">
  <div className="market-board-head"><div><span className="eyebrow">Global market snapshot</span><h2>Markets at a glance</h2></div><span className="market-updated"><RefreshCw size={12}/>{loading?"Loading quotes":updated?"Updated "+new Date(updated).toLocaleTimeString():"Waiting for data"}</span></div>
  {error&&<p className="market-error">{error}</p>}
  <div className="market-quotes">
   <div className="market-group"><h3>CRYPTOCURRENCY <small>USD • 24H CHANGE</small></h3><div className="market-quote-grid">{crypto.map(q=><div className="quote-card" key={q.symbol}><span>{q.name} <b>{q.symbol}</b></span><strong>{money(q.price,"USD")}</strong><small className={q.change24h===undefined?"":q.change24h>=0?"positive":"negative"}>{q.change24h===undefined?"—":(q.change24h>=0?"+":"")+q.change24h.toFixed(2)+"%"}</small></div>)}</div></div>
   <div className="market-group"><h3>GLOBAL CURRENCIES <small>1 USD =</small></h3><div className="market-quote-grid">{forex.map(q=><div className="quote-card" key={q.symbol}><span>{q.name} <b>{q.symbol}</b></span><strong>{q.price.toLocaleString("en-US",{maximumFractionDigits:4})} {q.symbol}</strong><small className="quote-muted">Reference rate</small></div>)}</div></div>
  </div>
  <p className="market-disclaimer">Crypto quotes are refreshed about every minute. Currency rates are the latest published reference rates and may update less frequently. Data providers: CoinGecko and Frankfurter.</p>
 </section>;
}