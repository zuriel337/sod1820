import React from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { SectionHeader, GoldButton } from "../components/ui.jsx";
import UpdatesBox from "../components/UpdatesBox.jsx";

// "כאן מתחילים" — מסע התחלה קצר לפי מודל העץ האחד: שורש → לב → עדשות → הצטרפות.
// כל צעד מסומן בשכבה שלו, כך שמההתחלה מבינים את המבנה של האתר.
const STEPS = [
  { tier: "🌱 השורש", emoji: "🔢", title: "מהו סוד 1820",
    body: "13 שנות מחקר שמחברות תורה, גימטריה ורמזי גאולה לשפה אחת. כל האתר הוא גרף ידע אחד — לא אוסף עמודים נפרדים.",
    to: "/" },
  { tier: "🫀 הלב", emoji: "🧮", title: "מנוע הגימטריה — חינם לכולם", badge: "חינם",
    body: "8 שיטות במחשבון אחד (רגיל · מילוי · מסתתר · קדמי · גדול · סידורי · אתב\"ש · אלב\"ם) + מנועי עומק. כותבים מילה — ומגלים את כל הביטויים השווים לה.",
    to: "/beit-midrash?tab=calc" },
  { tier: "🫀 הלב", emoji: "🧬", title: "דף המספר + מד ההתכנסות", badge: "חדש",
    body: "לכל מספר וביטוי דף-DNA: כמה שכבות בלתי-תלויות מתכנסות אליו (ציון 0-100 · 🥉🥈🥇), ישויות הזהב, וכרטיסי ההתכנסות. נסו את 1820.",
    to: "/number/1820" },
  { tier: "🫀 הלב", emoji: "⟡", title: "הצלבת שיטות וצירי התכנסות", badge: "חדש",
    body: "הזינו מספר — וראו את כל הביטויים המאומתים שנופלים עליו בכל השיטות, ומה מתחבר למה.",
    to: "/cross" },
  { tier: "🔭 העדשות", emoji: "📖", title: "פוסטים, ציר ההתגלות והצופן",
    body: "מאות תיעודים מקושרים ברשת אחת, ציר זמן של אירועי הגאולה, ודילוגי האותיות בתורה — כולם עדשות על אותו גרף.",
    to: "/post" },
  { tier: "👑 ההצטרפות", emoji: "👑", title: "הצטרפו לבני ההיכל",
    body: "גישה לתכנים מתקדמים, כלים בלעדיים וצפנים — וההתגלויות החדשות שמתווספות כל הזמן.",
    to: "/members" },
];

const badgeStyle = (P) => ({
  display: "inline-block", marginInlineStart: 8, verticalAlign: "middle",
  background: P.accentDim, color: P.accentText, border: `1px solid ${P.borderStrong}`,
  borderRadius: 999, padding: "2px 10px", fontFamily: F.heading, fontSize: 10.5, fontWeight: 700,
  letterSpacing: 0.3, whiteSpace: "nowrap",
});

export default function StartHerePage() {
  const P = usePalette();
  return (
    <div style={{ direction: "rtl", maxWidth: 880, margin: "0 auto", padding: "64px 24px 96px", position: "relative", zIndex: 1 }}>
      <SectionHeader eyebrow="ברוכים הבאים" title="כאן מתחילים" />
      <p style={{ color: P.accentDim, fontFamily: F.body, fontSize: 17, lineHeight: 2, textAlign: "center", maxWidth: 640, margin: "-24px auto 44px" }}>
        בשתי דקות — המסע מהשורש אל הלב. כל האתר הוא <span style={{ color: P.accentText }}>גרף ידע אחד</span>,
        וכל לחיצה פותחת מסלול חקירה חדש.
        <br />
        <span style={{ color: P.accentText }}>המחשבון ובית המדרש פתוחים לכולם, חינם.</span>
      </p>

      <div style={{ display: "grid", gap: 16 }}>
        {STEPS.map((s, i) => (
          <Link key={s.title} to={s.to} style={{
            display: "flex", gap: 18, alignItems: "flex-start", textDecoration: "none",
            background: P.cardSoft, border: `1px solid ${P.border}`, borderInlineStart: `3px solid ${P.accent}`,
            borderRadius: 10, padding: "20px 22px", transition: "border-color 0.2s, transform 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = P.borderStrong; e.currentTarget.style.transform = "translateX(-3px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.borderInlineStartColor = P.accent; e.currentTarget.style.transform = "none"; }}
          >
            <div style={{ fontSize: 30, lineHeight: 1 }}>{s.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: P.onAccent, fontFamily: F.heading, fontSize: 11, letterSpacing: 1, marginBottom: 4 }}>{s.tier}</div>
              <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 19, fontWeight: 700, marginBottom: 6 }}>
                {i + 1}. {s.title}
                {s.badge && <span style={badgeStyle(P)}>{s.badge}</span>}
              </div>
              <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.85 }}>{s.body}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* כל המערכות במבט-על */}
      <div style={{ textAlign: "center", marginTop: 28 }}>
        <Link to="/map" style={{ color: P.accentText, fontFamily: F.heading, fontSize: 14, fontWeight: 700, textDecoration: "none", letterSpacing: 0.5 }}>
          🏛 לכל המערכות — מרכז הניווט →
        </Link>
      </div>

      {/* 📨 לכידת איש קשר — שלא ילך לאיבוד, ויצטרף לאנשים שלנו */}
      <div style={{ marginTop: 48 }}>
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
        <p style={{ color: P.accentDim, fontFamily: F.regal, fontSize: 15.5, lineHeight: 1.8, marginTop: 18, fontStyle: "italic" }}>
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
