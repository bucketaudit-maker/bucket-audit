"use client";
import { useState } from "react";

const API = "http://localhost:4000";

export default function Home() {
  const [email, setEmail] = useState("admin@acme.com");
  const [password, setPassword] = useState("ChangeMe123!");
  const [token, setToken] = useState<string>(() => (typeof window !== "undefined" ? localStorage.getItem("token") || "" : ""));
  const [q, setQ] = useState("isPublic:true");
  const [hits, setHits] = useState<any[]>([]);

  async function login() {
    const r = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const j = await r.json();
    localStorage.setItem("token", j.token);
    setToken(j.token);
  }

  async function search() {
    if (!token) return alert("Login first to get a token.");
    const r = await fetch(`${API}/search?q=${encodeURIComponent(q)}`, {
      headers: { authorization: `Bearer ${token}` }
    });
    const j = await r.json();
    setHits(j.hits || []);
  }

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 980 }}>
      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>1) Login</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password" />
          <button onClick={login}>Login</button>
        </div>
        <div style={{ marginTop: 8, color: "#666" }}>
          Token: {token ? token.slice(0, 20) + "..." : "(none)"}
        </div>
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>2) Search</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 420 }} />
          <button onClick={search}>Run</button>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          {hits.map((h) => (
            <div key={h.bucketId} style={{ padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>
              <div><b>{h.name}</b> <span style={{ color: "#666" }}>({h.region || "unknown"})</span></div>
              <div style={{ color: "#444" }}>Public: {String(h.isPublic)} • Severity: {h.severity}</div>
              <div style={{ color: "#666" }}>Types: {(h.findingTypes || []).join(", ")}</div>
            </div>
          ))}
          {hits.length === 0 ? <div style={{ color: "#666" }}>No results yet.</div> : null}
        </div>
      </div>
    </div>
  );
}
