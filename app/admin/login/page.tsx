"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login failed.");
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally { setLoading(false); }
  }

  return <main className="admin-login-wrap">
    <form className="admin-login-card" onSubmit={submit}>
      <div className="admin-brand-mark">F</div>
      <p className="admin-kicker">FINANCE WORLD · PRIVATE</p>
      <h1>Owner sign in</h1>
      <p className="admin-muted">The newsroom dashboard is restricted to the site owner.</p>
      <label className="admin-label" htmlFor="admin-password">Admin password</label>
      <input id="admin-password" className="admin-input" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
      {error && <p className="admin-error" role="alert">{error}</p>}
      <button className="admin-primary" type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in securely"}</button>
      <a className="admin-back" href="/">← Back to Finance World</a>
    </form>
  </main>;
}
