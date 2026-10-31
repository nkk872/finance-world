"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Clock3, Search, TrendingUp } from "lucide-react";

type Story = { category: string; title: string; excerpt: string; time: string; read: string; tone: string; tag: string };
const stories: Story[] = [
 {category:"Markets",title:"Global markets navigate a new week of uncertainty",excerpt:"Investors are weighing economic signals, corporate updates and shifting expectations across major markets.",time:"Today",read:"4 min read",tone:"market",tag:"MARKET WATCH"},
 {category:"Economy",title:"What the latest economic signals mean for households",excerpt:"A closer look at inflation, employment and policy decisions shaping the global outlook.",time:"Today",read:"6 min read",tone:"economy",tag:"THE BIG PICTURE"},
 {category:"Business",title:"The business trends reshaping tomorrow’s companies",excerpt:"From technology investment to changing consumer habits, businesses are adapting to a fast-moving landscape.",time:"Yesterday",read:"5 min read",tone:"business",tag:"COMPANIES"},
 {category:"Crypto",title:"Digital assets: the themes investors are watching",excerpt:"Regulation, market infrastructure and institutional participation remain key themes in digital assets.",time:"Yesterday",read:"3 min read",tone:"crypto",tag:"DIGITAL ASSETS"},
 {category:"Markets",title:"Understanding the forces behind commodity prices",excerpt:"Supply, demand, currencies and geopolitics all play a role in the prices of essential resources.",time:"Oct 29",read:"5 min read",tone:"market",tag:"COMMODITIES"},
 {category:"Banking",title:"How banks are responding to a changing rate environment",excerpt:"Lenders are balancing deposit competition, credit quality and the outlook for borrowing demand.",time:"Oct 28",read:"4 min read",tone:"business",tag:"BANKING"}
];
const categories = ["All","Markets","Economy","Business","Crypto","Banking"];
type LiveArticle = { title: string; url: string; domain: string; publishedAt: string; image: string | null };
function formatDate(value: string) {
 const match = value.match(/^(\\d{4})(\\d{2})(\\d{2})T(\\d{2})(\\d{2})(\\d{2})/);
 return match ? `${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]} UTC` : value;
}

