import React from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { SectionHeader, GoldButton } from "../components/ui.jsx";

// המדורים החיים באתר — מה שאפשר לפתוח ולחקור עכשיו.
const STEPS = [
  { emoji: "🔢", title: "מהי גימטריה", body: "לכל אות עברית יש ערך מספרי. סכום האותיות של מילה הוא ה\"גימטריה\" שלה — וכשמילים שונות חולקות ערך זהה, נחשף קשר נסתר ביניהן. זו שפה שלמה של משמעות מאחורי המספרים.", to: "/beit-midrash?tab=methods" },
  { emoji: "🧮", title: "מחשבון הגימטריה — פתוח לכולם", badge: "חדש · חינם", body: "שמונה שיטות חישוב במחשבון אינטראקטיבי אחד: רגיל, מסתתר, מילוי, קדמי, גדול, סידורי, אתב\"ש ואלב\"ם. כותבים מילה — ומגלים מיד אילו ביטויים שווים לה בכל שיטה.", to: "/beit-midrash?tab=calc" },
  { emoji: "✨", title: "דף המספר ודף הביטוי", badge: "חדש", body: "לכל מספר וכל ביטוי יש דף משלו — ה-DNA שלו: הערך, הביטויים השווים לו, הגלריות והתמונות שקשורות אליו, ודופק חיוּת שמראה עד כמה הוא \"חי\" באתר.", to: "/number/1820" },
  { emoji: "🕰", title: "ציר ההתגלות", badge: "בהקמה", body: "ציר הזמן של אירועי הגאולה. כל תחנה מתעדת אירוע — ולצידו הפוסט, הסרטון, הצופן ומספרי האם. כך כל אירוע הופך לעולם שלם של רמזים.", to: "/timeline" },
  { emoji: "📚", title: "בית המדרש — כמו אוניברסיטה", body: "כל שיטות הגימטריה עם הסבר, אנימציה חיה ודוגמאות. שחור על לבן, ברור ונקי — ללמוד בעיון ולא רק לחשב.", to: "/beit-midrash?tab=methods" },
  { emoji: "✅", title: "פוסטים מאומתים", badge: "חדש", body: "פוסטים שהמערכת אימתה — עם חישובי הגימטריה והתאריכים שנבדקו. ריכוז כל הפוסטים המאומתים במקום אחד.", to: "/verified" },
  { emoji: "🔎", title: "איך מנווטים באתר", body: "מקלידים מילה או מספר בחיפוש \"מה תרצו לגלות היום\" — ונפתח דף המספר/הביטוי עם רשת הקשרים שלו. ולחיצה על הקובייה 🎲 מקפיצה אתכם ליעד מפתיע.", to: "/" },
];

// מדורים בבנייה — יוצגו כ"בקרוב" ולא כקישור פעיל.
const SOON = [
  { emoji: "🌳", title: "עץ המספרים", body: "מפה תלת-מימדית של קשרים בין מספרים, מושגים ואירועים." },
  { emoji: "🔍", title: "הצופן התנ\"כי (ELS)", body: "דילוגי אותיות בטקסט התורה המלא — עדות, לא ניבוי." },
];

const badgeStyle = {
  display: "inline-block", marginInlineStart: 8, verticalAlign: "middle",
  background: C.goldDark, color: C.goldBright, border: `1px solid ${C.borderGold}`,
  borderRadius: 999, padding: "2px 10px", fontFamily: F.heading, fontSize: 10.5, fontWeight: 700,
  letterSpacing: 0.3, whiteSpace: "nowrap",
};

export default function StartHerePage() {
  return (
    <div style={{ direction: "rtl", maxWidth: 880, margin: "0 auto", padding: "64px 24px 96px", position: "relative", zIndex: 1 }}>
      <SectionHeader eyebrow="ברוכים הבאים" title="כאן מתחילים" />
      <p style={{ color: C.goldDim, fontFamily: F.body, fontSize: 17, lineHeight: 2, textAlign: "center", maxWidth: 640, margin: "-24px auto 48px" }}>
        בשתי דקות — כל מה שצריך כדי להבין מה זה SOD1820 ואיך מנווטים בו.
        כל מערכת מחוברת לשנייה, כך שכל לחיצה פותחת מסלול חקירה חדש.
        <br />
        <span style={{ color: C.goldBright }}>המחשבון ובית המדרש פתוחים לכולם, חינם.</span>
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
                {s.badge && <span style={badgeStyle}>{s.badge}</span>}
              </div>
              <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.85 }}>{s.body}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* בקרוב — מדורים בבנייה */}
      <div style={{ marginTop: 40 }}>
        <div style={{ color: C.muted, fontFamily: F.heading, fontSize: 13, letterSpacing: 1, textAlign: "center", marginBottom: 16 }}>
          🛠 בקרוב לאתר
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {SOON.map(s => (
            <div key={s.title} style={{
              display: "flex", gap: 16, alignItems: "flex-start",
              background: C.surface, border: `1px dashed ${C.border}`,
              borderRadius: 10, padding: "16px 20px", opacity: 0.72,
            }}>
              <div style={{ fontSize: 24, lineHeight: 1 }}>{s.emoji}</div>
              <div>
                <div style={{ color: C.goldDim, fontFamily: F.regal, fontSize: 16.5, fontWeight: 700, marginBottom: 4 }}>
                  {s.title}
                  <span style={{ ...badgeStyle, background: "transparent", color: C.muted, borderColor: C.border }}>בקרוב</span>
                </div>
                <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.8 }}>{s.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 52, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <GoldButton to="/beit-midrash?tab=calc">פתחו את המחשבון →</GoldButton>
        <GoldButton to="/number/1820" variant="secondary">גלו את 1820 →</GoldButton>
      </div>
    </div>
  );
}
