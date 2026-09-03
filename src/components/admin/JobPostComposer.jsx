import React, { useState } from "react";
import { useBooking } from "../../context/BookingContext";
import { Megaphone, Calendar, Send, Smartphone, Copy, Check, ImagePlus, Trash2 } from "lucide-react";

export const JobPostComposer = () => {
  const { jobs, createJob, schedulePost, showToast, socialPosts, socialAccounts } = useBooking();
  const [title, setTitle] = useState("Live Streamer TikTok / IG");
  const [description, setDescription] = useState("Host live shopping, jam 19:00-23:00 WIB, percaya diri di kamera.");
  const [caption, setCaption] = useState("🔥 LOWONGAN LIVE STREAMER 🔥\nTikTok & IG | 19:00-23:00 WIB | Daftar via link: /apply?job=live-streamer-tiktok-2026");
  const [platforms, setPlatforms] = useState(["tiktok", "instagram"]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [media, setMedia] = useState([]);
  const [accountIds, setAccountIds] = useState([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return showToast("Gambar max 5MB", "error");
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setMedia((prev) => [...prev, { name: file.name, type: file.type, url: dataUrl }]);
      showToast("Gambar ditambahkan", "success");
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = async () => {
    const job = await createJob({ title, description, criteria: { skills: ["hosting", "komunikasi"], workHours: { start: "19:00", end: "23:00" } } });
    showToast(job ? "Lowongan dibuat" : "Lowongan disimpan lokal", "success");
  };

  const handleSchedule = async () => {
    if (!caption.trim()) return showToast("Isi caption dulu", "error");
    setLoading(true);
    const res = await schedulePost({ caption, platforms, accountIds, media: media.map((m) => m.url), scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : new Date(Date.now() + 86400000).toISOString() });
    setLoading(false);
    if (res.viaPostiz) showToast("Dikirim ke Postiz sidecar", "success");
    else if (res.status === "scheduled") showToast(`Post dijadwalkan — publish ${new Date(res.scheduledAt).toLocaleString("id-ID")}`, "success");
    else showToast("Post disimpan", "info");
  };

  const applySlug = jobs[0]?.slug;
  const copyApplyLink = async () => {
    if (!applySlug) return showToast("Buat lowongan dulu untuk mendapatkan link apply", "error");
    const link = `${window.location.origin}/?job=${encodeURIComponent(applySlug)}`;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(link);
      else { const t = document.createElement("textarea"); t.value = link; document.body.appendChild(t); t.select(); document.execCommand("copy"); document.body.removeChild(t); }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      showToast("Link apply disalin", "success");
    } catch {
      showToast("Gagal menyalin link", "error");
    }
  };

  return (
    <div style={{ padding: "1.5rem", maxWidth: 900 }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, display: "flex", gap: 8, alignItems: "center" }}><Megaphone size={20} /> Buat Lowongan & Jadwalkan Postingan Rekrutmen</h1>
      <p style={{ color: "var(--text-secondary)", marginTop: 4 }}>Lowongan → Scheduler built-in → Apply link. <b>{socialPosts.filter((p) => p.status === "scheduled" || p.status === "queued_postiz").length} terjadwal</b> · {socialAccounts.length} akun terhubung.</p>

      <div style={{ marginTop: 24, background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontWeight: 700 }}>1. Job Posting</h3>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul" style={{ width: "100%", marginTop: 12, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ width: "100%", marginTop: 12, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }} />
        <button onClick={handleCreate} style={{ marginTop: 12, background: "var(--brand-500)", color: "#fff", padding: "10px 16px", borderRadius: 8, fontWeight: 600 }}>Buat Job</button>
        <div style={{ marginTop: 12, fontSize: 13, color: "var(--text-secondary)" }}>Jobs: {jobs.length} — slug: {jobs[0]?.slug}</div>
      </div>

      <div style={{ marginTop: 20, background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontWeight: 700, display: "flex", gap: 8, alignItems: "center" }}><Calendar size={18} /> 2. Social Post — Scheduler Built-in</h3>

        <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, padding: "12px", border: "1px dashed var(--border-default)", borderRadius: 8, cursor: "pointer" }}>
          <ImagePlus size={16} /><span style={{ fontSize: 14 }}>Upload Gambar / Media Lowongan (max 5MB)</span>
          <input type="file" accept="image/*,video/*" onChange={handleFile} style={{ display: "none" }} />
        </label>

        {media.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {media.map((m, i) => (
              <div key={i} style={{ position: "relative", width: 80, height: 80, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border-default)" }}>
                <img src={m.url} alt={m.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button onClick={() => setMedia((prev) => prev.filter((_, x) => x !== i))} style={{ position: "absolute", top: 2, right: 2, background: "#ef4444", color: "#fff", borderRadius: 999, width: 18, height: 18, border: "none", fontSize: 11, lineHeight: 1, cursor: "pointer" }}>✕</button>
              </div>
            ))}
          </div>
        )}

        <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={4} style={{ width: "100%", marginTop: 12, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }} />

        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {["tiktok", "instagram", "facebook", "x", "threads"].map((p) => (
            <label key={p} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 14 }}>
              <input type="checkbox" checked={platforms.includes(p)} onChange={(e) => setPlatforms((prev) => e.target.checked ? [...prev, p] : prev.filter((x) => x !== p))} />{p}
            </label>
          ))}
        </div>

        {socialAccounts.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Kirim ke akun:</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {socialAccounts.map((a) => (
                <label key={a.id} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, padding: "6px 10px", border: "1px solid var(--border-default)", borderRadius: 8, background: accountIds.includes(a.id) ? "rgba(79,70,229,0.1)" : "transparent" }}>
                  <input type="checkbox" checked={accountIds.includes(a.id)} onChange={(e) => setAccountIds((prev) => e.target.checked ? [...prev, a.id] : prev.filter((x) => x !== a.id))} />{a.platform} @{a.username}
                </label>
              ))}
            </div>
          </div>
        )}

        <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} style={{ width: "100%", marginTop: 12, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }} />
        <button onClick={handleSchedule} disabled={loading} style={{ marginTop: 12, background: "#0D9488", color: "#fff", padding: "10px 16px", borderRadius: 8, fontWeight: 600, display: "flex", gap: 8, alignItems: "center" }}><Send size={16} /> {loading ? "Menyimpan…" : "Jadwalkan Postingan"}</button>
      </div>

      <div style={{ marginTop: 20, background: "var(--bg-surface)", border: "1px dashed var(--border-default)", borderRadius: 12, padding: 16 }}>
        <h3 style={{ fontWeight: 700, fontSize: 14, display: "flex", gap: 8, alignItems: "center" }}><Smartphone size={16} /> Link Apply untuk Calon</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          {applySlug ? (
            <>
              <code style={{ background: "var(--bg-secondary)", padding: "8px 12px", borderRadius: 8, fontSize: 12, flex: 1 }}>{window.location.origin}/?job={applySlug}</code>
              <button onClick={copyApplyLink} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--bg-surface)", display: "flex", gap: 6, alignItems: "center" }}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Tersalin" : "Salin"}</button>
            </>
          ) : (
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Buat lowongan di atas terlebih dulu untuk mendapatkan link apply kandidat.</span>
          )}
        </div>
      </div>
    </div>
  );
};
