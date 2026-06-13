import React from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";

// עמוד "סגור · בקרוב" — לדפים שטרם נפתחו. כל מי שמפנה לכאן רואה שזה סגור.
export default function ClosedPage({ title = "הדף", icon = "🔒", note }) {
  return (
    <div style={{ direction: "rtl", maxWidth: 620, margin: "0 auto", padding: "90px 24px", textAlign: "center", position: "relative", zIndex: 1 }}>
      <div style={{ fontSize: 44, marginBottom: 14 }}>{icon}</div>
      <h1 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(26px,5vw,40px)", fontWeight: 700, margin: "0 0 14px" }}>
        {title}
      </h1>
      <div style={{ display: "inline-block", margin: "0 auto 20px", padding: "8px 20px", borderRadius: 999, border: `1px solid ${C.borderGold}`, background: "rgba(212,175,55,0.08)", color: C.goldBright, fontFamily: F.heading, fontSize: 14, fontWeight: 700 }}>
        🔒 סגור · בהקמה
      </div>
      <p style={{ color: C.muted, fontFamily: F.body, fontSize: 16, lineHeight: 2, maxWidth: 440, margin: "0 auto 28px" }}>
        {note || "המדור הזה עדיין בבנייה וייפתח בקרוב. תודה על הסבלנות 🙏"}
      </p>
      <Link to="/" style={{ display: "inline-block", padding: "12px 26px", borderRadius: 10, textDecoration: "none", background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: "#1a0e00", fontFamily: F.heading, fontSize: 15, fontWeight: 800 }}>
        ← חזרה לדף הבית
      </Link>
    </div>
  );
}
