import React from "react";
import { useNavigate } from "react-router-dom";
import { useStream, setStream, STREAMS } from "../lib/stream.js";
import { useAuth } from "../lib/AuthContext.jsx";

// ===== מתג הזרם — chip מגודר לאדמין בלבד (closed to public) =====
// מציג את העדשה הנוכחית ומחליף לשנייה (מנווט לבית שלה). לתצוגה/בדיקה בזמן גלישה.
// השער המלא: /stream. הציבור לא רואה את זה כלל.

export default function StreamSwitch() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const s = useStream() || "kingdom";
  const nav = useNavigate();
  if (!isAdmin) return null;

  const other = s === "reality" ? "kingdom" : "reality";
  const cur = STREAMS[s];
  const next = STREAMS[other];

  return (
    <button
      onClick={() => { setStream(other); nav(next.home); }}
      title={`עדשה: ${cur.label} ← לחיצה: מעבר ל${next.label} (אדמין)`}
      aria-label="החלפת עדשת תצוגה"
      style={{
        display: "inline-flex", alignItems: "center", gap: 3,
        height: 38, padding: "0 10px", borderRadius: 999, cursor: "pointer",
        background: "rgba(127,200,255,0.08)", border: `1px solid ${next.accent}66`,
        color: cur.accent, fontSize: 14, lineHeight: 1, whiteSpace: "nowrap",
        transition: "border-color .2s, transform .15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.borderColor = next.accent; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = `${next.accent}66`; }}
    >
      <span>{cur.emoji}</span>
      <span style={{ opacity: 0.6, fontSize: 11 }}>⇄</span>
      <span style={{ opacity: 0.5 }}>{next.emoji}</span>
    </button>
  );
}
