import React, { useState } from "react";
import { useBooking } from "../../context/BookingContext";
import { Upload, Send } from "lucide-react";

export const ApplyForm = ({ jobSlug }) => {
  const { jobs, submitApplication, showToast } = useBooking();
  const job = jobs.find((j) => j.slug === jobSlug) ?? jobs[0];
  const [form, setForm] = useState({ name: "", email: "", wa: "", tiktok: "", ig: "", cv: null });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.cv) return showToast("Upload CV PDF/DOCX", "error");
    if (form.cv.size > 10 * 1024 * 1024) return showToast("CV max 10MB", "error");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return showToast("Email tidak valid", "error");
    if (form.name.trim().length < 2) return showToast("Nama min 2 karakter", "error");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("jobId", job.id);
      fd.append("name", form.name.trim());
      fd.append("email", form.email.trim().toLowerCase());
      fd.append("wa", form.wa.trim());
      fd.append("tiktok", form.tiktok.trim());
      fd.append("ig", form.ig.trim());
      fd.append("cv", form.cv);
      const res = await submitApplication(fd);
      if (res?.error?.includes?.("duplicate")) showToast("Email sudah melamar untuk lowongan ini", "error");
      else if (res?.offline) showToast("CV tersimpan lokal — server tidak terjangkau, HR belum menerima lamaran ini", "warning");
      else showToast(res?.applicantId ? "CV terkirim — sedang diverifikasi AI" : "Tersimpan lokal (Worker offline)", "success");
      if (res?.applicantId) setForm({ name: "", email: "", wa: "", tiktok: "", ig: "", cv: null });
    } catch (err) {
      showToast(String(err), "error");
    } finally {
      setLoading(false);
    }
  };

  if (!job) return <div style={{ padding: 24 }}>No job found — HR belum buat lowongan</div>;

  return (
    <div style={{ maxWidth: 640, margin: "2rem auto", padding: 20, background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12 }}>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>Lamar: {job.title}</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>{job.description}</p>
      <form onSubmit={handleSubmit} style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <input required placeholder="Nama lengkap" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }} />
        <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }} />
        <input placeholder="WA / Phone" value={form.wa} onChange={(e) => setForm({ ...form, wa: e.target.value })} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <input placeholder="Handle TikTok (@...)" value={form.tiktok} onChange={(e) => setForm({ ...form, tiktok: e.target.value })} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }} />
          <input placeholder="Handle IG (@...)" value={form.ig} onChange={(e) => setForm({ ...form, ig: e.target.value })} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }} />
        </div>
        <label style={{ display: "flex", gap: 8, alignItems: "center", padding: "12px", border: "1px dashed var(--border-default)", borderRadius: 8, cursor: "pointer" }}>
          <Upload size={16} /><span style={{ fontSize: 14 }}>{form.cv ? form.cv.name : "Upload CV (PDF/DOCX, max 10MB)"}</span>
          <input type="file" accept=".pdf,.docx,.doc" onChange={(e) => setForm({ ...form, cv: e.target.files?.[0] ?? null })} style={{ display: "none" }} />
        </label>
        <button type="submit" disabled={loading} style={{ background: "#4F46E5", color: "#fff", padding: "12px 16px", borderRadius: 8, fontWeight: 700, display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
          <Send size={16} />{loading ? "Mengirim…" : "Kirim Lamaran"}
        </button>
      </form>
      <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 8 }}>CV akan dianalisa AI (40% liveExp, bonus followers tidak wajib). Lolos → email invite link interview 7 hari.</p>
    </div>
  );
};
