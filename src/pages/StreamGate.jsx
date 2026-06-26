import React from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { STREAMS, setStream } from "../lib/stream.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { F, LOGO_URL } from "../theme.js";

// ===== שער הבחירה — «בחר את הדרך» (/stream) =====
// מגודר לאדמין כרגע (closed to public). מבקר רגיל שמגיע לכאן → מופנה לבית-המלוכה.
// בעתיד ייפתח לציבור כשער כניסה אוטומטי למבקר חדש.

function Door({ s, onPick }) {
  const meta = STREAMS[s];
  const reality = s === "reality";
  const a = meta.accent;
  return (
    <button onClick={() => onPick(s)} style={{
      flex: "1 1 280px", maxWidth: 340, minHeight: 320, cursor: "pointer",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14,
      padding: "40px 26px", borderRadius: 22,
      background: reality ? "rgba(127,200,255,0.06)" : "rgba(232,200,74,0.06)",
      border: `1.5px solid ${a}55`, color: "#f2efe6",
      transition: "transform .2s, box-shadow .2s, border-color .2s",
      boxShadow: `0 0 0 rgba(0,0,0,0)`,
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = `0 18px 50px ${a}33`; e.currentTarget.style.borderColor = a; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = `${a}55`; }}>
      <div style={{ fontSize: 60, filter: `drop-shadow(0 0 22px ${a}66)` }}>{meta.emoji}</div>
      <div style={{ fontFamily: F.regal, fontSize: 28, fontWeight: 900, color: reality ? "#eaf2fa" : "#f6e27a" }}>{meta.label}</div>
      <div style={{ fontSize: 14, color: reality ? "#9fb4c6" : "#cbb25e", lineHeight: 1.7, maxWidth: 240 }}>{meta.tagline}</div>
      <div style={{ marginTop: 8, fontFamily: F.heading, fontSize: 12.5, letterSpacing: 2, color: a, textTransform: "uppercase" }}>היכנס ←</div>
    </button>
  );
}

export default function StreamGate() {
  const { profile, loading } = useAuth();
  const nav = useNavigate();
  const isAdmin = profile?.role === "admin";

  if (loading) return <div style={{ position: "fixed", inset: 0, background: "#05060A" }} />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const pick = (key) => { setStream(key); nav(STREAMS[key].home); };

  return (
    <div style={{ direction: "rtl", minHeight: "100vh", background: "radial-gradient(ellipse at top, #161022, #05060a 70%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 18px" }}>
      <img src={LOGO_URL} alt="SOD1820" style={{ width: 56, marginBottom: 10, filter: "drop-shadow(0 0 18px rgba(232,200,74,0.5))" }} />
      <div style={{ fontFamily: F.heading, fontSize: 12, letterSpacing: 4, color: "#9b8a55", textTransform: "uppercase", marginBottom: 6 }}>SOD1820 · עדשת תצוגה (אדמין)</div>
      <h1 style={{ fontFamily: F.regal, fontSize: "clamp(28px,6vw,44px)", fontWeight: 900, color: "#f2efe6", margin: "0 0 30px", textAlign: "center" }}>בחר את הדרך שלך</h1>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 22, justifyContent: "center", width: "100%", maxWidth: 760 }}>
        <Door s="kingdom" onPick={pick} />
        <Door s="reality" onPick={pick} />
      </div>
      <div style={{ marginTop: 26, fontSize: 12.5, color: "#6b6450" }}>אותו עץ · אותה אמת · שתי עדשות</div>
    </div>
  );
}
