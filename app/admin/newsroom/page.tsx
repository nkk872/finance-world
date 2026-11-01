"use client";

import { useState } from "react";
import { ArrowLeft, CheckCircle2, Copy, FileText, LockKeyhole, RefreshCw, ShieldAlert } from "lucide-react";

type Draft = {
  title: string;
  category: string;
  summary: string;
  body: string;
  sourceUrls: string[];
  editorChecks: string[];
  status: string;
};

export default function NewsroomAdminPage() {
  const [token, setToken] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedAt, setGeneratedAt] = useState("");

  async function generateDrafts() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/newsroom/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const responseText = await response.text();
      let data: { error?: string; drafts?: Draft[]; generatedAt?: string };
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(response.status === 504
          ? "The newsroom request timed out. Please try again."
          : "The server returned an unexpected response. Please try again in a moment.");
      }
      if (!response.ok) throw new Error(data.error || "Unable to generate drafts.");
      setDrafts(data.drafts ?? []);
      setGeneratedAt(data.generatedAt ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function copyDraft(draft: Draft) {
    const text = `${draft.title}\n\n${draft.summary}\n\n${draft.body}\n\nSources:\n${draft.sourceUrls.join("\n")}\n\nEditor checks:\n${draft.editorChecks.map((item) => "- " + item).join("\n")}`;
    await navigator.clipboard.writeText(text);
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0b1220", color: "#e8edf5", padding: "28px 16px 64px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <a href="/" style={{ color: "#d7b978", textDecoration: "none", display: "inline-flex", gap: 8, alignItems: "center", marginBottom: 28 }}><ArrowLeft size={16} /> Finance World</a>
        <div style={{ borderBottom: "1px solid #263449", paddingBottom: 22, marginBottom: 26 }}>
          <div style={{ color: "#d7b978", fontSize: 11, letterSpacing: 2, fontWeight: 700 }}>FINANCE WORLD • PRIVATE WORKSPACE</div>
          <h1 style={{ fontSize: 34, margin: "10px 0", letterSpacing: -1 }}>AI Newsroom</h1>
          <p style={{ color: "#9eacc0", lineHeight: 1.6, maxWidth: 650, margin: 0 }}>Generate article drafts from current financial headlines. Every draft stays unpublished until an editor checks the facts and approves it.</p>
        </div>

        <section style={{ background: "#111c2d", border: "1px solid #29384d", borderRadius: 14, padding: 20, marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}><LockKeyhole color="#d7b978" size={19} /><h2 style={{ fontSize: 18, margin: 0 }}>Owner access</h2></div>
          <label htmlFor="newsroom-token" style={{ display: "block", color: "#aeb9c9", fontSize: 13, marginBottom: 8 }}>Newsroom access token</label>
          <input id="newsroom-token" type="password" autoComplete="off" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Enter your private access token" style={{ width: "100%", boxSizing: "border-box", padding: 13, borderRadius: 8, border: "1px solid #394a61", background: "#0b1220", color: "white", outline: "none" }} />
          <button onClick={generateDrafts} disabled={loading || !token.trim()} style={{ marginTop: 14, border: 0, borderRadius: 8, background: loading ? "#776b52" : "#d7b978", color: "#15191f", padding: "12px 18px", fontWeight: 700, cursor: loading || !token.trim() ? "not-allowed" : "pointer", display: "inline-flex", gap: 9, alignItems: "center" }}>
            {loading ? <RefreshCw size={16} /> : <FileText size={16} />}{loading ? "Researching and drafting…" : "Generate 3 article drafts"}
          </button>
          {error && <p role="alert" style={{ color: "#ff9b9b", marginBottom: 0, lineHeight: 1.5 }}>{error}</p>}
        </section>

        {drafts.length > 0 && <div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", margin: "30px 0 16px", flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 22, margin: 0 }}>Generated drafts ({drafts.length})</h2>
            <span style={{ color: "#91a0b5", fontSize: 12 }}>{generatedAt ? new Date(generatedAt).toLocaleString() : ""}</span>
          </div>
          {drafts.map((draft, index) => <article key={index} style={{ background: "#111c2d", border: "1px solid #29384d", borderRadius: 14, padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ color: "#d7b978", fontSize: 11, letterSpacing: 1.2, fontWeight: 700 }}>{draft.category.toUpperCase()} • DRAFT {index + 1}</span>
              <span style={{ color: "#e8c982", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}><ShieldAlert size={14} /> {draft.status}</span>
            </div>
            <h3 style={{ fontSize: 22, lineHeight: 1.3, margin: "12px 0" }}>{draft.title}</h3>
            <p style={{ color: "#bdc8d8", lineHeight: 1.6 }}>{draft.summary}</p>
            <div style={{ whiteSpace: "pre-wrap", color: "#d5dce7", lineHeight: 1.75, fontSize: 14 }}>{draft.body}</div>
            {draft.sourceUrls.length > 0 && <div style={{ marginTop: 18 }}><b style={{ fontSize: 13 }}>Source links</b>{draft.sourceUrls.map((url) => <p key={url} style={{ margin: "7px 0" }}><a href={url} target="_blank" rel="noreferrer" style={{ color: "#d7b978", overflowWrap: "anywhere" }}>{url}</a></p>)}</div>}
            {draft.editorChecks.length > 0 && <div style={{ marginTop: 18, background: "#202b3b", borderRadius: 9, padding: 14 }}><b style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 13 }}><CheckCircle2 size={15} color="#e4c27b" /> Editor checks before publishing</b><ul style={{ color: "#c4cfdd", paddingLeft: 20, lineHeight: 1.7, fontSize: 13 }}>{draft.editorChecks.map((item, i) => <li key={i}>{item}</li>)}</ul></div>}
            <button onClick={() => copyDraft(draft)} style={{ marginTop: 16, background: "transparent", border: "1px solid #59677a", borderRadius: 7, color: "#e8edf5", padding: "9px 13px", cursor: "pointer", display: "inline-flex", gap: 8, alignItems: "center" }}><Copy size={14} /> Copy draft</button>
          </article>)}
        </div>}

        <p style={{ color: "#8190a5", fontSize: 12, lineHeight: 1.6, marginTop: 28 }}>Security note: the Gemini API key stays on the server. Drafts currently exist only in this browser session; persistent saving, approval and publishing will be added in the next stage. AI-generated text can contain errors and must be checked against the original sources.</p>
      </div>
    </main>
  );
}
