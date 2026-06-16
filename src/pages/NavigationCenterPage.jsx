import React from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { SectionHeader } from "../components/ui.jsx";

// מרכז הניווט — מאורגן לפי מודל "העץ האחד": שורש → מנוע (הלב) → עדשות → תוכן וקהילה.
// כל שכבה היא רובד אחר באותו גרף ידע, לא רשימה שטוחה.
const TIERS = [
  {
    key: "root", icon: "🌱", title: "ההתחלה", tag: "השורש",
    desc: "מאיפה נכנסים — וההבנה הבסיסית.",
    items: [
      { emoji: "🚀", title: "כאן מתחילים", to: "/start", desc: "המדריך בשתי דקות — מה זה ואיך מנווטים." },
      { emoji: "🏠", title: "מהו סוד 1820", to: "/", desc: "עמוד הבית — הסוד שמאחורי המספר." },
    ],
  },
  {
    key: "engine", icon: "🫀", title: "המנוע", tag: "הלב",
    desc: "כאן חיים המספרים — חישוב, התכנסות והצלבה.",
    items: [
      { emoji: "🧮", title: "מנוע הגימטריה", to: "/beit-midrash?tab=calc", desc: "8 שיטות + מנועי עומק. חינם לכולם.", badge: "חינם" },
      { emoji: "🧬", title: "דף המספר + מד התכנסות", to: "/number/1820", desc: "DNA לכל מספר — כמה שכבות מתכנסות אליו (0-100)." },
      { emoji: "⟡", title: "הצלבת שיטות", to: "/cross", desc: "כל הביטויים המאומתים שנופלים על מספר, בכל השיטות." },
      { emoji: "🌳", title: "עץ המספרים", to: "/numbers", desc: "מפת הקשרים התלת-מימדית בין המספרים." },
    ],
  },
  {
    key: "lenses", icon: "🔭", title: "עדשות על הגרף", tag: "הענפים",
    desc: "אותו גרף — נצפה מזוויות שונות.",
    items: [
      { emoji: "🛤", title: "ציר ההתגלות", to: "/timeline", desc: "ציר הזמן של אירועי הגאולה — אירוע ↔ פוסט ↔ תמונות." },
      { emoji: "🖼", title: "ארכיון ההתגלות", to: "/archive", desc: "התמונות, הצפנים והממצאים במקום אחד." },
      { emoji: "🔍", title: "הצופן התנ\"כי", to: "/code", desc: "דילוגי אותיות בטקסט התורה — עדות, לא ניבוי." },
      { emoji: "📚", title: "בית המדרש", to: "/beit-midrash", desc: "ללמוד את שיטות הגימטריה לעומק — כמו אוניברסיטה." },
    ],
  },
  {
    key: "content", icon: "📚", title: "תוכן וקהילה", tag: "העלים",
    desc: "התיעודים, האנשים והשער הפנימי.",
    items: [
      { emoji: "📖", title: "מאגר הפוסטים", to: "/post", desc: "מאות תיעודים מקושרים ברשת אחת — חיפוש וגימטריה." },
      { emoji: "✅", title: "פוסטים מאומתים", to: "/verified", desc: "פוסטים שהמערכת אימתה — חישובים ותאריכים שנבדקו." },
      { emoji: "💬", title: "קהילה", to: "/community", desc: "צ'אט, תגובות, מחשבון ופעילות חיה." },
      { emoji: "👑", title: "בני ההיכל", to: "/members", desc: "אזור המנויים — תכנים וכלים בלעדיים." },
    ],
  },
];

function Card({ s }) {
  return (
    <Link to={s.to} style={{
      textDecoration: "none", background: `linear-gradient(160deg, ${C.surface2}, ${C.bg})`,
      border: `1px solid ${C.border}`, borderTop: `2px solid ${C.borderGold}`,
      borderRadius: 12, padding: "20px 20px", transition: "transform 0.2s, border-color 0.2s",
      display: "block",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = C.gold; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = C.border; }}
    >
      <div style={{ fontSize: 32, marginBottom: 10 }}>{s.emoji}</div>
      <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 19, fontWeight: 700, marginBottom: 6 }}>
        {s.title}
        {s.badge && <span style={{
          display: "inline-block", marginInlineStart: 8, verticalAlign: "middle",
          background: C.goldDark, color: C.goldBright, border: `1px solid ${C.borderGold}`,
          borderRadius: 999, padding: "1px 9px", fontFamily: F.heading, fontSize: 10, fontWeight: 700,
        }}>{s.badge}</span>}
      </div>
      <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.75 }}>{s.desc}</div>
    </Link>
  );
}

export default function NavigationCenterPage() {
  return (
    <div style={{ direction: "rtl", maxWidth: 1080, margin: "0 auto", padding: "64px 24px 96px", position: "relative", zIndex: 1 }}>
      <SectionHeader eyebrow="מפת האתר החיה" title="🏛 מרכז הניווט" />
      <p style={{ color: C.goldDim, fontFamily: F.body, fontSize: 16, lineHeight: 2, textAlign: "center", maxWidth: 640, margin: "-24px auto 44px" }}>
        כל האתר הוא <span style={{ color: C.goldBright }}>גרף ידע אחד</span>. מהשורש אל הלב, מהלב אל העדשות, ומהן אל התוכן —
        כל שכבה מובילה לבאה אחריה.
      </p>

      {TIERS.map((tier, ti) => (
        <section key={tier.key} style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16, paddingInlineStart: 2 }}>
            <span style={{ fontSize: 24 }}>{tier.icon}</span>
            <h2 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 23, fontWeight: 700, margin: 0 }}>{tier.title}</h2>
            <span style={{ color: C.goldDeep, fontFamily: F.heading, fontSize: 12, letterSpacing: 2, border: `1px solid ${C.border}`, borderRadius: 999, padding: "2px 10px" }}>{tier.tag}</span>
            <span style={{ color: C.muted, fontFamily: F.body, fontSize: 13.5, marginInlineStart: "auto" }}>{tier.desc}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
            {tier.items.map(s => <Card key={s.to + s.title} s={s} />)}
          </div>
          {ti < TIERS.length - 1 && (
            <div style={{ textAlign: "center", color: C.border, fontSize: 18, marginTop: 26 }}>↓</div>
          )}
        </section>
      ))}
    </div>
  );
}
