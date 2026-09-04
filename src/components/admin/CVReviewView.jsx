import React, { useEffect, useState } from "react";
import { useBooking } from "../../context/BookingContext";
import { Search, CheckCircle2, XCircle, Eye, Mail, FileText, MessageCircle, UserCheck, StickyNote, Brain, ClipboardList, RefreshCw } from "lucide-react";
import { statusLabelId } from "../../utils/statusLabels";

export const CVReviewView = ({ initialFilter = "all", initialQuery = "" }) => {
  const { applicants, analyzeApplicant, inviteToInterview, rejectApplication, markApplicantInterviewed, hireApplicant, sendPsychotest, recordPsychotestResult, saveApplicantNotes, getWhatsAppLink, refreshAll, showToast } = useBooking();
  const [filter, setFilter] = useState(initialFilter);
  const [q, setQ] = useState(initialQuery);
  const [selected, setSelected] = useState([]);
  const [notesFor, setNotesFor] = useState(null);
  const [notesText, setNotesText] = useState("");
  const [psyFor, setPsyFor] = useState(null);
  const [psyScore, setPsyScore] = useState("");
  const [psyNotes, setPsyNotes] = useState("");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const t = setInterval(() => { refreshAll(); }, 20000);
    return () => clearInterval(t);
  }, [refreshAll]);

  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const PER_PAGE = 25;
  const list = applicants.filter((a) => {
    if (filter !== "all" && a.status !== filter) return false;
    if (q && !(`${a.name} ${a.email} ${a.tiktok} ${a.ig}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === "newest") return (b.applied_at || "").localeCompare(a.applied_at || "");
    if (sortBy === "oldest") return (a.applied_at || "").localeCompare(b.applied_at || "");
    if (sortBy === "score_high") return (b.score ?? -1) - (a.score ?? -1);
    if (sortBy === "score_low") return (a.score ?? 999) - (b.score ?? 999);
    if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
    return 0;
  });
  const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const pageSafe = Math.min(page, totalPages);
  const paged = list.slice((pageSafe - 1) * PER_PAGE, pageSafe * PER_PAGE);

  const badge = (s, score) => {
    const map = { pending: "#6b7280", analyzed: "#b8352e", invited: "#10b981", rejected: "#ef4444", booked: "#0d9488", interviewed: "#059669", test_sent: "#f59e0b", tested: "#d97706", hired: "#a8201a" };
    const c = map[s] || "#6b7280";
    return <span style={{ background: c, color: "#fff", padding: "2px 8px", borderRadius: 999, fontSize: 12 }}>{s}{score != null ? ` Â· ${score}` : ""}</span>;
  };

  const openPsyResult = (a) => { setPsyFor(a); setPsyScore(a.psychotestScore != null ? String(a.psychotestScore) : ""); setPsyNotes(a.psychotestNotes || ""); };
  const savePsyResult = async () => {
    if (!psyFor) return;
    const score = psyScore ? Number(psyScore) : null;
    await recordPsychotestResult(psyFor.id, score, psyNotes);
    setPsyFor(null);
  };

  const toggleSelect = (id) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const bulkReject = async () => {
    for (const id of selected) await rejectApplication(id);
    showToast(`${selected.length} kandidat ditolak`, "info");
    setSelected([]);
  };
  const bulkPsychotest = async () => {
    for (const id of selected) await sendPsychotest(id);
    showToast(`${selected.length} kandidat dikirim psikotes`, "success");
    setSelected([]);
  };
  const bulkHire = async () => {
    for (const id of selected) await hireApplicant(id);
    showToast(`${selected.length} kandidat diterima (offer email)`, "success");
    setSelected([]);
  };

  const exportCsv = () => {
    const rows = list.map((a) => [a.name, a.email, a.wa || "", a.tiktok || "", a.ig || "", a.score ?? "", a.status, (a.ai_summary || "").replace(/[\n\r,]+/g, " ").slice(0, 200)]);
    const csv = ["Nama,Email,WA,TikTok,IG,Skor,Status,Ringkasan AI", ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Potensi-Pelamar-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const openNotes = (a) => { setNotesFor(a); setNotesText(a.notes || ""); };
  const saveNotes = async () => { if (notesFor) await saveApplicantNotes(notesFor.id, notesText); setNotesFor(null); showToast("Catatan disimpan", "success"); };

  const [detailFor, setDetailFor] = useState(null);
  const [detailAnalyses, setDetailAnalyses] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = async (a) => {
    setDetailFor(a);
    setDetailAnalyses([]);
    setDetailLoading(true);
    try {
      const token = localStorage.getItem("calendarjet_admin_token") || "";
      const r = await fetch(`/api/cv/${a.id}`, { headers: { authorization: `Bearer ${token}` } });
      if (r.ok) { const j = await r.json(); setDetailAnalyses(j.analyses || []); }
    } catch {}
    setDetailLoading(false);
  };

  const parseJson = (s) => { try { return JSON.parse(s); } catch { return null; } };

  const openCV = (id) => {
    const token = localStorage.getItem("calendarjet_admin_token") || "";
    window.open(`/api/cv/${id}/file`, "_blank");
  };

  const sendWA = async (id) => {
    const link = await getWhatsAppLink(id);
    if (link) window.open(link, "_blank");
    else showToast("Tidak ada nomor WA / server offline", "error");
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, display: "flex", gap: 8, alignItems: "center" }}><Eye size={20} /> Review CV & Pilih Kandidat</h1>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>AI skor CV (40% liveExp + 25% komunikasi + 20% availability + bonus followers). <b>HR yang memutuskan</b> â€” undang, tolak, atau terima kandidat.</p>

      <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
        <button
          onClick={async () => { setSyncing(true); await refreshAll(); setSyncing(false); showToast("Data pelamar disinkronkan dari server", "success"); }}
          disabled={syncing}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--bg-surface)", display: "flex", gap: 6, alignItems: "center", fontWeight: 600 }}
        >
          <RefreshCw size={14} className={syncing ? "spin" : ""} /> {syncing ? "Menyinkronkan…" : "Sinkronkan"}
        </button>
        <div style={{ display: "flex", gap: 6, alignItems: "center", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 8, padding: "6px 10px" }}>
          <Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama/email/handle" style={{ border: "none", outline: "none", background: "transparent" }} />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }}>
          <option value="all">Semua</option>
          <option value="pending">Lamaran Masuk</option>
          <option value="analyzed">CV Dianalisis</option>
          <option value="invited">Diundang Interview</option>
          <option value="booked">Jadwal Terkunci</option>
          <option value="interviewed">Diwawancara</option>
          <option value="test_sent">Psikotes Terkirim</option>
          <option value="tested">Psikotes Selesai</option>
          <option value="hired">Diterima</option>
          <option value="rejected">Ditolak</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }} aria-label="Urutkan kandidat">
          <option value="newest">Terbaru</option>
          <option value="oldest">Terlama</option>
          <option value="score_high">Skor tertinggi</option>
          <option value="score_low">Skor terendah</option>
          <option value="name">Nama A-Z</option>
        </select>
        {selected.length > 0 && (
          <span style={{ display: "flex", gap: 6 }}>
            <button onClick={bulkInvite} style={{ padding: "6px 10px", borderRadius: 8, background: "#a8201a", color: "#fff", fontSize: 12 }}>Undang {selected.length}</button>
            <button onClick={bulkReject} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border-default)", color: "#ef4444", fontSize: 12 }}>Tolak {selected.length}</button>
            {selected.every((id) => (applicants.find((a) => a.id === id)?.status === "interviewed")) && <button onClick={bulkPsychotest} style={{ padding: "6px 10px", borderRadius: 8, background: "#f59e0b", color: "#fff", fontSize: 12 }}>Psikotes {selected.length}</button>}
            {selected.every((id) => (applicants.find((a) => a.id === id)?.status === "tested")) && <button onClick={bulkHire} style={{ padding: "6px 10px", borderRadius: 8, background: "#a8201a", color: "#fff", fontSize: 12 }}>Terima {selected.length}</button>}
          </span>
        )}
        <button onClick={exportCsv} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border-default)", fontSize: 12, marginLeft: "auto" }}>Export CSV</button>
      </div>

      <div style={{ marginTop: 16, background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead style={{ background: "var(--bg-primary)", textAlign: "left" }}>
              <tr>
                <th style={{ padding: "10px 12px", width: 30 }}><input type="checkbox" onChange={(e) => setSelected(e.target.checked ? list.map((a) => a.id) : [])} checked={selected.length === list.length && list.length > 0} /></th>
                <th style={{ padding: "10px 12px" }}>Pelamar</th>
                <th style={{ padding: "10px 12px" }}>Handle</th>
                <th style={{ padding: "10px 12px" }}>Score</th>
                <th style={{ padding: "10px 12px" }}>Status</th>
                <th style={{ padding: "10px 12px" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: "var(--text-secondary)" }}>Belum ada pelamar â€” share apply link</td></tr>}
              {paged.map((a) => (
                <tr key={a.id} style={{ borderTop: "1px solid var(--border-default)" }}>
                  <td style={{ padding: "10px 12px" }}><input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggleSelect(a.id)} /></td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ fontWeight: 600 }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{a.email} Â· {a.wa}</div>
                    <div style={{ fontSize: 12 }}>{a.ai_summary?.slice(0, 80)}</div>
                    {a.notes && <div style={{ fontSize: 11, color: "#a8201a", marginTop: 2 }}>ðŸ“ {a.notes.slice(0, 60)}</div>}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 12 }}>{a.tiktok ? `TT:${a.tiktok}` : ""} {a.ig ? `IG:${a.ig}` : ""}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 700 }}>{a.score ?? "-"}</td>
                  <td style={{ padding: "10px 12px" }}>{badge(a.status, a.score)}</td>
                  <td style={{ padding: "10px 12px", display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button onClick={() => openDetail(a)} title="Detail lengkap" style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid var(--border-default)", background: "#fff", color: "#a8201a", fontWeight: 700 }}><Eye size={14} /></button>
                    <button onClick={() => openCV(a.id)} title="Lihat CV" style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid var(--border-default)", background: "#fff" }}><FileText size={14} /></button>
                    <button onClick={() => sendWA(a.id)} title="WhatsApp" style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid var(--border-default)", background: "#fff", color: "#059669" }}><MessageCircle size={14} /></button>
                    <button onClick={() => openNotes(a)} title="Catatan" style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid var(--border-default)", background: "#fff", color: "#a8201a" }}><StickyNote size={14} /></button>
                    {a.status === "pending" ? (
                      <button onClick={() => analyzeApplicant(a.id)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border-default)", background: "#fff", display: "flex", gap: 6, alignItems: "center" }}><Eye size={14} /> Analisis</button>
                    ) : a.status === "analyzed" ? (
                      <span style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => { inviteToInterview(a.id); }} style={{ padding: "6px 10px", borderRadius: 8, background: "#a8201a", color: "#fff", display: "flex", gap: 6, alignItems: "center" }}><Mail size={14} /> Undang</button>
                        <button onClick={() => { rejectApplication(a.id); }} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border-default)", background: "#fff", color: "#ef4444", display: "flex", gap: 6, alignItems: "center" }}><XCircle size={14} /> Tolak</button>
                      </span>
                    ) : a.status === "invited" ? (
                      <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>Menunggu booking</span>
                    ) : a.status === "booked" ? (
                      <button onClick={() => { markApplicantInterviewed(a.id); }} style={{ padding: "6px 10px", borderRadius: 8, background: "#0d9488", color: "#fff", display: "flex", gap: 6, alignItems: "center" }}><CheckCircle2 size={14} /> Selesai Interview</button>
                    ) : a.status === "interviewed" ? (
                      <button onClick={() => { sendPsychotest(a.id); }} style={{ padding: "6px 10px", borderRadius: 8, background: "#f59e0b", color: "#fff", display: "flex", gap: 6, alignItems: "center" }}><Brain size={14} /> Kirim Psikotes</button>
                    ) : a.status === "test_sent" ? (
                      <span style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => { openPsyResult(a); }} style={{ padding: "6px 10px", borderRadius: 8, background: "#d97706", color: "#fff", display: "flex", gap: 6, alignItems: "center" }}><ClipboardList size={14} /> Catat Hasil</button>
                        <button onClick={() => { sendPsychotest(a.id); }} title="Kirim ulang email" style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid var(--border-default)", background: "#fff" }}><Mail size={14} /></button>
                      </span>
                    ) : a.status === "tested" ? (
                      <span style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => { hireApplicant(a.id); }} style={{ padding: "6px 10px", borderRadius: 8, background: "#a8201a", color: "#fff", display: "flex", gap: 6, alignItems: "center" }}><UserCheck size={14} /> Terima</button>
                        <button onClick={() => { rejectApplication(a.id); }} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border-default)", color: "#ef4444", display: "flex", gap: 6, alignItems: "center" }}><XCircle size={14} /> Tolak</button>
                        <button onClick={() => { openPsyResult(a); }} title="Ubah hasil" style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid var(--border-default)", background: "#fff", color: "#d97706" }}><ClipboardList size={14} /></button>
                      </span>
                    ) : a.status === "hired" ? (
                      <span style={{ fontSize: 12, color: "#a8201a", fontWeight: 600 }}>âœ“ Diterima</span>
                    ) : (
                      <span style={{ fontSize: 12, color: "#ef4444" }}>Ditolak</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.length > PER_PAGE && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", padding: 12, borderTop: "1px solid var(--border-default)" }}>
            <button onClick={() => setPage(Math.max(1, pageSafe - 1))} disabled={pageSafe <= 1} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border-default)", disabled: pageSafe <= 1 }}>Prev</button>
            <span style={{ fontSize: 13 }}>Halaman {pageSafe} dari {totalPages} ({list.length} pelamar)</span>
            <button onClick={() => setPage(Math.min(totalPages, pageSafe + 1))} disabled={pageSafe >= totalPages} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border-default)" }}>Next</button>
          </div>
        )}
      </div>

      {notesFor && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: "var(--bg-surface)", borderRadius: 12, padding: 20, width: 400 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Catatan Interview â€” {notesFor.name}</h3>
            <textarea value={notesText} onChange={(e) => setNotesText(e.target.value)} rows={5} placeholder="Catatan hasil interview / evaluasi..." style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }} />
            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
              <button onClick={() => setNotesFor(null)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }}>Batal</button>
              <button onClick={saveNotes} style={{ padding: "8px 12px", borderRadius: 8, background: "#a8201a", color: "#fff" }}>Simpan</button>
            </div>
          </div>
        </div>
      )}
      {psyFor && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: "var(--bg-surface)", borderRadius: 12, padding: 20, width: 400 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Hasil Psikotes â€” {psyFor.name}</h3>
            <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Skor Psikotes (0-100)</label>
            <input type="number" min="0" max="100" value={psyScore} onChange={(e) => setPsyScore(e.target.value)} placeholder="cth: 80" style={{ width: "100%", marginTop: 4, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }} />
            <label style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 12, display: "block" }}>Catatan</label>
            <textarea value={psyNotes} onChange={(e) => setPsyNotes(e.target.value)} rows={4} placeholder="Evaluasi hasil psikotes..." style={{ width: "100%", marginTop: 4, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }} />
            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
              <button onClick={() => setPsyFor(null)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-default)" }}>Batal</button>
              <button onClick={savePsyResult} style={{ padding: "8px 12px", borderRadius: 8, background: "#d97706", color: "#fff" }}>Simpan Hasil</button>
            </div>
          </div>
        </div>
      )}
      {detailFor && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16 }} onClick={() => setDetailFor(null)}>
          <div style={{ background: "var(--bg-surface)", borderRadius: 12, padding: 24, width: 640, maxWidth: "94vw", maxHeight: "86vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: "1.1rem" }}>{detailFor.name}</h3>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{detailFor.email} · {detailFor.wa || "-"}</div>
                <div style={{ marginTop: 6 }}>{badge(detailFor.status, detailFor.score)}</div>
              </div>
              <button onClick={() => setDetailFor(null)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border-default)" }}>Tutup</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
              <div style={{ padding: 12, background: "var(--bg-secondary)", borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>Handles</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>{detailFor.tiktok ? `TikTok: ${detailFor.tiktok}` : "TikTok: -"}</div>
                <div style={{ fontSize: 13 }}>{detailFor.ig ? `IG: ${detailFor.ig}` : "IG: -"}</div>
              </div>
              <div style={{ padding: 12, background: "var(--bg-secondary)", borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>Ringkasan AI</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>{detailFor.ai_summary || "-"}</div>
              </div>
            </div>

            {detailFor.notes && (
              <div style={{ marginTop: 12, padding: 12, background: "#fdf6f6", borderRadius: 8, border: "1px solid #f0dcdc" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#a8201a", textTransform: "uppercase" }}>Data Form Kandidat / Catatan</div>
                <div style={{ fontSize: 13, whiteSpace: "pre-wrap", marginTop: 4 }}>{detailFor.notes}</div>
              </div>
            )}

            <h4 style={{ fontWeight: 700, marginTop: 18, marginBottom: 8 }}>Riwayat Analisis AI ({detailAnalyses.length})</h4>
            {detailLoading && <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Memuat…</div>}
            {!detailLoading && detailAnalyses.length === 0 && <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Belum ada analisis tersimpan.</div>}
            {detailAnalyses.map((an) => {
              const parsed = parseJson(an.parsed);
              const score = parseJson(an.score) || {};
              return (
                <div key={an.id} style={{ marginTop: 10, padding: 14, border: "1px solid var(--border-default)", borderRadius: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{new Date(an.created_at).toLocaleString("id-ID")} · {an.model}</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>Skor {score.overall ?? "-"}</div>
                  </div>
                  {score.overall != null && (
                    <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap", fontSize: 12 }}>
                      <span>Live: {score.liveExp ?? 0}/40</span>
                      <span>Komunikasi: {score.komunikasi ?? 0}/25</span>
                      <span>Availability: {score.availability ?? 0}/20</span>
                      <span>Followers: {score.followersBonus ?? 0}/15</span>
                      <span style={{ fontWeight: 700, color: an.decision === "verified" ? "#10b981" : an.decision === "review" ? "#f59e0b" : "#ef4444" }}>{an.decision}</span>
                    </div>
                  )}
                  {parsed?.skills?.length > 0 && <div style={{ fontSize: 12, marginTop: 8 }}><b>Skills:</b> {parsed.skills.join(", ")}</div>}
                  {parsed?.experiences?.length > 0 && <div style={{ fontSize: 12, marginTop: 4 }}><b>Pengalaman:</b> {parsed.experiences.join(" · ")}</div>}
                  {(() => { const ms = parseJson(an.missing_skills); return ms?.length > 0 ? <div style={{ fontSize: 12, marginTop: 4, color: "#ef4444" }}><b>Missing:</b> {ms.join(", ")}</div> : null; })()}
                  {(() => { const st = parseJson(an.strengths); return st?.length > 0 ? <div style={{ fontSize: 12, marginTop: 4, color: "#10b981" }}><b>Strengths:</b> {st.join(", ")}</div> : null; })()}
                  {an.ai_summary && <div style={{ fontSize: 12, marginTop: 8, fontStyle: "italic" }}>{an.ai_summary}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
