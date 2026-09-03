import React, { useState } from "react";
import { useBooking } from "../../context/BookingContext";
import { Link2, Unlink, Plus, Film, Camera, Share2, AtSign, Repeat, CheckCircle2 } from "lucide-react";

const PLATFORMS = [
  { id: "tiktok", label: "TikTok", icon: Film, color: "#010101" },
  { id: "instagram", label: "Instagram", icon: Camera, color: "#E1306C" },
  { id: "facebook", label: "Facebook", icon: Share2, color: "#1877F2" },
  { id: "x", label: "X (Twitter)", icon: AtSign, color: "#000000" },
  { id: "threads", label: "Threads", icon: Repeat, color: "#000000" },
];

export const SocialAccountsView = () => {
  const { socialAccounts, addSocialAccount, removeSocialAccount, showToast } = useBooking();
  const [platform, setPlatform] = useState("tiktok");
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [pageId, setPageId] = useState("");
  const [openId, setOpenId] = useState("");
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem("calendarjet_admin_token") || "");

  const saveAdminToken = () => {
    localStorage.setItem("calendarjet_admin_token", adminToken.trim());
    showToast("Token admin disimpan", "success");
  };

  const handleConnect = (e) => {
    e.preventDefault();
    if (!username.trim()) return showToast("Masukkan username akun", "error");
    addSocialAccount({ platform, username: username.trim(), displayName: username.trim(), accessToken: token.trim(), pageId: pageId.trim(), openId: openId.trim() });
    setUsername("");
    setToken("");
    setPageId("");
    setOpenId("");
  };

  return (
    <div style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <input value={adminToken} onChange={(e) => setAdminToken(e.target.value)} placeholder="Admin Token (wajib untuk aksi HR ke server)" style={{ flex: 1, minWidth: 220, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }} />
        <button onClick={saveAdminToken} style={{ padding: "8px 12px", borderRadius: 8, background: "#4F46E5", color: "#fff", fontWeight: 600 }}>Simpan Token</button>
      </div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, display: "flex", gap: 8, alignItems: "center" }}><Link2 size={20} /> Hubungkan Akun Sosial Media</h1>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>Hubungkan akun untuk auto-posting lowongan rekrutmen. Untuk IG/FB/Threads isi token Meta + page/IG/threads user ID; TikTok isi token + open_id.</p>

      <form onSubmit={handleConnect} style={{ marginTop: 20, background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 20, display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {PLATFORMS.map((p) => {
            const Icon = p.icon;
            return (
              <button key={p.id} type="button" onClick={() => setPlatform(p.id)} style={{ display: "flex", gap: 6, alignItems: "center", padding: "8px 12px", borderRadius: 8, border: platform === p.id ? `2px solid ${p.color}` : "1px solid var(--border-default)", background: platform === p.id ? "#fff" : "var(--bg-secondary)", fontWeight: 600 }}>
                <Icon size={14} style={{ color: p.color }} /> {p.label}
              </button>
            );
          })}
        </div>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username akun (cth: @potensi.creative)" style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }} />
        <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Access Token (wajib untuk auto-post Meta: IG/FB/Threads)" style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }} />
        {["facebook", "instagram", "threads"].includes(platform) && (
          <input value={pageId} onChange={(e) => setPageId(e.target.value)} placeholder={`${platform === "facebook" ? "Page ID" : platform === "instagram" ? "Instagram Business Account / IG User ID" : "Threads User ID"} (dari Meta Developer)`} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }} />
        )}
        {platform === "tiktok" && (
          <input value={openId} onChange={(e) => setOpenId(e.target.value)} placeholder="TikTok open_id (dari TikTok Developer)" style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }} />
        )}
        <button type="submit" style={{ background: "#4F46E5", color: "#fff", padding: "10px 16px", borderRadius: 8, fontWeight: 700, display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}><Plus size={16} /> Hubungkan Akun</button>
      </form>

      <div style={{ marginTop: 20 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Akun Terhubung ({socialAccounts.length})</h3>
        {socialAccounts.length === 0 && <div style={{ padding: 20, background: "var(--bg-surface)", border: "1px dashed var(--border-default)", borderRadius: 12, color: "var(--text-secondary)" }}>Belum ada akun — hubungkan di atas.</div>}
        <div style={{ display: "grid", gap: 12 }}>
          {socialAccounts.map((a) => {
            const p = PLATFORMS.find((x) => x.id === a.platform);
            const Icon = p?.icon || Share2;
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 14, background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: p?.color || "#4F46E5", color: "#fff" }}><Icon size={18} /></span>
                  <div>
                    <div style={{ fontWeight: 700 }}>{a.displayName}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{a.platform} · {a.username}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center", color: a.status === "connected" ? "#10b981" : "#f59e0b" }}><CheckCircle2 size={14} /> {a.status === "connected" ? "Terhubung (API)" : "Manual"}</span>
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
