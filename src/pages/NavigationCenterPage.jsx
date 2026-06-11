import React from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { SectionHeader } from "../components/ui.jsx";

const SYSTEMS = [
  { emoji: "🚀", title: "כאן מתחילים", to: "/start", desc: "המדריך למתחילים — מה זה ואיך משתמשים." },
  { emoji: "🛤", title: "ציר ההתגלות", to: "/timeline", desc: "ציר הזמן של אירועי הגאולה — מחובר לפוסטים ולגלריות." },
  { emoji: "🌳", title: "עץ המספרים", to: "/numbers", desc: "מפת הקשרים התלת-מימדית בין המספרים." },
  { emoji: "📖", title: "פוסטים", to: "/post", desc: "כל התיעודים, החיפושים והגימטריות." },
  { emoji: "🖼", title: "ארכיון ההתגלות", to: "/archive", desc: "התמונות, הצפנים והממצאים במקום אחד." },
  { emoji: "🔍", title: "הצופן התנ\"כי", to: "/code", desc: "דילוגי אותיות בטקסט התורה." },
  { emoji: "📚", title: "בית המדרש", to: "/beit-midrash", desc: "לימוד שיטות הגימטריה — כמו אוניברסיטה." },
  { emoji: "💬", title: "קהילה", to: "/community", desc: "צ'אט, תגובות, מחשבון ופעילות חיה." },
  { emoji: "👑", title: "בני ההיכל", to: "/members", desc: "אזור המנויים — תכנים בלעדיים." },
];

export default function NavigationCenterPage() {
  return (
    <div style={{ direction: "rtl", maxWidth: 1040, margin: "0 auto", padding: "64px 24px 96px", position: "relative", zIndex: 1 }}>
      <SectionHeader eyebrow="מפת האתר החיה" title="🏛 מרכז הניווט" />
      <p style={{ color: C.goldDim, fontFamily: F.body, fontSize: 16, lineHeight: 2, textAlign: "center", maxWidth: 600, margin: "-24px auto 48px" }}>
        כל המערכות של SOD1820 במקום אחד. בחר לאן להמשיך.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {SYSTEMS.map(s => (
          <Link key={s.to} to={s.to} style={{
            textDecoration: "none", background: `linear-gradient(160deg, ${C.surface2}, ${C.bg})`,
            border: `1px solid ${C.border}`, borderTop: `2px solid ${C.borderGold}`,
            borderRadius: 12, padding: "26px 24px", transition: "transform 0.2s, border-color 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = C.gold; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = C.border; }}
          >
            <div style={{ fontSize: 38, marginBottom: 14 }}>{s.emoji}</div>
            <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 21, fontWeight: 700, marginBottom: 8 }}>{s.title}</div>
            <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 14, lineHeight: 1.8 }}>{s.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
