"use client";

import { useEffect, useState } from "react";

type Draft = { title: string; url: string; domain: string; publishedAt: string; status: string };
type Feed = { articles: Draft[]; count: number; source: string; note: string };

export default function AdminDashboard() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadDrafts() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/newsroom/drafts", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load the review queue.");
      setFeed(data);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load the review queue."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadDrafts(); }, []);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.assign("/admin/login");
  }

  return <main className="admin-shell">
    <aside className="admin-sidebar">
      <a className="admin-logo" href="/"><span>F</span> FINANCE WORLD</a>
      <p className="admin-side-label">WORKSPACE</p>
      <div className="admin-nav-active">▤ &nbsp; Newsroom overview</div>
      <div className="admin-nav-muted">◷ &nbsp; Review queue</div>
      <div className="admin-nav-muted">✎ &nbsp; AI article writer <small>Next stage</small></div>
      <div className="admin-nav-muted">◎ &nbsp; Publishing <small>Next stage</small></div>
      <div className="admin-side-bottom"><div className="admin-owner"><span>O</span><div><b>Site owner</b><small>Administrator</small></div></div><button onClick={logout} className="admin-logout">Sign out</button></div>
    </aside>
    <section className="admin-main">
      <header className="admin-topbar"><div><span className="admin-kicker">FINANCE WORLD / NEWSROOM</span><h1>Newsroom overview</h1></div><a href="/" className="admin-view-site">View website ↗</a></header>
      <div className="admin-welcome"><div><span className="admin-status-dot"/> OWNER WORKSPACE <h2>Good to see you.</h2><p>Discover global finance headlines and prepare them for editorial review.</p></div><div className="admin-date">AI publishing mode <b>Manual approval required</b></div></div>
      <div className="admin-stats">
        <article><span>DISCOVERED HEADLINES</span><strong>{loading ? "—" : feed?.count ?? 0}</strong><small>From the latest GDELT feed</small></article>
        <article><span>AWAITING REVIEW</span><strong>{loading ? "—" : feed?.count ?? 0}</strong><small>Not yet fact-checked</small></article>
        <article><span>APPROVED TO PUBLISH</span><strong>0</strong><small>Approval workflow not enabled yet</small></article>
      </div>
      <section className="admin-panel">
        <div className="admin-panel-head"><div><span className="admin-kicker">LIVE DISCOVERY</span><h2>Incoming finance headlines</h2><p>Source links are provided for research. Nothing here is published automatically.</p></div><button className="admin-refresh" onClick={loadDrafts} disabled={loading}>{loading ? "Refreshing…" : "↻ Refresh feed"}</button></div>
        {error && <p className="admin-error">{error}</p>}
        {loading && <p className="admin-muted">Loading discovered headlines…</p>}
        {!loading && feed?.articles.map((item, index) => <article className="admin-draft" key={item.url}><div className="admin-draft-index">{String(index + 1).padStart(2, "0")}</div><div className="admin-draft-copy"><h3>{item.title}</h3><div><span>{item.domain}</span><span>·</span><span>{item.publishedAt || "Recently discovered"}</span></div></div><span className="admin-review-status">Needs review</span><a href={item.url} target="_blank" rel="noopener noreferrer" className="admin-source-link">Open source ↗</a></article>)}
        {!loading && !error && !feed?.articles.length && <p className="admin-muted">No headlines were returned. Refresh to try again.</p>}
        {feed && <p className="admin-feed-note">{feed.note}</p>}
      </section>
      <p className="admin-footnote">This first release is a protected discovery dashboard. AI claim checks, saved drafts, approve/reject actions and publishing will be added after a persistent database and AI provider are configured.</p>
    </section>
  </main>;
}
