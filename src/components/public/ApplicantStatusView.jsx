import React, { useEffect, useState } from "react";
import { useBooking } from "../../context/BookingContext";
import { CheckCircle2, Clock, XCircle, UserCheck, Calendar, RefreshCw, Trash2, Brain } from "lucide-react";

const STEPS = [
  { id: "pending", label: "Lamaran Diterima", icon: CheckCircle2 },
  { id: "analyzed", label: "CV Dianalisis", icon: Clock },
  { id: "invited", label: "Diundang Interview", icon: Calendar },
  { id: "booked", label: "Jadwal Terkunci", icon: Calendar },
  { id: "interviewed", label: "Diwawancara", icon: UserCheck },
  { id: "tested", label: "Psikotes", icon: Brain },
  { id: "hired", label: "Diterima", icon: CheckCircle2 },
];

export const ApplicantStatusView = ({ token }) => {
  const { applicants, d1Bookings } = useBooking();
  const [status, setStatus] = useState("pending");
  const [name, setName] = useState("");
  const [booking, setBooking] = useState(null);
  const [reschedule, setReschedule] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    try {
      const payload = JSON.parse(atob(token.split(".")[0]));
      const app = applicants.find((a) => a.id === payload.applicantId);
      if (app) { setStatus(app.status); setName(app.name); }
      const b = d1Bookings.find((x) => x.applicant_id === payload.applicantId);
      if (b) setBooking(b);
    } catch {}
  }, [token, applicants, d1Bookings]);

  const doReschedule = async () => {
    if (!booking || !newDate || !newTime) return setMsg("Pilih tanggal & jam baru");
    try {
      const r = await fetch(`/api/bookings/${booking.id}/reschedule`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, date: newDate, time: newTime }),
      });
      const j = await r.json();
      if (r.ok) { setMsg("Jadwal diubah"); setReschedule(false); setBooking({ ...booking, date: newDate, time: newTime }); }
      else setMsg(j.error || "Gagal ubah jadwal");
    } catch { setMsg("Gagal ubah jadwal"); }
  };

  const doCancel = async () => {
    if (!booking) return;
    if (!window.confirm("Batalkan jadwal interview ini?")) return;
    try {
      const r = await fetch(`/api/bookings/${booking.id}/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (r.ok) { setMsg("Jadwal dibatalkan"); setStatus("invited"); setBooking(null); }
      else setMsg("Gagal batalkan");
    } catch { setMsg("Gagal batalkan"); }
  };

  const effectiveStatus = status === "test_sent" ? "tested" : status;
  const idx = STEPS.findIndex((s) => s.id === effectiveStatus);
  const currentIdx = idx === -1 ? 0 : idx;

  return (
    <div style={{ maxWidth: 560, margin: "3rem auto", padding: 24, background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 16 }}>
      <h2 style={{ fontSize: "1.3rem", fontWeight: 800 }}>Status Lamaran {name && `— ${name}`}</h2>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>Pantau progres lamaran Anda di Potensi Creative.</p>

      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 0 }}>
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i <= currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div key={s.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: done ? "#10b981" : "var(--bg-secondary)", color: done ? "#fff" : "var(--text-muted)" }}>
                  <Icon size={14} />
                </div>
                {i < STEPS.length - 1 && <div style={{ width: 2, height: 28, background: done && i < currentIdx ? "#10b981" : "var(--border-default)" }} />}
              </div>
              <div style={{ paddingTop: 4 }}>
                <div style={{ fontWeight: isCurrent ? 700 : 500, color: done ? "var(--text-primary)" : "var(--text-muted)" }}>{s.label}</div>
                {isCurrent && <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Status saat ini</div>}
              </div>
            </div>
          );
        })}
      </div>

      {booking && status === "booked" && (
        <div style={{ marginTop: 20, padding: 14, background: "var(--bg-secondary)", border: "1px solid var(--border-default)", borderRadius: 8 }}>
          <div style={{ fontWeight: 600 }}>Jadwal Interview Anda</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>{booking.date} · {booking.time} WIB</div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button onClick={() => setReschedule(!reschedule)} style={{ padding: "8px 12px", borderRadius: 8, background: "#4F46E5", color: "#fff", display: "flex", gap: 6, alignItems: "center" }}><RefreshCw size={14} /> Ubah Jadwal</button>
            <button onClick={doCancel} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-default)", color: "#ef4444", display: "flex", gap: 6, alignItems: "center" }}><Trash2 size={14} /> Batalkan</button>
          </div>
          {reschedule && (
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-default)" }} />
              <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-default)" }} />
              <button onClick={doReschedule} style={{ padding: "8px 12px", borderRadius: 8, background: "#0d9488", color: "#fff" }}>Simpan</button>
            </div>
          )}
        </div>
      )}

      {msg && <div style={{ marginTop: 12, padding: 10, background: "var(--bg-secondary)", borderRadius: 8, fontSize: 13 }}>{msg}</div>}

      {status === "rejected" && <div style={{ marginTop: 20, padding: 12, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#b91c1c", fontSize: 13 }}>Maaf, lamaran Anda belum sesuai kriteria saat ini. Terima kasih telah melamar.</div>}
      {status === "hired" && <div style={{ marginTop: 20, padding: 12, background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 8, color: "#6d28d9", fontSize: 13 }}>Selamat! Anda diterima sebagai Live Streamer di Potensi Creative. Tim HR akan menghubungi Anda.</div>}
    </div>
  );
};

