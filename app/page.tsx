"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Clock3, Search, TrendingUp } from "lucide-react";

type Article = { title: string; url: string; domain: string; publishedAt: string; image: string | null };
const categories = ["All", "Markets", "Economy", "Business", "Crypto", "Banking"];
function formatDate(value: string) {
  if (!value) return "Recently";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";
}

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/news").then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "News feed is temporarily unavailable.");
      if (active) setArticles(Array.isArray(data.articles) ? data.articles : []);
    }).catch(err => { if (active) setError(err instanceof Error ? err.message : "News feed unavailable."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => articles.filter(article => {
    const text = (article.title + " " + article.domain).toLowerCase();
    const matchesQuery = text.includes(query.toLowerCase());
    const matchesCategory = category === "All" || text.includes(category.toLowerCase());
    return matchesQuery && matchesCategory;
  }), [articles, category, query]);

  return <>
    <div className="topline"><div className="container topline-inner"><span>GLOBAL FINANCE • BUSINESS • ECONOMY</span><span>Finance World • Global financial headlines</span></div></div>
    <header className="masthead"><div className="container masthead-inner">
      <a className="brand" href="/"><span className="brand-mark">F</span> FINANCE<span className="brand-word">WORLD</span></a>
      <nav className="nav"><a href="#latest">Latest</a><a href="#latest">Markets</a><a href="#latest">Business</a><a href="#latest">Economy</a><a href="#latest">Crypto</a></nav>
      <div className="actions"><label className="search"><Search size={14}/><input aria-label="Search stories" placeholder=" Search stories" value={query} onChange={e => setQuery(e.target.value)} style={{border:0,outline:0,width:105}}/></label><a className="subscribe" href="#about">About <ArrowUpRight size={13}/></a></div>
    </div></header>
    <div className="marketbar"><div className="container market-inner"><span className="market-label"><TrendingUp size={14}/> Live news</span><span className="market-item"><b>GLOBAL</b><span>Publisher headlines</span></span><span className="market-item"><b>UPDATED</b><span>On request</span></span><span className="market-item"><b>EDITORIAL</b><span>Review required</span></span></div></div>
    <main className="container page">
      <div className="eyebrow">Clarity in a changing financial world</div>
      <section className="hero"><article className="hero-main"><span className="pill">Global finance briefing</span><h1>Understand the markets. See the bigger picture.</h1><p>Discover financial headlines from publishers around the world, with links to original reporting and clear source attribution.</p><div className="meta"><span>FINANCE WORLD</span><span>•</span><span><Clock3 size={12}/> Live headlines</span></div></article>
        <div className="hero-side"><article className="side-story"><div><span className="pill">News desk</span><h2>Follow the stories moving global markets</h2></div><div className="meta">MARKETS • ECONOMY • BUSINESS</div></article><article className="side-story"><div><span className="pill">Editorial standard</span><h2>Read original sources. Check the facts.</h2></div><div className="meta">SOURCE-LINKED COVERAGE</div></article></div>
      </section>
      <section className="live-news" id="latest" style={{marginTop:42,marginBottom:38}}>
        <div className="section-head"><div><div className="eyebrow">Updated from external publishers</div><h2>Latest financial headlines</h2><p>Open each headline to read the original publisher. Headlines are not independently verified by Finance World.</p></div><span className="pill">Live news feed</span></div>
        <div className="filters">{categories.map(c => <button key={c} className={category===c?"filter active":"filter"} onClick={() => setCategory(c)}>{c}</button>)}</div>
        {loading ? <p className="meta">Loading current headlines…</p> : error ? <p className="meta">{error}</p> : filtered.length ? <div className="news-grid">{filtered.slice(0,30).map((article,index) => <article className="news-card" key={article.url}><div className={"news-image "+["market","economy","business","crypto"][index%4]}>{article.domain || "GLOBAL NEWS"}</div><div className="news-copy"><span className="pill">SOURCE HEADLINE</span><h3><a href={article.url} target="_blank" rel="noopener noreferrer">{article.title}</a></h3><div className="meta"><span>{article.domain}</span><span>•</span><span>{formatDate(article.publishedAt)}</span></div></div></article>)}</div> : <p className="meta">No current headlines matched. Please refresh later.</p>}
        <p className="meta" style={{marginTop:14}}>Automated discovery only. AI-generated material requires human fact-checking before publication. This is not investment advice.</p>
      </section>
      <section id="about" className="sidebar-card"><h3>About Finance World</h3><p>Finance World brings together global finance, business and economic headlines with direct links to original publishers. We aim to provide useful context while keeping source reporting visible.</p></section>
    </main>
    <footer className="footer"><div className="container footer-inner"><div><div className="brand" style={{color:"white"}}><span className="brand-mark">F</span> FINANCE<span className="brand-word">WORLD</span></div><p>Your World. Your Markets. Your Money.</p></div><p>© 2026 Finance World. For information and education, not investment advice.</p></div></footer>
  </>;
}