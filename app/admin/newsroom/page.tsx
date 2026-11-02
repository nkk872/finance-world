"use client";

import { useState } from "react";
import { ArrowLeft, ExternalLink, LockKeyhole, RefreshCw } from "lucide-react";

type Article = { title: string; url: string; source: string; publishedAt: string };

export default function NewsroomAdminPage() {
  const [token, setToken] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  async function loadFinancialNews() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/newsroom/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token.trim()}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load financial headlines.");
      setArticles(data.articles ?? []);
      setUpdatedAt(data.updatedAt ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load financial headlines.");
    } finally { setLoading(false); }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0b1220", color: "#e8edf5", padding: "28px 16px 64px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <a href="/" style={{ color: "#d7b978", textDecoration: "none", display: "inline-flex", gap: 8, alignItems: "center", marginBottom: 28 }}><ArrowLeft size={16} /> Finance World</a>
        <div style={{ borderBottom: "1px solid #263449", paddingBottom: 22, marginBottom: 26 }}>
          <div style={{ color: "#d7b978", fontSize: 11, letterSpacing: 2, fontWeight: 700 }}>FINANCE WORLD • PRIVATE WORKSPACE</div>
          <h1 style={{ fontSize: 34, margin: "10px 0", letterSpacing: -1 }}>Financial Newsroom</h1>
          <p style={{ color: "#9eacc0", lineHeight: 1.6, maxWidth: 650, margin: 0 }}>Live financial headlines from open news data and official financial institutions. No AI writing service or AI news provider is used. Open each publisher's original article to read the full report.</p>
        </div>
        <section style={{ background: "#111c2d", border: "1px solid #29384d", borderRadius: 14, padding: 20, marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}><LockKeyhole color="#d7b978" size={19} /><h2 style={{ fontSize: 18, margin: 0 }}>Owner access</h2></div>
          <label htmlFor="newsroom-token" style={{ display: "block", color: "#aeb9c9", fontSize: 13, marginBottom: 8 }}>Newsroom access token</label>
          <input id="newsroom-token" type="password" autoComplete="off" value={token} onChange={e => setToken(e.target.value)} placeholder="Enter your private access token" style={{ width: "100%", boxSizing: "border-box", padding: 13, borderRadius: 8, border: "1px solid #394a61", background: "#0b1220", color: "white" }} />
          <button onClick={loadFinancialNews} disabled={loading || !token.trim()} style={{ marginTop: 14, border: 0, borderRadius: 8, background: "#d7b978", color: "#15191f", padding: "12px 18px", fontWeight: 700, cursor: loading || !token.trim() ? "not-allowed" : "pointer", display: "inline-flex", gap: 9, alignItems: "center" }}>
            <RefreshCw size={16} />{loading ? "Loading financial news…" : "Load latest financial news"}
          </button>
          {error && <p role="alert" style={{ color: "#ff9b9b", marginBottom: 0, lineHeight: 1.5 }}>{error}</p>}
        </section>
        {articles.length > 0 && <>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", margin: "30px 0 16px", flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 22, margin: 0 }}>Latest financial headlines ({articles.length})</h2>
            <span style={{ color: "#91a0b5", fontSize: 12 }}>{updatedAt ? new Date(updatedAt).toLocaleString() : ""}</span>
          </div>
          {articles.map((article, i) => <article key={article.url} style={{ background: "#111c2d", border: "1px solid #29384d", borderRadius: 12, padding: 18, marginBottom: 12 }}>
            <div style={{ color: "#d7b978", fontSize: 11, letterSpacing: 1, fontWeight: 700 }}>{article.source.toUpperCase()}</div>
            <h3 style={{ fontSize: 19, lineHeight: 1.4, margin: "9px 0" }}>{article.title}</h3>
            <div style={{ color: "#91a0b5", fontSize: 12, marginBottom: 12 }}>{article.publishedAt || "Publication time not supplied"}</div>
            <a href={article.url} target="_blank" rel="noreferrer" style={{ color: "#e4c27b", display: "inline-flex", alignItems: "center", gap: 7, textDecoration: "none" }}>Read original source <ExternalLink size={14} /></a>
          </article>)}
        </>}
        <p style={{ color: "#8190a5", fontSize: 12, lineHeight: 1.6, marginTop: 28 }}>Sources: GDELT open-data news index, U.S. SEC, Federal Reserve and European Central Bank. Headlines and links only; original publishers retain their article content and rights.</p>
      </div>
    </main>
  );
}
