import React from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { SectionHeader, GoldButton } from "../components/ui.jsx";
import UpdatesBox from "../components/UpdatesBox.jsx";

// המדורים החיים באתר — מה שאפשר לפתוח ולחקור עכשיו.
const STEPS = [
  { emoji: "🔢", title: "מהו סוד 1820", body: "מערכת הבינה המלאכותית הראשונה שמחברת תורה, גימטריה, רמזי גאולה וטכנולוגיה — 13 שנות מחקר במקום אחד. שפה שלמה של משמעות מאחורי המספרים.", to: "/" },
  { emoji: "🔎", title: "חיפוש חכם", body: "הקלידו כל מילה, שם, פסוק או מספר — וקבלו מיד דף שלם של ערך, ביטויים שווים, קשרים וגילויים. נסו אפילו את השם שלכם.", to: "/number/אהבה" },
  { emoji: "🧮", title: "מנוע הגימטריה — פתוח לכולם, חינם", badge: "חדש", body: "8 שיטות במחשבון אחד (רגיל · מילוי · מסתתר · קדמי · גדול · סידורי · אתב\"ש · אלב\"ם) ועוד מנועי עומק — משולש גדול, מילוי דמילוי ועוד. כותבים מילה, מגלים את כל הביטויים השווים לה.", to: "/beit-midrash?tab=calc" },
  { emoji: "🧬", title: "דף המספר + מד ההתכנסות", badge: "חדש", body: "לכל מספר וביטוי דף-DNA משלו: כמה שכבות בלתי-תלויות מתכנסות אליו (ציון 0-100 · 🥉🥈🥇), ישויות הזהב, וכרטיסי ההתכנסות עם התמונות המדויקות.", to: "/number/1820" },
  { emoji: "⟡", title: "הצלבת שיטות וצירי התכנסות", badge: "חדש", body: "הזינו מספר — וראו את כל הביטויים המאומתים שנופלים עליו בכל השיטות, וצירי ההתכנסות שמספרים מה מתחבר למה.", to: "/cross" },
  { emoji: "📖", title: "מאגר הפוסטים", body: "מאות פוסטים ותיעודים, מחוברים זה לזה ברשת קישורים חכמה — חיפוש, סינון וגימטריה לכל פוסט.", to: "/post" },
  { emoji: "🕰", title: "ציר ההתגלות", body: "ציר הזמן של אירועי הגאולה — כל תחנה מחברת אירוע לפוסט, לתמונות ולמספרי האם שלו.", to: "/timeline" },
  { emoji: "📚", title: "בית המדרש — כמו אוניברסיטה", body: "כל שיטות הגימטריה עם הסבר, אנימציה ודוגמאות — וגם צירי ההתכנסות וחידושי ה-AI. ללמוד בעיון, לא רק לחשב.", to: "/beit-midrash" },
  { emoji: "✅", title: "פוסטים מאומתים", body: "פוסטים שהמערכת אימתה — חישובי הגימטריה והתאריכים שנבדקו, מרוכזים במקום אחד.", to: "/verified" },
  { emoji: "👑", title: "הצטרפו לבני ההיכל", body: "גישה לתכנים מתקדמים, כלים בלעדיים וצפנים — וההתגלויות החדשות שמתווספות כל הזמן.", to: "/members" },
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

      {/* 📨 לכידת איש קשר — שלא ילך לאיבוד, ויצטרף לאנשים שלנו */}
      <div style={{ marginTop: 52 }}>
        <UpdatesBox
          variant="panel"
          source="start-here"
          title="📨 השאירו מייל — ואל תלכו לאיבוד"
          body="כל התגלות חדשה, חידוש גימטריה או רמז גאולה — יגיע אליכם ראשונים. הצטרפו לאנשי סוד 1820."
          cta="אני בפנים 👑" />
      </div>

      {/* 👑 סיום — היכנסו לעולם החדש */}
      <div style={{ textAlign: "center", marginTop: 48 }}>
        <GoldButton to="/">👑 היכנסו לעולם החדש</GoldButton>
        <p style={{ color: C.goldDim, fontFamily: F.regal, fontSize: 15.5, lineHeight: 1.8, marginTop: 18, fontStyle: "italic" }}>
          כאן התורה פוגשת את הבינה המלאכותית — והרמזים הופכים לידע חי.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 20 }}>
          <GoldButton to="/beit-midrash?tab=calc" variant="secondary">פתחו את המחשבון →</GoldButton>
          <GoldButton to="/number/1820" variant="secondary">גלו את 1820 →</GoldButton>
        </div>
      </div>
    </div>
  );
}
