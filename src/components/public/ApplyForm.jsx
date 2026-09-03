import React, { useState, useEffect } from "react";
import { useBooking } from "../../context/BookingContext";
import { Upload, Send } from "lucide-react";

export const ApplyForm = ({ jobSlug }) => {
  const { jobs, submitApplication, showToast } = useBooking();
  const [job, setJob] = useState(() => jobs.find((j) => j.slug === jobSlug) ?? null);
  const [jobStatus, setJobStatus] = useState(job ? "ready" : "loading");
  const [form, setForm] = useState({ name: "", email: "", wa: "", tiktok: "", ig: "", cv: null });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!jobSlug) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/jobs/slug/${encodeURIComponent(jobSlug)}`);
        if (!r.ok) throw new Error("job not found");
        const j = await r.json();
        if (!cancelled && j.job) {
          setJob(j.job);
          setJobStatus("ready");
        }
      } catch {
        if (!cancelled && !job) setJobStatus("notfound");
      }
    })();
    return () => { cancelled = true; };
  }, [jobSlug]);

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
      else if (res?.rateLimited) showToast("Terlalu banyak permintaan â€” coba lagi dalam beberapa menit. CV Anda tidak terkirim.", "error");
      else if (res?.offline) showToast("CV tersimpan lokal â€” server tidak terjangkau. HR menerima lamaran saat server pulih.", "warning");
      else if (res?.error) showToast(`Gagal mengirim: ${res.error}`, "error");
      else showToast(res?.applicantId ? "CV terkirim â€” sedang diverifikasi AI" : "Tersimpan lokal (Worker offline)", "success");
      if (res?.applicantId) setForm({ name: "", email: "", wa: "", tiktok: "", ig: "", cv: null });
    } catch (err) {
      showToast(String(err), "error");
    } finally {
      setLoading(false);
    }
  };

  if (jobStatus === "loading") return <div style={{ padding: 24, textAlign: "center", color: "var(--text-secondary)" }}>Memuat lowonganâ€¦</div>;
  if (!job) return <div style={{ padding: 24 }}>Lowongan tidak ditemukan â€” tautan tidak valid atau lowongan sudah ditutup</div>;

  return (
    <div style={{ maxWidth: 640, margin: "2rem auto", padding: 20, background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12 }}>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }} id="apply-title">Lamar: {job.title}</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>{job.description}</p>
      <form onSubmit={handleSubmit} aria-labelledby="apply-title" style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <input required aria-label="Nama lengkap" placeholder="Nama lengkap" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }} />
        <input required type="email" aria-label="Email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }} />
        <input aria-label="Nomor WhatsApp atau telepon" placeholder="WA / Phone" value={form.wa} onChange={(e) => setForm({ ...form, wa: e.target.value })} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <input aria-label="Handle TikTok" placeholder="Handle TikTok (@...)" value={form.tiktok} onChange={(e) => setForm({ ...form, tiktok: e.target.value })} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }} />
          <input aria-label="Handle Instagram" placeholder="Handle IG (@...)" value={form.ig} onChange={(e) => setForm({ ...form, ig: e.target.value })} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }} />
        </div>
        <label style={{ display: "flex", gap: 8, alignItems: "center", padding: "12px", border: "1px dashed var(--border-default)", borderRadius: 8, cursor: "pointer" }}>
          <Upload size={16} /><span style={{ fontSize: 14 }}>{form.cv ? `${form.cv.name} (${Math.round(form.cv.size / 1024)} KB)` : "Upload CV (PDF/DOCX, max 10MB)"}</span>
          <input type="file" aria-label="Upload CV" accept=".pdf,.docx,.doc" onChange={(e) => setForm({ ...form, cv: e.target.files?.[0] ?? null })} style={{ display: "none" }} />
        </label>
        <button type="submit" disabled={loading} aria-label="Kirim lamaran" style={{ background: "#a8201a", color: "#fff", padding: "12px 16px", borderRadius: 8, fontWeight: 700, display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
          <Send size={16} />{loading ? "Mengirimâ€¦" : "Kirim Lamaran"}
        </button>
      </form>
      <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 8 }}>CV akan dianalisa AI (40% liveExp, bonus followers tidak wajib). Lolos → email invite link interview 7 hari.</p>
    </div>
  );
};
