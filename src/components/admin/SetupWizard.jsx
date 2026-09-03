import React, { useEffect, useState } from "react";
import { useBooking } from "../../context/BookingContext";
import { ShieldCheck, Circle, CircleCheck, Link2, Cpu, Brain, ArrowRight } from "lucide-react";

export const SetupWizard = () => {
  const { socialAccounts, setActiveAdminTab, setActivePotensiSub, showToast } = useBooking();
  const [tokenOk, setTokenOk] = useState(false);
  const [modelOk, setModelOk] = useState(false);
  const [psyOk, setPsyOk] = useState(false);

  const headers = () => {
    const token = localStorage.getItem("calendarjet_admin_token") || "";
    return token ? { authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem("calendarjet_admin_token") || "";
      setTokenOk(!!token);
      if (!token) return;
      try {
        const r = await fetch("/api/settings", { headers: headers() });
        if (r.ok) {
          const j = await r.json();
          setModelOk(!!j.settings?.llm_model);
          setPsyOk(!!j.settings?.psychotest_url);
        }
      } catch {}
    })();
  }, [socialAccounts.length]);

  const steps = [
    { id: "token", label: "Token Admin", done: tokenOk, tab: "potensi", sub: "accounts", desc: "Simpan Admin Token di tab Hubungkan Akun" },
    { id: "accounts", label: "Akun Sosmed", done: socialAccounts.length > 0, tab: "potensi", sub: "accounts", desc: "Hubungkan TikTok/IG/FB/Threads" },
    { id: "model", label: "Model AI", done: modelOk, tab: "potensi", sub: "ai", desc: "Fetch & pilih model OpenRouter" },
    { id: "psy", label: "URL Psikotes", done: psyOk, tab: "potensi", sub: "hr", desc: "URL aplikasi psikotes (sikotes)" },
  ];
  const allDone = steps.every((s) => s.done);

  if (allDone) return null;

  return (
    <div style={{ marginBottom: 16, padding: 16, background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 700 }}>
        <ShieldCheck size={16} color="#4F46E5" /> Persiapan Sistem ({steps.filter((s) => s.done).length}/{steps.length} selesai)
      </div>
      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        {steps.map((s, i) => (
          <div key={s.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 10px", background: s.done ? "#ecfdf5" : "var(--bg-secondary)", border: `1px solid ${s.done ? "#a7f3d0" : "var(--border-default)"}`, borderRadius: 8, flexWrap: "wrap" }}>
            <span style={{ width: 20, height: 20, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", background: s.done ? "#10b981" : "#9ca3af", color: "#fff", fontSize: 11, fontWeight: 700 }}>{s.done ? "✓" : i + 1}</span>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{s.label} {s.done ? "" : "— belum"}</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{s.desc}</div>
            </div>
            {!s.done && (
              <button onClick={() => { setActiveAdminTab(s.tab); setActivePotensiSub(s.sub); showToast("Tab pengaturan dibuka → selesaikan langkah ini"); }} style={{ padding: "6px 10px", borderRadius: 8, background: "#4F46E5", color: "#fff", fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>Lanjut <ArrowRight size={12} /></button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};