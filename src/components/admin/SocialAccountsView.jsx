import React, { useState } from "react";
import { useBooking } from "../../context/BookingContext";
import { Link2, Unlink, Plus, Film, Camera, Share2, AtSign, Repeat, CheckCircle2, Key, AlertCircle, Sparkles, Loader2 } from "lucide-react";
import { statusLabelId } from "../../utils/statusLabels";

const PLATFORMS = [
  { id: "tiktok", label: "TikTok", icon: Film, color: "#010101", meta: false },
  { id: "instagram", label: "Instagram", icon: Camera, color: "#E1306C", meta: true },
  { id: "facebook", label: "Facebook", icon: Share2, color: "#1877F2", meta: true },
  { id: "x", label: "X (Twitter)", icon: AtSign, color: "#000000", meta: false },
  { id: "threads", label: "Threads", icon: Repeat, color: "#000000", meta: true },
];

const GUIDES = {
  facebook: [
    "Buka developers.facebook.com/tools/explorer — login dengan akun Facebook yang mengelola Halaman bisnis kamu.",
    "Pilih aplikasi kamu, lalu tambahkan permission: pages_show_list, pages_manage_posts, pages_read_engagement.",
    "Klik Generate Access Token → pilih Halaman bisnis kamu → salin token yang muncul.",
    "Paste token di bawah → sistem kami otomatis memvalidasi & menampilkan daftar Halaman milikmu.",
  ],
  instagram: [
    "Syarat: akun IG harus Business/Creator dan terhubung ke Halaman Facebook.",
    "Ikuti langkah Facebook di atas (token dari Graph API Explorer mencakup IG).",
    "Setelah validasi, pilih Halaman yang memiliki IG Business terhubung — sistem ambil IG ID otomatis.",
  ],
  threads: [
    "Gunakan token Facebook yang memiliki permission threads_basic & threads_content_publish.",
    "Paste token → validasi → pilih Threads user dari daftar.",
  ],
  tiktok: [
    "Buka developers.tiktok.com → buat aplikasi → aktifkan Content Posting API.",
    "Ambil access_token + open_id dari proses Login Kit kamu.",
    "Paste access_token di sini — sistem validasi & ambil open_id otomatis.",
  ],
  x: [
    "Koneksi X bersifat manual (catat username). Auto-post X butuh API berbayar — saat ini hanya pencatatan.",
  ],
};

