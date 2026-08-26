import React, { useEffect, useState } from "react";
import { BarChart3, Users, Megaphone } from "lucide-react";

const STAGE_COLORS = { pending: "#6b7280", analyzed: "#6366f1", invited: "#10b981", booked: "#0d9488", interviewed: "#059669", hired: "#7c3aed", rejected: "#ef4444" };

export const AnalyticsView = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("calendarjet_admin_token") || "";
    if (!token) return;
    fetch("/api/analytics", { headers: { authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return <div style={{ padding: "2rem" }}>Memuat analytics…</div>;

  const stages = ["pending", "analyzed", "invited", "booked", "interviewed", "hired", "rejected"];
  const max = Math.max(1, ...stages.map((s) => data.applicants[s] || 0));

  return (
    <div style={{ padding: "1.5rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, display: "flex", gap: 8, alignItems: "center" }}><BarChart3 size={20} /> Analytics Rekrutmen</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 16 }}>
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", gap: 6, alignItems: "center" }}><Users size={14} /> Total Pelamar</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{data.total}</div>
        </div>
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Diterima (Hired)</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#7c3aed" }}>{data.applicants.hired || 0}</div>
        </div>
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", gap: 6, alignItems: "center" }}><Megaphone size={14} /> Post Terbit</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#10b981" }}>{data.posts.published || 0}</div>
        </div>
      </div>

      <div style={{ marginTop: 20, background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Funnel Kandidat</h3>
        {stages.map((s) => {
          const count = data.applicants[s] || 0;
          const pct = Math.round((count / max) * 100);
          return (
            <div key={s} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>{s}</span>
                <span>{count}</span>
              </div>
              <div style={{ height: 12, background: "var(--bg-secondary)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: STAGE_COLORS[s], borderRadius: 6 }} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20, background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Status Postingan</h3>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {Object.entries(data.posts).map(([k, v]) => (
            <div key={k} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{v}</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{k}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