export default function Home() {
 const [category,setCategory] = useState("All");
 const [query,setQuery] = useState("");
 const filtered = useMemo(() => stories.filter(s => (category==="All" || s.category===category) && (s.title+" "+s.excerpt+" "+s.category).toLowerCase().includes(query.toLowerCase())),[category,query]);
 return <>
  <div className="topline"><div className="container topline-inner"><span>GLOBAL FINANCE • BUSINESS • ECONOMY</span><span>Finance World • Independent financial journalism</span></div></div>
  <header className="masthead"><div className="container masthead-inner">
   <a className="brand" href="#"><span className="brand-mark">F</span> FINANCE<span className="brand-word">WORLD</span></a>
   <nav className="nav"><a href="#latest">Latest</a><a href="#markets">Markets</a><a href="#business">Business</a><a href="#economy">Economy</a><a href="#crypto">Crypto</a></nav>
   <div className="actions"><label className="search"><Search size={14} style={{display:"inline",verticalAlign:"middle"}}/><input aria-label="Search stories" placeholder=" Search stories" value={query} onChange={e=>setQuery(e.target.value)} style={{border:0,outline:0,width:105}}/></label><a className="subscribe" href="#newsletter">Subscribe <ArrowUpRight size={13} style={{display:"inline",verticalAlign:"middle"}}/></a></div>
  </div></header>
  <div className="marketbar"><div className="container market-inner"><span className="market-label"><TrendingUp size={14} style={{display:"inline",verticalAlign:"middle"}}/> Market snapshot</span><span className="market-item"><b>S&amp;P 500</b><span>Data connection pending</span></span><span className="market-item"><b>NASDAQ</b><span>—</span></span><span className="market-item"><b>GOLD</b><span>—</span></span><span className="market-item"><b>BITCOIN</b><span>—</span></span></div></div>
  <main className="container page">
   <div className="eyebrow">Clarity in a changing financial world</div>
   <section className="hero">
    <article className="hero-main"><span className="pill">The daily briefing</span><h1>Understand the markets. See the bigger picture.</h1><p>Global finance, business and economic developments — explained with context so you can make sense of what moves the world.</p><div className="meta"><span>FINANCE WORLD EDITORS</span><span>•</span><span><Clock3 size={12} style={{display:"inline",verticalAlign:"middle"}}/> 5 min read</span></div></article>
    <div className="hero-side"><article className="side-story"><div><span className="pill">World economy</span><h2>Beyond the headlines: indicators shaping the global outlook</h2></div><div className="meta">ANALYSIS • 6 MIN READ</div></article><article className="side-story"><div><span className="pill">Investor toolkit</span><h2>Five financial concepts worth understanding before you invest</h2></div><div className="meta">EXPLAINER • 4 MIN READ</div></article></div>
   </section>
   <section className="live-news" id="latest" style={{marginTop:42,marginBottom:38}}>
    <div className="section-head"><div><div className="eyebrow">Updated from global publishers</div><h2>Live financial headlines</h2><p>Headlines link to their original publishers. Read the source before relying on a claim.</p></div><span className="pill">GDELT news feed</span></div>
    {newsLoading ? <p className="meta">Loading the latest headlines…</p> : newsError ? <p className="meta">{newsError}</p> : liveNews.length ? <div className="news-grid">{liveNews.slice(0,12).map((article,index)=><article className="news-card" key={article.url}><div className={"news-image "+["market","economy","business","crypto"][index%4]}>{article.domain || "GLOBAL NEWS"}</div><div className="news-copy"><span className="pill">SOURCE HEADLINE</span><h3><a href={article.url} target="_blank" rel="noopener noreferrer">{article.title}</a></h3><div className="meta"><span>{article.domain}</span><span>•</span><span>{formatDate(article.publishedAt)}</span></div></div></article>)}</div> : <p className="meta">No matching headlines were returned right now.</p>}
    <p className="meta" style={{marginTop:14}}>This is an automated news discovery feed, not editorial verification. Finance World has not independently fact-checked these articles.</p>
   </section>
   <div className="section-head" id="editorial-samples"><div><div className="eyebrow">Fresh perspectives</div><h2>Explore our editorial topics</h2><p>Sample layout stories while the newsroom and publishing workflow are being built.</p></div><span className="meta">EDITORIAL DESK</span></div>
   <div className="content-grid"><section><div className="filters">{categories.map(c=><button key={c} className={category===c?"filter active":"filter"} onClick={()=>setCategory(c)}>{c}</button>)}</div>
    {filtered.length ? <div className="news-grid">{filtered.map(s=><article className="news-card" key={s.title}><div className={"news-image "+s.tone}>{s.tag}</div><div className="news-copy"><span className="pill">{s.category}</span><h3>{s.title}</h3><p>{s.excerpt}</p><div className="meta"><span>{s.time}</span><span>•</span><span>{s.read}</span></div></div></article>)}</div> : <p>No stories match your search. Try another keyword.</p>}
   </section>
   <aside className="sidebar"><div className="sidebar-card"><h3>Trending topics</h3>{["Central bank decisions and interest rates","Technology investment and AI","Global trade and commodities","Digital assets and regulation"].map((t,i)=><div className="trend" key={t}><span className="trend-num">0{i+1}</span><div><b>{t}</b><small>Explore the topic</small></div></div>)}</div><div className="sidebar-card" id="newsletter"><h3>The Finance World brief</h3><p style={{fontSize:12,lineHeight:1.6,color:"#687386"}}>A concise view of the stories shaping markets and business. Newsletter sign-up will be enabled after email service setup.</p><span className="pill">Coming soon</span></div><div className="disclaimer">Editorial preview: the stories shown here are sample layout content, not live reporting or investment recommendations. Live news, verified source links and market data will be connected before public launch.</div></aside>
   </div>
  </main>
  <footer className="footer"><div className="container footer-inner"><div><div className="brand" style={{color:"white"}}><span className="brand-mark">F</span> FINANCE<span className="brand-word">WORLD</span></div><p>Your World. Your Markets. Your Money.</p></div><p>© 2026 Finance World. Information for education, not investment advice.</p></div></footer>
 </>;
}