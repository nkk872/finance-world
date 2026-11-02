"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Clock3, Search, TrendingUp } from "lucide-react";
import MarketTicker from "../components/MarketTicker";

type Article = { title:string; url:string; domain:string; publishedAt:string; image:string|null; summary:string; category:string; provider:string; region?:string };
const categories=["All","World Finance","Economy","Banking","Markets","Business","Crypto","Forex","Commodities","Real Estate","Fintech"];
const regions=["All Regions","Global","Asia","Asia-Pacific","Europe","North America","Middle East","Africa","Latin America"];
function formatDate(value:string){if(!value)return "Recently";const d=new Date(value);return Number.isNaN(d.getTime())?value:d.toLocaleString("en",{dateStyle:"medium",timeStyle:"short",timeZone:"UTC"})+" UTC";}
function categoryImage(category:string){
 const images:Record<string,string>={Markets:"https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1000&q=80",Economy:"https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=1000&q=80",Business:"https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=80",Crypto:"https://images.unsplash.com/photo-1518546305927-5a555bb7020d?auto=format&fit=crop&w=1000&q=80",Banking:"https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?auto=format&fit=crop&w=1000&q=80"};
 return images[category]||images.Markets;
}
function articleHref(a:Article){
 const slug=a.title.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"").slice(0,90)||"financial-story";
 const q=new URLSearchParams({title:a.title,source:a.domain,url:a.url,publishedAt:a.publishedAt,category:a.category,summary:a.summary||"",image:a.image||""});
 return "/article/"+encodeURIComponent(slug)+"?"+q.toString();
}
export default function Home(){
 const [articles,setArticles]=useState<Article[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[category,setCategory]=useState("All"),[region,setRegion]=useState("All Regions"),[query,setQuery]=useState(""),[visibleCount,setVisibleCount]=useState(40);
 useEffect(()=>{let active=true;const load=async()=>{try{const res=await fetch("/api/news",{cache:"no-store"});const data=await res.json();if(!res.ok)throw new Error(data.error||"Financial news is temporarily unavailable.");if(active){setArticles(Array.isArray(data.articles)?data.articles:[]);setError("");}}catch(e){if(active)setError(e instanceof Error?e.message:"News feed unavailable.");}finally{if(active)setLoading(false);}};load();const timer=setInterval(load,10*60*1000);return()=>{active=false;clearInterval(timer);};},[]);
 const filtered=useMemo(()=>articles.filter(a=>{const text=(a.title+" "+a.domain+" "+a.category).toLowerCase();return text.includes(query.toLowerCase())&&(category==="All"||a.category===category)&&(region==="All Regions"||a.region===region);}),[articles,category,region,query]);
 useEffect(()=>{setVisibleCount(40);},[category,region,query]);
 const featured=filtered[0];
 return <>
  <div className="topline"><div className="container topline-inner"><span>GLOBAL FINANCE • BUSINESS • ECONOMY</span><span>Finance World • Independent financial coverage</span></div></div>
  <header className="masthead"><div className="container masthead-inner"><a className="brand" href="/"><span className="brand-mark">F</span> FINANCE<span className="brand-word">WORLD</span></a><nav className="nav"><a href="#latest">Latest</a><a href="#latest">Markets</a><a href="#latest">Business</a><a href="#latest">Economy</a><a href="#latest">Crypto</a></nav><div className="actions"><label className="search"><Search size={14}/><input aria-label="Search stories" placeholder=" Search stories" value={query} onChange={e=>setQuery(e.target.value)} style={{border:0,outline:0,width:105}}/></label><a className="subscribe" href="#about">About <ArrowUpRight size={13}/></a></div></div></header>
  <div className="marketbar"><div className="container market-inner"><span className="market-label"><TrendingUp size={14}/> Financial desk</span><span className="market-item"><b>GLOBAL</b><span>Markets & economy</span></span><span className="market-item"><b>UPDATED</b><span>Every 10 minutes</span></span><span className="market-item"><b>REPORTING</b><span>Source-attributed</span></span></div></div>
  <main className="container page">\n   <MarketTicker />
   <div className="eyebrow">Clarity in a changing financial world</div>
   <section className="hero"><article className="hero-main"><span className="pill">Global finance briefing</span><h1>Understand the markets. See the bigger picture.</h1><p>Financial news, market developments and clear explanations — brought together in one place.</p><div className="meta"><span>FINANCE WORLD</span><span>•</span><span><Clock3 size={12}/> Latest coverage</span></div></article><div className="hero-side"><article className="side-story"><div><span className="pill">Markets</span><h2>Track the stories moving global markets</h2></div><div className="meta">STOCKS • BONDS • CURRENCIES</div></article><article className="side-story"><div><span className="pill">Economy</span><h2>Understand rates, inflation and business</h2></div><div className="meta">ECONOMY • BANKING • BUSINESS</div></article></div></section>
   <section id="latest" style={{marginTop:42,marginBottom:38}}>
    <div className="section-head"><div><div className="eyebrow">Fresh financial coverage</div><h2>Latest financial news</h2><p>Open a story to read its Finance World article page, with available reporting details and source notes.</p></div><span className="pill">Live news feed</span></div>
    <div className="filters">{categories.map(c=><button key={c} className={category===c?"filter active":"filter"} onClick={()=>setCategory(c)}>{c}</button>)}</div>
    <div className="filters" aria-label="Filter news by world region">{regions.map(r=><button key={r} className={region===r?"filter active":"filter"} onClick={()=>setRegion(r)}>{r}</button>)}</div>
    {loading?<p className="meta">Loading current financial news…</p>:error?<p className="meta">{error}</p>:filtered.length?<><div className="news-grid">{filtered.slice(0,visibleCount).map((a,i)=><article className="news-card" key={a.url}><a className={"news-image "+["market","economy","business","crypto"][i%4]} href={articleHref(a)} aria-label={"Read "+a.title}><img src={a.image||categoryImage(a.category)} alt="" loading={i<4?"eager":"lazy"} onError={e=>{e.currentTarget.style.display="none";}}/><span>{a.category||"FINANCIAL NEWS"}{!a.image?" • ILLUSTRATIVE":""}</span></a><div className="news-copy"><span className="pill">{a.category||"FINANCE"}</span><h3><a href={articleHref(a)}>{a.title}</a></h3>{a.summary?<p>{a.summary.replace(/<[^>]*>/g," ").slice(0,190)}{a.summary.length>190?"…":""}</p>:<p>Finance World is tracking this developing story from {a.region||"Global"} coverage. Open for available details, context and source information.</p>}<div className="meta"><span>{a.domain}</span><span>•</span><span>{formatDate(a.publishedAt)}</span></div></div></article>)}</div>{filtered.length>visibleCount?<div style={{display:"flex",justifyContent:"center",marginTop:28}}><button className="filter active" onClick={()=>setVisibleCount(n=>Math.min(n+40,filtered.length))}>Load more headlines ({filtered.length-visibleCount} remaining)</button></div>:<p className="meta" style={{textAlign:"center",marginTop:24}}>Showing all {filtered.length} available headlines</p>}</>:<p className="meta">No current headlines matched. Please refresh later.</p>}
    <p className="meta" style={{marginTop:14}}>News metadata and excerpts are attributed to their sources. Finance World article pages provide editorial context; publisher rights remain with their owners.</p>
   </section>
   <section id="about" className="sidebar-card"><h3>About Finance World</h3><p>Finance World is an independent financial news and explainer website covering markets, business, banking, the economy and digital assets. We attribute external reporting and distinguish sourced facts from our own analysis.</p></section>
  </main>
  <footer className="footer"><div className="container footer-inner"><div><div className="brand" style={{color:"white"}}><span className="brand-mark">F</span> FINANCE<span className="brand-word">WORLD</span></div><p>Your World. Your Markets. Your Money.</p></div><p>© 2026 Finance World. For information and education, not investment advice.</p></div></footer>
 </>;
}
