import React from "react";
import { useParams, Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { SectionHeader } from "../components/ui.jsx";
import UnderConstruction from "../components/layout/UnderConstruction.jsx";
import { NAV } from "../routes.jsx";

export function ArchivePage() {
  return <UnderConstruction emoji="🖼" title="ארכיון ההתגלות"
    description="כל התמונות, הצפנים והממצאים במקום אחד — עם סינון לפי שנה, נושא, תגית, מספר, מלחמות, צפנים, משיח ותורה, מנוע OCR, וחיבור חי לעץ המספרים."
    links={[{ to: "/numbers", label: "עץ המספרים" }, { to: "/code", label: "הצופן התנ\"כי" }]} />;
}

export function MembersPage() {
  return <UnderConstruction emoji="👑" title="בני ההיכל"
    description="אזור המנויים: שיעורים מלאים, קורסים, מפות רמזים, העץ המתקדם, צפנים בלעדיים, חיפושים מורחבים וגישה מוקדמת לתכנים."
    links={[{ to: "/beit-midrash", label: "בית המדרש" }, { to: "/start", label: "כאן מתחילים" }]} />;
}

const COMMUNITY = [
  { emoji: "💬", title: "הצ'אט הוותיק", to: "/community/chat", live: true },
  { emoji: "🧮", title: "המחשבון הקהילתי", to: "/community/calculator", live: false },
  { emoji: "📝", title: "כל התגובות באתר", to: "/community/comments", live: false },
  { emoji: "✉️", title: "צור קשר", to: "/contact", live: true },
];

export function CommunityPage() {
  return (
    <div style={{ direction: "rtl", maxWidth: 980, margin: "0 auto", padding: "64px 24px 96px", position: "relative", zIndex: 1 }}>
      <SectionHeader eyebrow="מרכז הפעילות" title="💬 קהילה" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
        {COMMUNITY.map(c => (
          <Link key={c.to} to={c.to} style={{
            textDecoration: "none", background: C.surface2, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: "24px 22px", position: "relative",
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{c.emoji}</div>
            <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 18, fontWeight: 700 }}>{c.title}</div>
            <div style={{
              marginTop: 8, fontSize: 10, letterSpacing: 1, fontFamily: F.heading,
              color: c.live ? "#4fc78c" : C.muted,
            }}>{c.live ? "● פעיל" : "🚧 בבנייה"}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function CommunityCalculatorPage() {
  return <UnderConstruction emoji="🧮" title="המחשבון הקהילתי"
    description="מחשבון גימטריה ויראלי שמאפשר לקהילה להזין מילים ולגלות קשרים מהמאגר."
    links={[{ to: "/community", label: "קהילה" }, { to: "/numbers", label: "עץ המספרים" }]} />;
}

export function CommunityCommentsPage() {
  return <UnderConstruction emoji="📝" title="כל התגובות באתר"
    description="מרכז אחד לכל התגובות והדיונים מכל הפוסטים באתר."
    links={[{ to: "/community", label: "קהילה" }, { to: "/post", label: "פוסטים" }]} />;
}

const METHODS = NAV.find(i => i.to === "/beit-midrash")?.children || [];

export function BeitMidrashPage() {
  return (
    <div style={{ direction: "rtl", maxWidth: 980, margin: "0 auto", padding: "64px 24px 96px", position: "relative", zIndex: 1 }}>
      <SectionHeader eyebrow="כמו אוניברסיטה" title="📚 בית המדרש" />
      <p style={{ color: C.goldDim, fontFamily: F.body, fontSize: 16, lineHeight: 2, textAlign: "center", maxWidth: 600, margin: "-24px auto 44px" }}>
        כל שיטה תכלול הסבר, דוגמאות, מחשבון אינטראקטיבי, שאלות נפוצות, קישור לרמזים אמיתיים ותוכן מתקדם למנויים.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
        {METHODS.map(m => (
          <Link key={m.to} to={m.to} style={{
            textDecoration: "none", background: C.surface2, border: `1px solid ${C.border}`,
            borderInlineStart: `3px solid ${C.gold}`, borderRadius: 10, padding: "18px 20px",
            color: C.goldLight, fontFamily: F.royal, fontSize: 16, fontWeight: 700,
          }}>{m.label}</Link>
        ))}
      </div>
    </div>
  );
}

export function MethodPage() {
  const { method } = useParams();
  const found = METHODS.find(m => m.to === `/beit-midrash/${method}`);
  return <UnderConstruction emoji="📚" title={found ? `בית המדרש · ${found.label}` : "בית המדרש"}
    description="הסבר השיטה, דוגמאות, מחשבון אינטראקטיבי, שאלות נפוצות וקישור לרמזים אמיתיים — בקרוב."
    links={[{ to: "/beit-midrash", label: "כל השיטות" }, { to: "/numbers", label: "עץ המספרים" }]} />;
}
