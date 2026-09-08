import React from "react";
import { Link, useLocation } from "react-router-dom";
import { F } from "../theme.js";
import { controlTone, usePalette } from "../lib/palette.js";

// טאבים עליונים לשערי החיפוש — מנוע אחד, מעבר קל בין מצבים.
// צבעים = semantic control roles; הטאב אינו מחזיק פלטה משלו.
const TABS = [
  { to: "/number", e: "🔢", l: "כללי" },
  { to: "/name", e: "👤", l: "שם" },
  { to: "/beit-midrash?tab=calc", e: "🧮", l: "מחשבון גימטריה" },
  { to: "/image", e: "📷", l: "תמונה", soon: true },
];

export default function SearchTabs() {
  const P = usePalette();
  const { pathname } = useLocation();
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 26 }}>
      {TABS.map(t => {
        const active = pathname === t.to || (t.to === "/name" && pathname === "/שם");
        const tone = controlTone(P, t.soon ? "disabled" : active ? "primary" : "secondary");
        const inner = <>{t.e} {t.l}{t.soon ? " · בקרוב" : ""}</>;
        const style = {
          display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none",
          cursor: t.soon ? "default" : "pointer",
          background: tone.background, color: tone.color,
          border: `1px solid ${tone.border}`, borderRadius: 999,
          fontFamily: F.ui, fontSize: 14, fontWeight: 800, padding: "8px 17px", minHeight: 40,
          opacity: t.soon ? 0.82 : 1,
        };
        return t.soon
          ? <span key={t.to} style={style} title="בקרוב — חיפוש מתוך תמונה">{inner}</span>
          : <Link key={t.to} to={t.to} style={style}>{inner}</Link>;
      })}
    </div>
  );
}