export const SocialAccountsView = () => {
  const { socialAccounts, addSocialAccount, removeSocialAccount, setActiveAdminTab, showToast } = useBooking();
  const [platform, setPlatform] = useState("facebook");
  const [token, setToken] = useState("");
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(null);
  const [selectedPage, setSelectedPage] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem("calendarjet_admin_token") || "");

  const headers = () => {
    const t = localStorage.getItem("calendarjet_admin_token") || "";
    return t ? { "content-type": "application/json", authorization: `Bearer ${t}` } : { "content-type": "application/json" };
  };

  const saveAdminToken = () => {
    if (!adminToken.trim()) return showToast("Masukkan token dulu", "error");
    localStorage.setItem("calendarjet_admin_token", adminToken.trim());
    showToast("Token admin disimpan", "success");
  };

  const handleValidate = async () => {
    if (!token.trim()) return showToast("Paste access token dulu", "error");
    setValidating(true);
    setError("");
    setValidated(null);
    try {
      const r = await fetch("/api/social/validate", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ platform, token: token.trim() }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) {
        setValidated({ name: j.name, pages: j.pages || [], openId: j.openId, longLived: j.longLived || null });
        if (j.pages?.length) setSelectedPage(j.pages[0].id);
        showToast("Token valid — " + (j.name || ""), "success");
      } else {
        setError(j.error || "Token tidak valid");
      }
    } catch {
      setError("Server tidak terjangkau — cek koneksi lalu coba lagi");
    } finally {
      setValidating(false);
    }
  };

  const handleConnect = async () => {
    const meta = PLATFORMS.find((p) => p.id === platform);
    const finalToken = validated?.longLived?.token || token.trim();
    let pageId = "";
    let openId = "";
    let username = validated?.name || username;

    if (meta && meta.meta) {
      if (!validated) return showToast("Validasi token dulu", "error");
      if (!selectedPage) return showToast("Pilih Halaman dulu", "error");
      pageId = selectedPage;
      if (platform === "instagram") {
        const page = validated.pages.find((p) => p.id === selectedPage);
        if (!page?.igBusinessId) return showToast("Halaman ini belum punya IG Business terhubung", "error");
        pageId = page.igBusinessId;
      }
    }
    if (platform === "tiktok") {
      if (!validated?.openId) return showToast("Validasi token dulu untuk ambil open_id", "error");
      openId = validated.openId;
      username = validated.name || "TikTok User";
    }

    const acc = await addSocialAccount({ platform, username, displayName: username, accessToken: finalToken, pageId, openId });
    setToken(""); setValidated(null); setUsername(""); setError("");
    showToast(`Akun ${PLATFORMS.find((p) => p.id === platform)?.label} terhubung!`, "success");
  };

  return (
    <div style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <input value={adminToken} onChange={(e) => setAdminToken(e.target.value)} placeholder="Admin Token (wajib untuk aksi HR ke server)" style={{ flex: 1, minWidth: 220, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }} />
        <button onClick={saveAdminToken} style={{ padding: "8px 12px", borderRadius: 8, background: "#a8201a", color: "#fff", fontWeight: 600 }}>Simpan Token</button>
      </div>

      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, display: "flex", gap: 8, alignItems: "center" }}><Link2 size={20} /> Hubungkan Akun Sosial Media</h1>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>Ikuti panduan di bawah — sistem memvalidasi token & mengambil ID otomatis. Tidak perlu ketik ID manual.</p>

      <div style={{ marginTop: 20, background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontWeight: 700, display: "flex", gap: 8, alignItems: "center" }}><Key size={16} /> Langkah 1 — Pilih Platform</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          {PLATFORMS.map((p) => {
            const Icon = p.icon;
            return (
              <button key={p.id} type="button" onClick={() => { setPlatform(p.id); setValidated(null); setError(""); }} style={{ display: "flex", gap: 6, alignItems: "center", padding: "8px 12px", borderRadius: 8, border: platform === p.id ? `2px solid ${p.color}` : "1px solid var(--border-default)", background: platform === p.id ? "#fff" : "var(--bg-secondary)", fontWeight: 600 }}>
                <Icon size={14} style={{ color: p.color }} /> {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 20, background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontWeight: 700, display: "flex", gap: 8, alignItems: "center" }}><Sparkles size={16} /> Langkah 2 — Ambil Token (panduan)</h3>
        <ol style={{ marginTop: 10, paddingLeft: 20, display: "grid", gap: 6, fontSize: 13, color: "var(--text-secondary)" }}>
          {(GUIDES[platform] || []).map((g, i) => <li key={i}>{g}</li>)}
        </ol>
      </div>

      <div style={{ marginTop: 20, background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontWeight: 700 }}>Langkah 3 — Validasi Token</h3>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste Access Token di sini" style={{ flex: 1, minWidth: 240, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }} />
          <button onClick={handleValidate} disabled={validating} style={{ padding: "10px 16px", borderRadius: 8, background: "#a8201a", color: "#fff", fontWeight: 600, display: "flex", gap: 6, alignItems: "center" }}>
            {validating ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />} {validating ? "Memvalidasi…" : "Validasi"}
          </button>
        </div>
        {error && <div style={{ marginTop: 10, padding: 10, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#b91c1c", fontSize: 13, display: "flex", gap: 6 }}><AlertCircle size={14} /> {error}</div>}

        {validated && (
          <div style={{ marginTop: 14 }}>
            <div style={{ padding: 10, background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 8, fontSize: 13, color: "#065f46", fontWeight: 600 }}>
              ✓ Token valid — Halo {validated.name}!
              {validated.longLived && <span style={{ fontWeight: 400, marginLeft: 6 }}>(Token diperpanjang otomatis — berlaku 60 hari)</span>}
            </div>

            {validated.pages?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Langkah 4 — Pilih {platform === "instagram" ? "Halaman dengan IG Business" : platform === "threads" ? "Threads Account" : "Halaman"}:</div>
                <select value={selectedPage} onChange={(e) => setSelectedPage(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }}>
                  {validated.pages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.igBusinessId ? " (IG Business: " + p.igBusinessId + ")" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Label akun (cth: @potensi.creative)" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }} />
              <button
                onClick={() => {
                  const meta = PLATFORMS.find((p) => p.id === platform);
                  if (!validated) return showToast("Validasi token dulu", "error");
                  let pageId = selectedPage;
                  let openId = validated.openId || "";
                  if (PLATFORMS.find((p) => p.id === platform)?.meta && !pageId) return showToast("Pilih halaman dulu", "error");
                  if (platform === "instagram") {
                    const pg = validated.pages.find((p) => p.id === selectedPage);
                    if (pg?.igBusinessId) pageId = pg.igBusinessId;
                  }
                  addSocialAccount({ platform, username: username || validated.name, displayName: validated.name, accessToken: validated.longLived?.token || token.trim(), pageId, openId, tokenExpires: validated.longLived?.expires });
                  setToken(""); setValidated(null); setUsername("");
                }}
                style={{ background: "#a8201a", color: "#fff", padding: "10px 16px", borderRadius: 8, fontWeight: 700, display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}
              >
                <Link2 size={16} /> Hubungkan Akun Ini
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Akun Terhubung ({socialAccounts.length})</h3>
        {socialAccounts.length === 0 && <div style={{ padding: 20, background: "var(--bg-surface)", border: "1px dashed var(--border-default)", borderRadius: 12, color: "var(--text-secondary)" }}>Belum ada akun — ikuti langkah 1-4 di atas.</div>}
        <div style={{ display: "grid", gap: 12 }}>
          {socialAccounts.map((a) => {
            const p = PLATFORMS.find((x) => x.id === a.platform);
            const Icon = p?.icon || Share2;
            const statusColor = a.status === "connected" ? "#10b981" : a.status === "expired" ? "#ef4444" : "#f59e0b";
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 14, background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: p?.color || "#4F46E5", color: "#fff" }}><Icon size={18} /></span>
                  <div>
                    <div style={{ fontWeight: 700 }}>{a.displayName}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{a.platform} · {a.username}</div>
                    {a.tokenExpires && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Token berlaku s.d. {new Date(a.tokenExpires).toLocaleDateString("id-ID")}</div>}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center", color: statusColor, fontWeight: 600 }}><CheckCircle2 size={14} /> {a.status === "connected" ? "Terhubung" : "Manual"}</span>
                  <button onClick={() => { if (window.confirm(`Putuskan koneksi akun ${a.platform} @${a.username}? Token akan dihapus.`)) removeSocialAccount(a.id); }} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--bg-surface)", color: "#ef4444", display: "flex", gap: 6, alignItems: "center" }}><Unlink size={14} /> Putus</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};