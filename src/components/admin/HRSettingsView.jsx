import React, { useEffect, useState } from "react";
import { useBooking } from "../../context/BookingContext";
import { OpenRouterSettingsView } from "./OpenRouterSettingsView";
import { Settings, Mail, Briefcase, X, Cpu, Brain } from "lucide-react";

export const HRSettingsView = () => {
  const { jobs, updateJob, saveTemplate, saveSetting, showToast } = useBooking();
  const [tpl, setTpl] = useState({ type: "invite", subject: "", body: "" });
  const [templates, setTemplates] = useState([]);
  const [psyUrl, setPsyUrl] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("calendarjet_admin_token") || "";
    if (!token) return;
    fetch("/api/settings", { headers: { authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((j) => { if (j.settings?.psychotest_url) setPsyUrl(j.settings.psychotest_url); })
      .catch(() => {});
  }, []);

  const savePsyUrl = async () => {
    const ok = await saveSetting("psychotest_url", psyUrl.trim());
    showToast(ok ? "URL psikotes disimpan" : "Gagal simpan URL psikotes", ok ? "success" : "error");
  };

  useEffect(() => {
    const token = localStorage.getItem("calendarjet_admin_token") || "";
    if (!token) return;
    fetch("/api/templates", { headers: { authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((j) => { if (j.templates) setTemplates(j.templates); })
      .catch(() => {});
  }, []);

  const handleSaveTpl = async () => {
    if (!tpl.subject || !tpl.body) return showToast("Isi subject + body", "error");
    await saveTemplate(tpl.type, tpl.subject, tpl.body);
    setTemplates((prev) => [...prev.filter((t) => t.type !== tpl.type), { type: tpl.type, subject: tpl.subject, body: tpl.body }]);
    setTpl({ type: tpl.type, subject: "", body: "" });
  };

  const closeJob = async (id) => { await updateJob(id, { status: "closed" }); showToast("Lowongan ditutup", "info"); };

  return (
    <div style={{ padding: "1.5rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, display: "flex", gap: 8, alignItems: "center" }}><Settings size={20} /> Pengaturan HR</h1>

      <div style={{ marginTop: 20 }}>
        <OpenRouterSettingsView />
      </div>

      <div style={{ marginTop: 20, background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontWeight: 700, display: "flex", gap: 8, alignItems: "center" }}><Brain size={16} /> Psikotes (sikotes)</h3>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>URL aplikasi psikotes yang dikirim ke kandidat setelah interview.</p>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <input value={psyUrl} onChange={(e) => setPsyUrl(e.target.value)} placeholder="https://sikotes... / URL aplikasi psikotes" style={{ flex: 1, minWidth: 240, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }} />
          <button onClick={savePsyUrl} style={{ padding: "10px 16px", borderRadius: 8, background: "#d97706", color: "#fff", fontWeight: 600 }}>Simpan URL</button>
        </div>
      </div>

      <div style={{ marginTop: 20, background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontWeight: 700, display: "flex", gap: 8, alignItems: "center" }}><Mail size={16} /> Template Email</h3>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {["invite", "reject", "offer", "psychotest"].map((t) => (
            <button key={t} onClick={() => { const found = templates.find((x) => x.type === t); setTpl({ type: t, subject: found?.subject || "", body: found?.body || "" }); }} style={{ padding: "8px 12px", borderRadius: 8, border: tpl.type === t ? "2px solid #4F46E5" : "1px solid var(--border-default)", background: tpl.type === t ? "#fff" : "var(--bg-secondary)", fontWeight: 600 }}>{t}</button>
          ))}
        </div>
        <input value={tpl.subject} onChange={(e) => setTpl({ ...tpl, subject: e.target.value })} placeholder="Subject" style={{ width: "100%", marginTop: 12, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }} />
        <textarea value={tpl.body} onChange={(e) => setTpl({ ...tpl, body: e.target.value })} rows={5} placeholder="Body HTML (gunakan {name} untuk nama kandidat)" style={{ width: "100%", marginTop: 12, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }} />
        <button onClick={handleSaveTpl} style={{ marginTop: 12, background: "#4F46E5", color: "#fff", padding: "10px 16px", borderRadius: 8, fontWeight: 600 }}>Simpan Template</button>
      </div>

      <div style={{ marginTop: 20, background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontWeight: 700, display: "flex", gap: 8, alignItems: "center" }}><Briefcase size={16} /> Kelola Lowongan</h3>
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {jobs.length === 0 && <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>Belum ada lowongan.</div>}
          {jobs.map((j) => (
            <div key={j.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 12px", border: "1px solid var(--border-default)", borderRadius: 8 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{j.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{j.slug} · {j.status}</div>
              </div>
              {j.status !== "closed" && <button onClick={() => closeJob(j.id)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border-default)", color: "#ef4444", display: "flex", gap: 6, alignItems: "center" }}><X size={14} /> Tutup</button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
