import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { track } from "../lib/tracking.js";

// 🫧 רמז מציאות — בועה קטנה בפינה, לא חוסמת, נסגרת, בקול האתר.
// מתחילים קטן ומודדים: כל הצגה/לחיצה/סגירה נרשמת ל-visitor_events (section='reality_hint', slug=kind).
// יושר: עובדה לפני פרשנות. בלי נבואות. לא מציק — פעם ל-session, ואחרי סגירה cooldown של 3 ימים.
//
// עקרון whats_new_law: לא חלון-זמן גלובלי מעצבן. פעם ל-session + snooze פר-משתמש.

const HINTS = [
  { kind: "inspire",  ic: "💡", body: "אולי החיים משאירים רמזים." },
  { kind: "connect",  ic: "🔍", body: "אל תחפש תשובות. חפש קשרים.", strong: true },
  { kind: "invite",   ic: "🧭", body: "רוצה לבדוק אם גם לחיים שלך יש חתימה?", cta: "למסע האישי", to: "/journey", grow: true },
  { kind: "ai",       ic: "🤖", body: "נסו לראות איך שני מנועי AI מפרשים את אותו מספר.", cta: "למחשבון", to: "/community/calculator" },
  { kind: "question", ic: "✨", body: "האם יש מספר שחוזר אצלכם שוב ושוב?", grow: true },
  { kind: "thought",  ic: "📜", body: "כל תגלית גדולה מתחילה בהתבוננות אחת." },
];

const SNOOZE_KEY = "sod_hint_snooze";      // ms timestamp — עד מתי לא להציג (אחרי סגירה)
const SESSION_KEY = "sod_hint_seen";        // הוצג כבר ב-session הזה
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;  // 3 ימים
const APPEAR_DELAY = 7000;                  // מופיע אחרי 7ש׳ שיטוט
const AUTO_HIDE = 22000;                    // נעלם בעדינות אם התעלמו

function pickHint() {
  // בחירה יציבה-ל-session (לא מתחלף בכל רינדור), אך שונה בין ביקורים
  const i = Math.floor((Date.now() / 1000) % HINTS.length);
  return HINTS[i];
}

export default function RealityHint() {
  const [hint, setHint] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // כבר הוצג ב-session? / ב-snooze? → לא מציגים
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      const snooze = Number(localStorage.getItem(SNOOZE_KEY) || 0);
      if (snooze && Date.now() < snooze) return;
    } catch { /* ignore */ }

    const h = pickHint();
    const t = setTimeout(() => {
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
      setHint(h); setShow(true);
      track("reality_hint", h.kind, "view");   // 📊 impression
    }, APPEAR_DELAY);
    return () => clearTimeout(t);
  }, []);

  // היעלמות עדינה אם התעלמו (לא נספר כסגירה)
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(false), AUTO_HIDE);
    return () => clearTimeout(t);
  }, [show]);

  const dismiss = () => {
    setShow(false);
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS)); } catch { /* ignore */ }
    if (hint) track("reality_hint", hint.kind, "dismiss");
  };
  const clickCta = () => { if (hint) track("reality_hint", hint.kind, "click", { to: hint.to }); };

  if (!hint) return null;

  const accent = hint.grow ? "#a9cf94" : "#e8c25a";
  return (
    <div role="status" aria-live="polite" style={{
      position: "fixed", bottom: 18, insetInlineStart: 18, zIndex: 60,
      width: "min(330px, calc(100vw - 32px))",
      background: "linear-gradient(180deg,#1c1633,#151027)",
      border: `1px solid ${hint.grow ? "rgba(169,207,148,.32)" : "rgba(232,194,90,.22)"}`,
      borderRadius: 16, padding: "13px 13px 12px",
      boxShadow: "0 20px 44px -18px #000e, inset 0 1px 0 #ffffff0c",
      transform: show ? "translateY(0)" : "translateY(24px)",
      opacity: show ? 1 : 0,
      pointerEvents: show ? "auto" : "none",
      transition: "transform .5s cubic-bezier(.2,.8,.2,1), opacity .45s ease",
      fontFamily: "'Heebo','Assistant',system-ui,sans-serif", direction: "rtl",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span aria-hidden="true" style={{ fontSize: 17 }}>{hint.ic}</span>
        <span style={{ flex: 1, fontSize: 10.5, letterSpacing: ".08em", color: accent, fontWeight: 800 }}>סוד 1820</span>
        <button onClick={dismiss} aria-label="סגור" style={{
          appearance: "none", border: "none", background: "none", color: "#6f6350",
          cursor: "pointer", fontSize: 15, lineHeight: 1, padding: "2px 5px", borderRadius: 6,
        }}>✕</button>
      </div>
      <div style={{ color: "#cdbf9f", fontSize: 14, lineHeight: 1.65, fontWeight: hint.strong ? 800 : 400 }}>{hint.body}</div>
      {hint.to && (
        <Link to={hint.to} onClick={clickCta} style={{
          display: "inline-block", marginTop: 11, color: accent, fontWeight: 800, fontSize: 13,
          textDecoration: "none", border: `1px solid ${hint.grow ? "rgba(169,207,148,.4)" : "rgba(232,194,90,.3)"}`,
          borderRadius: 999, padding: "6px 14px",
        }}>{hint.cta} ←</Link>
      )}
    </div>
  );
}
