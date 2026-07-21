import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { SectionHeader } from "../components/ui.jsx";
import { getSiteCounts, fmtCount } from "../lib/siteStats.js";

// מרכז הניווט — מאורגן לפי מודל "העץ האחד": שורש → מנוע (הלב) → עדשות → תוכן וקהילה.
// כל שכבה היא רובד אחר באותו גרף ידע, לא רשימה שטוחה. countKey = מונה-חי מ-site_counts.
const TIERS = [
  {
    key: "root", icon: "🌱", title: "ההתחלה", tag: "השורש",
    desc: "מאיפה נכנסים — וההבנה הבסיסית.",
    items: [
      { emoji: "🚀", title: "כאן מתחילים", to: "/start", desc: "המדריך בשתי דקות — מה זה ואיך מנווטים." },
      { emoji: "📖", title: "מהו סוד 1820", to: "/סוד-1820", desc: "הפוסט המסביר — 1820 פעם שם ה' בתורה." },
    ],
  },
  {
    key: "engine", icon: "🫀", title: "המנוע", tag: "הלב",
    desc: "כאן חיים המספרים — חישוב, התכנסות והצלבה.",
    items: [
      { emoji: "🏛️", title: "היכל", to: "/research", desc: "סביבת המחקר — כל הכלים במקום אחד: מחשבון, דף-מספר, חיפוש-פסוקים, דילוגים ובית-המדרש.", badge: "חדש" },
      { emoji: "🧮", title: "מחשבון הגימטריה", to: "/research?tool=gematria", desc: "20 שיטות + מנועי עומק. חינם לכולם.", badge: "חינם", countKey: "words", countLabel: "ביטויים" },
      { emoji: "🧬", title: "דף המספר + מד התכנסות", to: "/number/1820", desc: "DNA לכל מספר — כמה שכבות מתכנסות אליו (0-100)." },
      { emoji: "⟡", title: "הצלבת שיטות", to: "/cross", desc: "כל הביטויים המאומתים שנופלים על מספר, בכל השיטות." },
      { emoji: "🌳", title: "עץ ההתכנסויות", to: "/numbers", desc: "מפת הקשרים התלת-מימדית בין המספרים.", countKey: "convergences", countLabel: "התכנסויות" },
    ],
  },
  {
    key: "lenses", icon: "🔭", title: "עדשות על הגרף", tag: "הענפים",
    desc: "אותו גרף — נצפה מזוויות שונות.",
    items: [
      { emoji: "📡", title: "מרכז השידורים", to: "/broadcasts", desc: "כל הפעילות החיה במקום אחד — פורום (חידושי גולשים), ערוצים, עדכוני האתר וחדשות הבנייה. כל זרם כטאב.", badge: "חדש" },
      { emoji: "🛤", title: "ציר ההתגלות", to: "/timeline", desc: "ציר הזמן של אירועי הגאולה — אירוע ↔ פוסט ↔ תמונות." },
      { emoji: "🖼", title: "ארכיון ההתגלות", to: "/archive", desc: "התמונות, הצפנים והממצאים במקום אחד." },
      { emoji: "📜", title: "חיפוש בפסוקים", to: "/research?tool=verse", desc: "מצאו ביטוי או ערך גימטרי בכל התנ\"ך — 24 ספרים, 23,204 פסוקים.", badge: "חדש" },
      { emoji: "🔍", title: "הצופן התנ\"כי (דילוגים)", to: "/code", desc: "דילוגי אותיות + מובהקות סטטיסטית — עדות, לא ניבוי.", countKey: "ciphers", countLabel: "צפנים" },
      { emoji: "📚", title: "בית המדרש", to: "/research?tool=midrash", desc: "ללמוד את שיטות הגימטריה לעומק — בתוך היכל הגילוי.", countKey: "insights", countLabel: "חידושים" },
    ],
  },
  {
    key: "content", icon: "📚", title: "תוכן וקהילה", tag: "העלים",
    desc: "התיעודים, האנשים והשער הפנימי.",
    items: [
      { emoji: "📖", title: "מאגר הפוסטים", to: "/post", desc: "מאות תיעודים מקושרים ברשת אחת — חיפוש וגימטריה.", countKey: "posts", countLabel: "פוסטים" },
      { emoji: "✅", title: "פוסטים מאומתים", to: "/verified", desc: "פוסטים שהמערכת אימתה — חישובים ותאריכים שנבדקו." },
      { emoji: "🌐", title: "פורום המחקר", to: "/forum", desc: "חידושי הגולשים, השערות, תצפיות ומקורות — שתפו חידוש והצטרפו." },
      { emoji: "💬", title: "קהילה", to: "/community", desc: "צ'אט, תגובות, מחשבון ופעילות חיה." },
      { emoji: "👑", title: "בני ההיכל", to: "/members", desc: "אזור המנויים — תכנים וכלים בלעדיים." },
    ],
  },
];

