import React, { useEffect, useMemo, useState } from "react";
import { useBooking } from "../../context/BookingContext";
import { Calendar as CalendarIcon, RefreshCw, CheckCircle2, XCircle, Send, Film, Camera, Share2, AtSign, Repeat } from "lucide-react";

const PLATFORM_ICON = { tiktok: Film, instagram: Camera, facebook: Share2, x: AtSign, threads: Repeat };

export const SocialCalendarView = () => {
  const { socialPosts, cancelPost, repostNow, refreshPosts, showToast } = useBooking();
  const [filter, setFilter] = useState("all");
  const [showNextDays, setShowNextDays] = useState(30);

  useEffect(() => {
    refreshPosts().then((ok) => { if (!ok) showToast("Status post belum tersinkron — set Admin Token lalu refresh", "info"); });
  }, []);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDay = useMemo(() => {
    const map = {};
    for (const p of socialPosts) {
      const d = (p.scheduledAt || "").slice(0, 10);
      if (d) map[d] = map[d] || [];
      if (d) map[d].push(p);
    }
    return map;
  }, [socialPosts]);

  const filtered = socialPosts.filter((p) => filter === "all" || p.status === filter);

  const statusBadge = (s) => {
    const cfg = {
      scheduled: { c: "#f59e0b", label: "Terjadwal" },
      queued_postiz: { c: "#6366f1", label: "Postiz" },
      published: { c: "#10b981", label: "Terbit" },
      cancelled: { c: "#6b7280", label: "Batal" },
      failed: { c: "#ef4444", label: "Gagal" },
    }[s] || { c: "#6b7280", label: s };
    return <span style={{ background: cfg.c, color: "#fff", padding: "2px 8px", borderRadius: 999, fontSize: 11 }}>{cfg.label}</span>;
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(<div key={`blank-${i}`} style={{ minHeight: 80 }} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayPosts = byDay[dateKey] || [];
    cells.push(
      <div key={dateKey} style={{ border: "1px solid var(--border-default)", borderRadius: 8, minHeight: 80, padding: 6, background: d === now.getDate() ? "rgba(79,70,229,0.08)" : "var(--bg-surface)" }}>
        <div style={{ fontWeight: 700, fontSize: 12 }}>{d}</div>
        {dayPosts.slice(0, 3).map((p) => (
          <div key={p.id} style={{ fontSize: 10, marginTop: 4, color: p.status === "published" ? "#10b981" : "var(--text-secondary)" }}>
            {p.platforms[0]} · {p.status === "published" ? "✓" : p.scheduledAt?.slice(11, 16)}
          </div>
        ))}
        {dayPosts.length > 3 && <div style={{ fontSize: 10, color: "var(--text-muted)" }}>+{dayPosts.length - 3}</div>}
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, display: "flex", gap: 8, alignItems: "center" }}><CalendarIcon size={20} /> Dashboard Sosial Media</h1>
        <button onClick={() => showToast("Jadwal termuat", "success")} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--bg-surface)", display: "flex", gap: 6, alignItems: "center" }}><RefreshCw size={14} /> Refresh</button>
      </div>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>Scheduler built-in — kelola postingan rekrutmen tanpa Postiz. Buat post di tab "Overview + Post".</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginTop: 16 }}>
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Terjadwal</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{socialPosts.filter((p) => p.status === "scheduled").length}</div>
        </div>
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Terbit</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{socialPosts.filter((p) => p.status === "published").length}</div>
        </div>
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Batal / Gagal</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{socialPosts.filter((p) => p.status === "cancelled" || p.status === "failed").length}</div>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["all", "scheduled", "queued_postiz", "published", "cancelled"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "8px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, border: "1px solid var(--border-default)", background: filter === f ? "var(--brand-500)" : "var(--bg-surface)", color: filter === f ? "#fff" : "var(--text-primary)" }}>{f}</button>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Kalender Bulanan — {now.toLocaleString("id-ID", { month: "long", year: "numeric" })}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
          {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => <div key={d} style={{ fontWeight: 700, fontSize: 12, textAlign: "center", color: "var(--text-muted)" }}>{d}</div>)}
          {cells}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Daftar Postingan ({filtered.length})</h3>
        {filtered.length === 0 && <div style={{ padding: 20, background: "var(--bg-surface)", border: "1px dashed var(--border-default)", borderRadius: 12, color: "var(--text-secondary)" }}>Belum ada postingan — buat di tab Overview → Jadwalkan Postingan.</div>}
        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map((p) => (
            <div key={p.id} style={{ padding: 14, background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{p.caption?.slice(0, 120)}</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{p.platforms?.join(", ")} · {p.scheduledAt ? new Date(p.scheduledAt).toLocaleString("id-ID") : ""} · {p.jobSlug}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{statusBadge(p.status)}</div>
              <div style={{ display: "flex", gap: 6 }}>
                {p.status === "scheduled" && <button onClick={() => repostNow(p.id)} style={{ padding: "6px 10px", borderRadius: 8, background: "#10b981", color: "#fff", fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}><Send size={14} /> Terbit</button>}
                {(p.status === "scheduled" || p.status === "queued_postiz") && <button onClick={() => cancelPost(p.id)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--bg-surface)", fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}><XCircle size={14} /> Batal</button>}
                {p.status === "published" && <CheckCircle2 size={18} color="#10b981" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
