import React, { useState } from "react";
import { useBooking } from "../../context/BookingContext";
import { History, X } from "lucide-react";

export const ToastLogPanel = () => {
  const { toastHistory } = useBooking();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} title="Riwayat aktivitas" aria-label="Buka riwayat aktivitas" style={{ position: "fixed", bottom: 16, left: 16, zIndex: 997, width: 40, height: 40, borderRadius: "50%", border: "1px solid var(--border-default)", background: "var(--bg-surface)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,0.15)" }}>
        <History size={16} />
      </button>
      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2001, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,23,42,0.5)" }} onClick={() => setOpen(false)}>
          <div style={{ background: "var(--bg-surface)", borderRadius: 12, padding: 20, width: 420, maxWidth: "92vw", maxHeight: "70vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontWeight: 700, fontSize: "1rem" }}>Riwayat Aktivitas</h3>
              <button onClick={() => setOpen(false)} style={{ border: "none", background: "transparent", cursor: "pointer" }}><X size={16} /></button>
            </div>
            {toastHistory.length === 0 && <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>Belum ada aktivitas tercatat.</div>}
            <div style={{ display: "grid", gap: 8 }}>
              {toastHistory.map((t) => (
                <div key={t.id} style={{ padding: "8px 10px", border: "1px solid var(--border-default)", borderRadius: 8, fontSize: 12 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.type === "error" ? "#ef4444" : t.type === "warning" ? "#f59e0b" : t.type === "info" ? "#6366f1" : "#10b981" }} />
                    <span style={{ fontWeight: 600 }}>{t.message}</span>
                  </div>
                  <div style={{ color: "var(--text-secondary)", marginTop: 2 }}>{new Date(t.at).toLocaleString("id-ID")}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};