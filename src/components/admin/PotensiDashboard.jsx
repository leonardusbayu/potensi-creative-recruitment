import React, { useEffect, useState } from "react";
import { useBooking } from "../../context/BookingContext";
import { JobPostComposer } from "./JobPostComposer";
import { SocialCalendarView } from "./SocialCalendarView";
import { CVReviewView } from "./CVReviewView";
import { SocialAccountsView } from "./SocialAccountsView";
import { HRSettingsView } from "./HRSettingsView";
import { AnalyticsView } from "./AnalyticsView";
import { OpenRouterSettingsView } from "./OpenRouterSettingsView";
import { SetupWizard } from "./SetupWizard";
import { Megaphone, Calendar, Users, TrendingUp, Link2, Settings, BarChart3, Cpu } from "lucide-react";

export const PotensiDashboard = () => {
  const [healthDown, setHealthDown] = useState(false);
  const { jobs, applicants, bookings, socialAccounts, refreshAll, activePotensiSub, setActivePotensiSub } = useBooking();
  const [sub, setSub] = useState(activePotensiSub);

  useEffect(() => {
    setSub(activePotensiSub);
  }, [activePotensiSub]);

  useEffect(() => {
    fetch("/api/health").then((r) => r.json()).then((j) => { if (!j.ok) setHealthDown(true); }).catch(() => setHealthDown(true));
  }, []);

  const analyzed = applicants.filter((a) => a.status === "analyzed").length;
  const invited = applicants.filter((a) => a.status === "invited").length;
  const pending = applicants.filter((a) => a.status === "pending").length;
  const hired = applicants.filter((a) => a.status === "hired").length;

  useEffect(() => {
    const t = setInterval(() => { refreshAll(); }, 30000);
    return () => clearInterval(t);
  }, [refreshAll]);

  return (
    <div style={{ padding: "1.5rem" }}>
      {healthDown && (
        <div role="alert" style={{ marginBottom: 12, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, color: "#b91c1c", fontSize: 13, fontWeight: 600 }}>
          Server tidak terjangkau — data mungkin tidak sinkron. Coba lagi nanti.
        </div>
      )}
      <SetupWizard />
      <div style={{ background: "linear-gradient(135deg, #4F46E5 0%, #EC4899 100%)", borderRadius: 16, padding: "20px 24px", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 800, display: "flex", gap: 8, alignItems: "center" }}><Megaphone size={22} /> Potensi Creative Recruitment</h1>
          <p style={{ opacity: 0.9, fontSize: 13, marginTop: 4 }}>Dashboard terpadu — Posting lowongan → Kalender Post (auto-publish) → Hubungkan Akun Sosmed → Review CV AI → Interview</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ background: "rgba(255,255,255,0.2)", padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{jobs.length} Jobs</span>
          <span style={{ background: "rgba(255,255,255,0.2)", padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{applicants.length} Pelamar</span>
          <span style={{ background: "#10b981", padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>{socialAccounts.length} Akun · {bookings.filter((b) => b.status === "confirmed").length} Interview</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 16 }}>
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", gap: 6, alignItems: "center" }}><Calendar size={14} /> Post Terjadwal</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{jobs.length}</div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Auto-post ke akun terhubung</div>
        </div>
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", gap: 6, alignItems: "center" }}><Users size={14} /> Pelamar Masuk</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{applicants.length}</div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{analyzed} dianalisis · {invited} diundang · {pending} pending</div>
        </div>
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", gap: 6, alignItems: "center" }}><TrendingUp size={14} /> Funnel</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{invited} → Interview</div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>CV AI: 40/25/20 +15 bonus followers</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap", borderBottom: "1px solid var(--border-default)", paddingBottom: 8 }}>
        {[
          { id: "overview", label: "Overview + Post" },
          { id: "accounts", label: `Hubungkan Akun (${socialAccounts.length})` },
          { id: "calendar", label: "Kalender Post" },
          { id: "cv", label: "Review CV" },
          { id: "analytics", label: "Analytics" },
          { id: "ai", label: "AI Model (OpenRouter)" },
          { id: "hr", label: "Pengaturan HR" },
        ].map((t) => (
          <button key={t.id} onClick={() => setSub(t.id)} style={{ padding: "8px 14px", borderRadius: 999, fontWeight: 600, fontSize: 13, border: "1px solid var(--border-default)", background: sub === t.id ? "var(--brand-500)" : "var(--bg-surface)", color: sub === t.id ? "#fff" : "var(--text-primary)" }}>{t.label}</button>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        {sub === "overview" && <JobPostComposer />}
        {sub === "accounts" && <SocialAccountsView />}
        {sub === "calendar" && <SocialCalendarView />}
        {sub === "cv" && <CVReviewView />}
        {sub === "analytics" && <AnalyticsView />}
        {sub === "ai" && <OpenRouterSettingsView />}
        {sub === "hr" && <HRSettingsView />}
      </div>

      <div style={{ marginTop: 16, padding: 12, background: "var(--bg-surface)", border: "1px dashed var(--border-default)", borderRadius: 12, fontSize: 12, color: "var(--text-secondary)" }}>
        <b>Terintegrasi penuh:</b> Hubungkan akun TikTok/IG/FB → upload media lowongan → jadwalkan → auto-post. Semua di satu dashboard, tanpa server terpisah.
      </div>
    </div>
  );
};