function Card({ s, counts }) {
  const P = usePalette();
  const n = s.countKey ? counts?.[s.countKey] : null;
  return (
    <Link to={s.to} style={{
      textDecoration: "none", background: P.cardGrad,
      border: `1px solid ${P.border}`, borderTop: `2px solid ${P.borderStrong}`,
      borderRadius: 12, padding: "20px 20px", transition: "transform 0.2s, border-color 0.2s",
      display: "block", position: "relative",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = P.accent; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = P.border; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>{s.emoji}</div>
        {typeof n === "number" && (
          <div style={{ textAlign: "center", lineHeight: 1.1 }}>
            <div style={{ color: P.accentText, fontFamily: F.mono, fontSize: 19, fontWeight: 800 }}>{fmtCount(n)}</div>
            {s.countLabel && <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 9.5, fontWeight: 700 }}>{s.countLabel}</div>}
          </div>
        )}
      </div>
      <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 19, fontWeight: 700, marginBottom: 6 }}>
        {s.title}
        {s.badge && <span style={{
          display: "inline-block", marginInlineStart: 8, verticalAlign: "middle",
          background: P.accentDim, color: P.accentText, border: `1px solid ${P.borderStrong}`,
          borderRadius: 999, padding: "1px 9px", fontFamily: F.heading, fontSize: 10, fontWeight: 700,
        }}>{s.badge}</span>}
      </div>
      <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.75 }}>{s.desc}</div>
    </Link>
  );
}

export default function NavigationCenterPage() {
  const P = usePalette();
  const [counts, setCounts] = useState(null);
  const [q, setQ] = useState("");
  useEffect(() => { let a = true; getSiteCounts().then(c => { if (a) setCounts(c); }); return () => { a = false; }; }, []);

  // 🔎 סינון-חי: מסנן כרטיסים לפי כותרת/תיאור תוך כדי הקלדה; שכבה בלי התאמות נעלמת.
  const needle = q.trim();
  const tiers = useMemo(() => {
    if (!needle) return TIERS;
    const m = it => (it.title + " " + it.desc).includes(needle);
    return TIERS.map(t => ({ ...t, items: t.items.filter(m) })).filter(t => t.items.length);
  }, [needle]);

  return (
    <div style={{ direction: "rtl", maxWidth: 1080, margin: "0 auto", padding: "64px 24px 96px", position: "relative", zIndex: 1 }}>
      <SectionHeader eyebrow="מפת האתר החיה" title="🗺️ מרכז הניווט" />
      <p style={{ color: P.accentDim, fontFamily: F.body, fontSize: 16, lineHeight: 2, textAlign: "center", maxWidth: 640, margin: "-24px auto 26px" }}>
        כל האתר הוא <span style={{ color: P.accentText }}>גרף ידע אחד</span>. מהשורש אל הלב, מהלב אל העדשות, ומהן אל התוכן —
        כל שכבה מובילה לבאה אחריה.
      </p>

      {/* 🔎 חיפוש-מהיר בכל היעדים */}
      <div style={{ maxWidth: 460, margin: "0 auto 40px" }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="🔎 חיפוש מהיר במפה — כלי · מדור · מילה…"
          dir="rtl"
          aria-label="חיפוש במפת האתר"
          style={{
            width: "100%", boxSizing: "border-box", background: P.card, border: `1px solid ${P.borderStrong}`,
            borderRadius: 999, outline: "none", color: P.ink, fontFamily: F.body, fontSize: 15,
            padding: "12px 18px", minHeight: 48, textAlign: "center",
          }}
        />
      </div>

      {tiers.length === 0 ? (
        <div style={{ textAlign: "center", color: P.accentDim, fontFamily: F.body, fontSize: 15, padding: "40px 20px" }}>
          לא נמצאו יעדים ל«{needle}». נסו מילה אחרת.
        </div>
      ) : tiers.map((tier, ti) => (
        <section key={tier.key} style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16, paddingInlineStart: 2, flexWrap: "wrap" }}>
            <span style={{ fontSize: 24 }}>{tier.icon}</span>
            <h2 style={{ color: P.accentText, fontFamily: F.regal, fontSize: 23, fontWeight: 700, margin: 0 }}>{tier.title}</h2>
            <span style={{ color: P.onAccent, fontFamily: F.heading, fontSize: 12, letterSpacing: 2, border: `1px solid ${P.border}`, borderRadius: 999, padding: "2px 10px" }}>{tier.tag}</span>
            <span style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, marginInlineStart: "auto" }}>{tier.desc}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
            {tier.items.map(s => <Card key={s.to + s.title} s={s} counts={counts} />)}
          </div>
          {!needle && ti < tiers.length - 1 && (
            <div style={{ textAlign: "center", color: P.border, fontSize: 18, marginTop: 26 }}>↓</div>
          )}
        </section>
      ))}
    </div>
  );
}
