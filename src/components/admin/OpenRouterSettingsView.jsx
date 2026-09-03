import React, { useEffect, useState } from "react";
import { useBooking } from "../../context/BookingContext";
import { Cpu, RefreshCw, Save, Key } from "lucide-react";

export const OpenRouterSettingsView = () => {
  const { showToast } = useBooking();
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [savedModel, setSavedModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const headers = () => {
    const token = localStorage.getItem("calendarjet_admin_token") || "";
    return token ? { "content-type": "application/json", authorization: `Bearer ${token}` } : { "content-type": "application/json" };
  };

  const loadSettings = async () => {
    try {
      const r = await fetch("/api/settings", { headers: headers() });
      if (r.ok) { const j = await r.json(); setSavedModel(j.settings?.llm_model || ""); setSelectedModel(j.settings?.llm_model || ""); }
    } catch {}
  };

  const fetchModels = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/models", { headers: headers() });
      const j = await r.json();
      if (r.ok) { setModels(j.models || []); if (!selectedModel && j.models?.length) setSelectedModel(j.models[0].id); }
      else setError(j.error || "Gagal fetch model");
    } catch {
      setError("Gagal fetch model — cek koneksi / API key");
    } finally {
      setLoading(false);
    }
  };

  const saveModel = async () => {
    if (!selectedModel) return showToast("Pilih model dulu", "error");
    try {
      const r = await fetch("/api/settings", { method: "POST", headers: headers(), body: JSON.stringify({ key: "llm_model", value: selectedModel }) });
      if (r.ok) { setSavedModel(selectedModel); showToast(`Model disimpan: ${selectedModel}`, "success"); }
      else showToast("Gagal simpan model", "error");
    } catch { showToast("Gagal simpan model", "error"); }
  };

  const saveKey = async () => {
    if (!apiKey.trim()) return showToast("Masukkan API key", "error");
    try {
      const r = await fetch("/api/settings", { method: "POST", headers: headers(), body: JSON.stringify({ key: "openrouter_key", value: apiKey.trim() }) });
      if (r.ok) { showToast("API key disimpan", "success"); setApiKey(""); }
      else showToast("Gagal simpan key", "error");
    } catch { showToast("Gagal simpan key", "error"); }
  };

  useEffect(() => { loadSettings(); }, []);

  return (
    <div style={{ padding: "1.5rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, display: "flex", gap: 8, alignItems: "center" }}><Cpu size={20} /> OpenRouter — Model AI</h1>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>Pilih model LLM untuk analisis CV. Model disimpan di server (D1) dan dipakai untuk scoring kandidat.</p>

      <div style={{ marginTop: 20, background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontWeight: 700, display: "flex", gap: 8, alignItems: "center" }}><Key size={16} /> API Key</h3>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="OPENROUTER_API_KEY (disimpan di D1)" style={{ flex: 1, minWidth: 240, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }} />
          <button onClick={saveKey} style={{ padding: "10px 16px", borderRadius: 8, background: "#a8201a", color: "#fff", fontWeight: 600, display: "flex", gap: 6, alignItems: "center" }}><Save size={14} /> Simpan Key</button>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 8 }}>Atau set via env: <code>npx wrangler secret put OPENROUTER_API_KEY</code></p>
      </div>

      <div style={{ marginTop: 20, background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontWeight: 700, display: "flex", gap: 8, alignItems: "center" }}><Cpu size={16} /> Pilih Model</h3>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={fetchModels} disabled={loading} style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--bg-surface)", display: "flex", gap: 6, alignItems: "center" }}><RefreshCw size={14} /> {loading ? "Memuat…" : "Fetch Models"}</button>
          {savedModel && <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>Model aktif: {savedModel}</span>}
        </div>
        {error && <div style={{ marginTop: 12, padding: 10, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#b91c1c", fontSize: 13 }}>{error}</div>}
        {models.length > 0 && (
          <>
            <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} style={{ width: "100%", marginTop: 12, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }}>
              {models.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.id})</option>)}
            </select>
            <button onClick={saveModel} style={{ marginTop: 12, background: "#0D9488", color: "#fff", padding: "10px 16px", borderRadius: 8, fontWeight: 600, display: "flex", gap: 6, alignItems: "center" }}><Save size={14} /> Set Model</button>
          </>
        )}
        {models.length === 0 && !loading && !error && <div style={{ marginTop: 12, fontSize: 13, color: "var(--text-secondary)" }}>Klik "Fetch Models" untuk memuat daftar model dari OpenRouter.</div>}
      </div>
    </div>
  );
};
