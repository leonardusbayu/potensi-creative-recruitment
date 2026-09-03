import React, { useEffect, useState } from "react";
import { subscribeApiStatus } from "../../utils/apiStatus";
import { WifiOff, AlertCircle, X } from "lucide-react";

export const ApiStatusBanner = () => {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const unsub = subscribeApiStatus((s) => {
      setStatus(s);
      setTimeout(() => setStatus((cur) => (cur === s ? null : cur)), 8000);
    });
    return unsub;
  }, []);

  if (!status) return null;

  const bg = status.kind === "auth" ? "#fff7ed" : status.kind === "server" ? "#fef2f2" : "#eff6ff";
  const border = status.kind === "auth" ? "#fdba74" : status.kind === "server" ? "#fca5a5" : "#93c5fd";
  const color = status.kind === "auth" ? "#c2410c" : status.kind === "server" ? "#b91c1c" : "#1d4ed8";

  return (
    <div role="alert" style={{ position: "fixed", top: 8, left: "50%", transform: "translateX(-50%)", zIndex: 2000, display: "flex", gap: 10, alignItems: "center", padding: "10px 16px", background: bg, border: `1px solid ${border}`, borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", maxWidth: "92vw" }}>
      <span style={{ color, display: "flex" }}>{status.kind === "network" ? <WifiOff size={16} /> : <AlertCircle size={16} />}</span>
      <span style={{ fontSize: 13, color, fontWeight: 600 }}>{status.message}</span>
      <button onClick={() => setStatus(null)} style={{ border: "none", background: "transparent", cursor: "pointer", color, padding: 2 }} title="Tutup"><X size={14} /></button>
    </div>
  );
};