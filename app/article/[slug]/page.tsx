import Link from "next/link";
import { ArrowLeft, Clock3, ExternalLink, ShieldCheck, TrendingUp } from "lucide-react";

type Props={params:Promise<{slug:string}>;searchParams:Promise<{title?:string;source?:string;url?:string;publishedAt?:string;image?:string;summary?:string;category?:string}>};
function safeUrl(value?:string){if(!value)return null;try{const u=new URL(value);return u.protocol==="https:"||u.protocol==="http:"?u.toString():null;}catch{return null;}}
function plain(value:string){return value.replace(/<[^>]*>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g," ").trim();}
function paragraphs(value:string){return plain(value).split(/(?<=[.!?])\s+(?=[A-Z0-9])/).filter(Boolean);}
async function fetchOfficialFullText(url:string|null){
 if(!url)return "";
 try{
  const u=new URL(url);
  if(!["www.sec.gov","sec.gov","www.federalreserve.gov","federalreserve.gov"].includes(u.hostname))return "";
  const response=await fetch(u.toString(),{headers:{"User-Agent":"FinanceWorld/1.0 (source-attributed financial reporting)","Accept":"text/html"},signal:AbortSignal.timeout(5000),next:{revalidate:1800}});
  if(!response.ok)return "";
  const html=await response.text();
  const article=html.match(/<article[\s\S]*?<\/article>/i)?.[0]||html.match(/<main[\s\S]*?<\/main>/i)?.[0]||"";
  if(!article)return "";
  return article.replace(/<(script|style|nav|footer|header)[^>]*>[\s\S]*?<\/\1>/gi," ").replace(/<br\s*\/?>/gi,"\n").replace(/<\/(p|h[1-6]|li|div)>/gi,"\n").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&#x27;/g,"'").replace(/\s+/g," ").trim().slice(0,24000);
 }catch{return "";}
}
export default async function ArticlePage({searchParams}:Props){
 const p=await searchParams,title=p.title||"Financial story",source=p.source||"Financial news source",original=safeUrl(p.url),image=safeUrl(p.image),published=p.publishedAt||"",summary=plain(p.summary||""),category=p.category||"Financial markets";
 const officialText=await fetchOfficialFullText(original);\n const content=paragraphs(officialText||summary);
 return <>
  <div className="topline"><div className="container topline-inner"><span>GLOBAL FINANCE • BUSINESS • ECONOMY</span><span>Finance World • Independent coverage</span></div></div>
  <header className="masthead"><div className="container masthead-inner"><Link className="brand" href="/"><span className="brand-mark">F</span> FINANCE<span className="brand-word">WORLD</span></Link><Link className="subscribe" href="/">Back to news</Link></div></header>
  <main className="container article-page">
   <Link href="/" className="article-back"><ArrowLeft size={15}/> Back to latest financial news</Link>
   <div className="article-layout"><article className="article-main">
    <div className="eyebrow">Finance World • {category}</div><div className="article-kicker">FINANCIAL NEWS REPORT</div>
    <h1>{title}</h1>
    <div className="article-byline"><span>Reporting source: <strong>{source.replace(/^www\./,"")}</strong></span>{published?<span><Clock3 size={14}/>{published}</span>:null}</div>
    {image?<img className="article-cover" src={image} alt={title} />:<div className="article-cover article-cover-placeholder">FINANCE WORLD • {category.toUpperCase()}</div>}
    <section className="article-body">
     <h2>What happened</h2>
     {officialText?<p className="meta">Official public release • full source text reproduced with attribution</p>:null}
     {content.length?content.map((part,i)=><p key={i}>{part}</p>):<p>This story has been identified by Finance World’s financial news monitoring service. The source feed did not provide a usable article summary, so we are not going to invent details. The key confirmed information currently available is the headline above and the source attribution below.</p>}
     <h2>Why this story matters</h2>
     <p>{category==="Markets"?"Market developments can affect asset prices, investor expectations and the cost of capital. The significance depends on the details, market conditions and how investors respond.":category==="Economy"?"Economic data and policy decisions can influence inflation, employment, borrowing costs and growth. Their impact depends on the figures, the outlook and the response from policymakers.":category==="Banking"?"Banking and monetary-policy developments can affect lending conditions, deposits, credit availability and financial stability. The practical impact depends on the institutions and policy details involved.":category==="Crypto"?"Digital-asset developments can influence market liquidity, investor confidence, regulation and risk. Crypto assets can be highly volatile and the implications should be assessed against verified details.":"Business developments can affect company performance, competition, jobs, consumers and investor expectations. The wider impact depends on the facts and the company's financial position."}</p>
     <h2>What to watch next</h2>
     <p>Watch for official statements, updated financial data and further reporting from the named source. Finance World will update its coverage as additional verifiable information becomes available.</p>
     <div className="article-note"><ShieldCheck size={18}/><div><strong>Source transparency</strong><p>This Finance World page keeps the reader on our website. Where permitted, it displays public official release text with attribution; otherwise it uses the available source summary and our own general context. We do not republish copyrighted publisher articles without permission.</p></div></div>
     {original?<div className="source-footer"><strong>Original source: {source.replace(/^www\./,"")}</strong><p>For source verification and the publisher’s complete report, you can open the original article. You can also continue browsing Finance World without leaving this page.</p><a className="original-link" href={original} target="_blank" rel="noopener noreferrer">Verify original source <ExternalLink size={16}/></a></div>:null}
    </section>
   </article><aside className="article-sidebar"><div className="sidebar-card"><span className="pill"><TrendingUp size={12}/> Finance World</span><h3>Understand the financial world</h3><p>Follow market developments, economic policy, banking, business and digital assets with source attribution and clear explanations.</p><Link href="/" className="article-side-link">Explore latest news <ExternalLink size={14}/></Link></div><div className="disclaimer">For information and education only. Nothing on this website is investment advice or a recommendation to buy or sell any asset.</div></aside></div>
  </main>
  <footer className="footer"><div className="container footer-inner"><div><div className="brand" style={{color:"white"}}><span className="brand-mark">F</span> FINANCE<span className="brand-word">WORLD</span></div><p>Your World. Your Markets. Your Money.</p></div><p>© 2026 Finance World. For information and education, not investment advice.</p></div></footer>
 </>;
}
