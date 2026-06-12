import React from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { SectionHeader, GoldButton } from "../components/ui.jsx";

const STEPS = [
  { emoji: "🔢", title: "מהי גימטריה", body: "לכל אות עברית יש ערך מספרי. סכום האותיות של מילה הוא ה\"גימטריה\" שלה — וכשמילים שונות חולקות ערך זהה, נחשף קשר נסתר ביניהן. זו שפה שלמה של משמעות מאחורי המספרים.", to: "/beit-midrash" },
  { emoji: "🕰", title: "מהו ציר ההתגלות", body: "ציר הזמן של אירועי הגאולה. כל תחנה מתעדת אירוע — ולצידו הפוסט, הסרטון, הצופן, מספרי האם והתגובות. כך כל אירוע הופך לעולם שלם של רמזים.", to: "/timeline" },
  { emoji: "🌳", title: "מהו עץ המספרים", body: "מפה תלת-מימדית של קשרים בין מספרים, מושגים ואירועים. כל מספר הוא צומת שמתחבר לאחרים — לחיצה פותחת את המשמעויות, השורשים והקשרים שלו.", to: "/numbers" },
  { emoji: "🔍", title: "מהו הצופן התנ\"כי", body: "דילוגי אותיות (ELS) בטקסט התורה המלא. הכלי מחפש מילים ואשכולות מונחים בדילוגים קבועים — עדות, לא ניבוי. כלי לימוד והתבוננות.", to: "/code" },
  { emoji: "📖", title: "איך מחפשים באתר", body: "אפשר לחפש פוסטים לפי טקסט, לפי ערך גימטריה, או לפי קטגוריה ותגית. כל מספר וכל ביטוי מוביל לרשת הקשרים שלו.", to: "/post" },
  { emoji: "📚", title: "איך מתקדמים לבית המדרש", body: "בית המדרש בנוי כמו אוניברסיטה: שיטת המסתתר, קדמי, מילוי, אלב\"ם, אתב\"ש ועוד — כל שיטה עם הסבר, דוגמאות ומחשבון אינטראקטיבי.", to: "/beit-midrash" },
  { emoji: "👑", title: "למה להצטרף לבני ההיכל", body: "אזור המנויים: שיעורים מלאים, קורסים, מפות רמזים, העץ המתקדם, צפנים בלעדיים וגישה מוקדמת לתכנים חדשים.", to: "/members" },
];

export default function StartHerePage() {
  return (
    <div style={{ direction: "rtl", maxWidth: 880, margin: "0 auto", padding: "64px 24px 96px", position: "relative", zIndex: 1 }}>
      <SectionHeader eyebrow="ברוכים הבאים" title="כאן מתחילים" />
      <p style={{ color: C.goldDim, fontFamily: F.body, fontSize: 17, lineHeight: 2, textAlign: "center", maxWidth: 640, margin: "-24px auto 48px" }}>
        בשתי דקות — כל מה שצריך כדי להבין מה זה SOD1820 ואיך מנווטים בו.
        כל מערכת מחוברת לשנייה, כך שכל לחיצה פותחת מסלול חקירה חדש.
      </p>

      <div style={{ display: "grid", gap: 16 }}>
        {STEPS.map((s, i) => (
          <Link key={s.title} to={s.to} style={{
            display: "flex", gap: 18, alignItems: "flex-start", textDecoration: "none",
            background: C.surface2, border: `1px solid ${C.border}`, borderInlineStart: `3px solid ${C.gold}`,
            borderRadius: 10, padding: "20px 22px", transition: "border-color 0.2s, transform 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderGold; e.currentTarget.style.transform = "translateX(-3px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.borderInlineStartColor = C.gold; e.currentTarget.style.transform = "none"; }}
          >
            <div style={{ fontSize: 30, lineHeight: 1 }}>{s.emoji}</div>
            <div>
              <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 19, fontWeight: 700, marginBottom: 6 }}>
                {i + 1}. {s.title}
              </div>
              <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.85 }}>{s.body}</div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 52 }}>
        <GoldButton to="/timeline">התחל את המסע →</GoldButton>
      </div>
    </div>
  );
}
