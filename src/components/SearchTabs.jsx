import React from "react";
import { Link, useLocation } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";

// טאבים עליונים לשערי החיפוש — מנוע אחד, מעבר קל בין מצבים.
// 🔢 כללי (/number) · 👤 שם (/name, ויראלי) · 📷 תמונה (בקרוב).
const TABS = [
  { to: "/number", e: "🔢", l: "כללי" },
  { to: "/name", e: "👤", l: "שם" },
  { to: "/beit-midrash?tab=calc", e: "🧮", l: "מחשבון" },
  { to: "/image", e: "📷", l: "תמונה", soon: true },
];

export default function SearchTabs() {
  const P = usePalette();
  const { pathname } = useLocation();
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 26 }}>
      {TABS.map(t => {
        const active = pathname === t.to || (t.to === "/name" && pathname === "/שם");
        const inner = <>{t.e} {t.l}{t.soon ? " · בקרוב" : ""}</>;
        const style = {
          display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none",
          cursor: t.soon ? "default" : "pointer", opacity: t.soon ? 0.5 : 1,
          background: active ? P.accentBtn : P.card, color: active ? P.onAccent : P.accentText,
          border: `1px solid ${active ? "transparent" : P.border}`, borderRadius: 999,
          fontFamily: F.heading, fontSize: 14, fontWeight: 800, padding: "8px 17px",
        };
        return t.soon
          ? <span key={t.to} style={style} title="בקרוב — חיפוש מתוך תמונה">{inner}</span>
          : <Link key={t.to} to={t.to} style={style}>{inner}</Link>;
      })}
    </div>
  );
}
