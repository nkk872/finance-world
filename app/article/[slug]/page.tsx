import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Clock3, ExternalLink, ShieldCheck } from "lucide-react";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ title?: string; source?: string; url?: string; publishedAt?: string; image?: string }>;
};

function safeExternalUrl(value?: string) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export default async function ArticlePage({ searchParams }: Props) {
  const params = await searchParams;
  const title = params.title || "Financial story";
  const source = params.source || "Original publisher";
  const originalUrl = safeExternalUrl(params.url);
  const publishedAt = params.publishedAt || "";
  const image = safeExternalUrl(params.image);

  return (
    <>
      <div className="topline"><div className="container topline-inner"><span>GLOBAL FINANCE • BUSINESS • ECONOMY</span><span>Finance World • Story briefing</span></div></div>
      <header className="masthead"><div className="container masthead-inner">
        <Link className="brand" href="/"><span className="brand-mark">F</span> FINANCE<span className="brand-word">WORLD</span></Link>
        <Link className="subscribe" href="/">Back to headlines</Link>
      </div></header>
      <main className="container article-page">
        <Link href="/" className="article-back"><ArrowLeft size={15}/> Back to latest news</Link>
        <div className="article-layout">
          <article className="article-main">
            <div className="eyebrow">Finance World • Global briefing</div>
            <div className="article-kicker">MARKETS &amp; BUSINESS</div>
            <h1>{title}</h1>
            <div className="article-byline">
              <span>Source: <strong>{source.replace(/^www\./, "")}</strong></span>
              {publishedAt ? <span><Clock3 size={14}/> {publishedAt}</span> : null}
            </div>
            {image ? <img className="article-cover" src={image} alt="" /> : <div className="article-cover article-cover-placeholder">FINANCE WORLD</div>}
            <section className="article-body">
              <h2>Story briefing</h2>
              <p>This story was discovered through Finance World’s global news monitoring feed. The headline and source details are displayed here so you can follow the story without leaving Finance World immediately.</p>
              <div className="article-note"><ShieldCheck size={18}/><div><strong>Editorial transparency</strong><p>Finance World has not independently verified the claims in this publisher’s report. We do not reproduce the publisher’s full article. Read the original reporting for the complete story and its supporting evidence.</p></div></div>
              <h2>Read the original reporting</h2>
              <p>For the full report, additional context, quotes and any updates, visit the publisher’s original article.</p>
              {originalUrl ? <a className="original-link" href={originalUrl} target="_blank" rel="noopener noreferrer">Read original article at {source.replace(/^www\./, "")} <ExternalLink size={16}/></a> : <p>Original publisher link is unavailable for this story.</p>}
            </section>
          </article>
          <aside className="article-sidebar">
            <div className="sidebar-card"><span className="pill">Finance World</span><h3>Clarity in a changing financial world</h3><p>Follow global markets, business and economic developments with clear source attribution.</p><Link href="/" className="article-side-link">Explore latest headlines <ArrowUpRight size={14}/></Link></div>
            <div className="disclaimer">For information and education only. Nothing on this website is investment advice or a recommendation to buy or sell any asset.</div>
          </aside>
        </div>
      </main>
      <footer className="footer"><div className="container footer-inner"><div><div className="brand" style={{color:"white"}}><span className="brand-mark">F</span> FINANCE<span className="brand-word">WORLD</span></div><p>Your World. Your Markets. Your Money.</p></div><p>© 2026 Finance World. For information and education, not investment advice.</p></div></footer>
    </>
  );
}
