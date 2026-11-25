"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Search } from "lucide-react";

type Article = {
  id: number; title: string; url: string; domain: string; publishedAt: string;
  image: string | null; summary: string; category: string; provider: string;
  region: string; country: string;
};

const categories = ["All", "Markets", "Economy", "Banking", "Business", "Crypto", "Forex", "Commodities", "Real Estate", "Fintech", "World Finance"];

function href(article: Article) {
  const slug = article.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 90) || "financial-story";
  const q = new URLSearchParams({
    title: article.title, source: article.domain, url: article.url,
    publishedAt: article.publishedAt, category: article.category,
    summary: article.summary || "", image: article.image || "",
  });
  return "/article/" + encodeURIComponent(slug) + "?" + q.toString();
}

function date(value: string) {
  if (!value) return "Date unavailable";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" });
}

export default function ArchivePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "30", q: query, category });
    fetch("/api/archive?" + params.toString(), { cache: "no-store" })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load the news archive");
        return data;
      })
      .then(data => {
        if (!active) return;
        setArticles(data.articles || []);
        setTotal(data.total || 0);
        setPages(data.pages || 1);
        setError("");
      })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Archive unavailable"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, query, category]);

  useEffect(() => { setPage(1); }, [query, category]);

  return (
    <main className="container page" style={{ minHeight: "75vh", paddingTop: 36, paddingBottom: 70 }}>
      <a href="/" className="meta" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
        <ArrowLeft size={15} /> Back to Finance World
      </a>
      <div className="eyebrow">The global financial record</div>
      <div className="section-head" style={{ alignItems: "end" }}>
        <div>
          <h1 style={{ fontSize: "clamp(32px,5vw,54px)", margin: "8px 0" }}>Financial News Archive</h1>
          <p>Search saved headlines from global markets, business, banking, the economy and digital assets.</p>
        </div>
        <span className="pill">{total.toLocaleString()} archived stories</span>
      </div>
      <div className="search" style={{ maxWidth: 620, width: "100%", margin: "26px 0 18px", padding: "12px 16px", display: "flex", gap: 10, alignItems: "center" }}>
        <Search size={17} />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search headlines, sources or topics..." aria-label="Search archived financial news" style={{ border: 0, outline: 0, width: "100%", background: "transparent" }} />
      </div>
      <div className="filters">
        {categories.map(item => <button key={item} className={category === item ? "filter active" : "filter"} onClick={() => setCategory(item)}>{item}</button>)}
      </div>
      {loading ? <p className="meta" style={{ padding: 30 }}>Loading archived headlines…</p> : error ? <p className="meta" style={{ padding: 30 }}>{error}</p> : articles.length ? <>
        <div className="news-grid" style={{ marginTop: 24 }}>
          {articles.map(article => <article className="news-card" key={article.id}>
            <a className="news-image market" href={href(article)}>
              {article.image ? <img src={article.image} alt="" loading="lazy" onError={event => { event.currentTarget.style.display = "none"; }} /> : <div style={{ minHeight: 150, display: "grid", placeItems: "center", color: "white", fontWeight: 800, letterSpacing: 2 }}>FINANCE WORLD</div>}
              <span>{article.category}</span>
            </a>
            <div className="news-copy">
              <span className="pill">{article.category}</span>
              <h3><a href={href(article)}>{article.title}</a></h3>
              {article.summary && <p>{article.summary.slice(0, 180)}{article.summary.length > 180 ? "…" : ""}</p>}
              <div className="meta"><span>{article.domain}</span><span>•</span><span>{date(article.publishedAt)}</span></div>
              <a href={href(article)} style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 12, fontSize: 12, fontWeight: 800 }}>Open story <ArrowUpRight size={13} /></a>
            </div>
          </article>)}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 32 }}>
          <button className="filter" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>Previous</button>
          <span className="meta">Page {page} of {pages}</span>
          <button className="filter active" disabled={page >= pages} onClick={() => setPage(value => Math.min(pages, value + 1))}>Next</button>
        </div>
      </> : <p className="meta" style={{ padding: 30 }}>No archived stories yet. The daily collection service will add articles as it runs.</p>}
    </main>
  );
}
