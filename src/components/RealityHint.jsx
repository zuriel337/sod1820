import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { track } from "../lib/tracking.js";
import { useUserCenter } from "../lib/userCenter/UserCenterContext.jsx";

// 🫧 רמז מציאות — בועה קטנה בפינה, לא חוסמת, בקול האתר.
// שתי התנהגויות (כמו שצוריאל הגדיר):
//   • התעלמות → נעלמת בעדינות וחוזרת בעוד כמה דקות עם רמז אחר.
//   • סגירה (✕) → מפסיקה עד סוף ה-session (מכבד «לא עכשיו»).
// טריגר ראשון: אחרי שהמשתמש גלל, או אחרי השהייה. מדידה: view/click/dismiss ל-visitor_events.
// יושר: עובדה לפני פרשנות, בלי נבואות.

const HINTS = [
  { kind: "thread",   ic: "🌱", body: "אולי גם לחיים שלך יש חוט שמחבר בין שמות, מספרים ותאריכים.", cta: "למסע האישי", to: "/journey", grow: true },
  { kind: "connect",  ic: "🔍", body: "אל תחפש תשובות. חפש קשרים.", strong: true },
  { kind: "thought",  ic: "📜", body: "כל תגלית גדולה מתחילה בהתבוננות אחת." },
  { kind: "question", ic: "✨", body: "האם יש מספר שחוזר אצלך שוב ושוב?", grow: true },
  { kind: "ai",       ic: "🤖", body: "נסו לראות איך שני מנועי AI מפרשים את אותו מספר.", cta: "למחשבון", to: "/community/calculator" },
  { kind: "inspire",  ic: "💡", body: "אולי החיים משאירים רמזים." },
];

const SCROLL_TRIGGER = 400;    // px — «אחרי שהמשתמש גלל»
const FALLBACK_DELAY = 30000;  // אם לא גלל — מופיע אחרי 30ש׳
const VISIBLE_MS = 18000;      // כמה זמן מוצגת לפני היעלמות עדינה
const CYCLE_MS = 240000;       // «פעם בכמה דקות» — ~4 דק׳ בין רמזים

export default function RealityHint() {
  const [hint, setHint] = useState(null);
  const [show, setShow] = useState(false);
  // 🏛️ עולם-המשתמש פתוח (מגירה z-4000) → הבועה (z-60) נבלעת מאחורי ההאפלה ונראית תקולה.
  // לכן: כשהמגירה פתוחה — הבועה מוסתרת; כשנסגרת — חוזרת אם עוד בחלון התצוגה שלה.
  const { isOpen: ucOpen } = useUserCenter();
  const idxRef = useRef(Math.floor(Math.random() * HINTS.length)); // התחלה אקראית → שונה בין ביקורים
  const stoppedRef = useRef(false);
  const hideT = useRef(null);
  const cycleT = useRef(null);

  useEffect(() => {
    let started = false;
    const showNext = () => {
      if (stoppedRef.current) return;
      const h = HINTS[idxRef.current % HINTS.length];
      idxRef.current += 1;
      setHint(h); setShow(true);
      track("reality_hint", h.kind, "view");
      clearTimeout(hideT.current);
      hideT.current = setTimeout(() => setShow(false), VISIBLE_MS); // התעלמות → נעלמת
    };
    const begin = () => {
      if (started || stoppedRef.current) return;
      started = true;
      window.removeEventListener("scroll", onScroll);
      showNext();
      cycleT.current = setInterval(showNext, CYCLE_MS); // חוזרת כל כמה דקות
    };
    const onScroll = () => { if (window.scrollY > SCROLL_TRIGGER) begin(); };

    window.addEventListener("scroll", onScroll, { passive: true });
    const fb = setTimeout(begin, FALLBACK_DELAY); // אם לא גלל בכלל

    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(fb); clearTimeout(hideT.current); clearInterval(cycleT.current);
    };
  }, []);

  const dismiss = () => {
    stoppedRef.current = true;                    // סגירה = מפסיק עד סוף ה-session
    clearInterval(cycleT.current); clearTimeout(hideT.current);
    setShow(false);
    if (hint) track("reality_hint", hint.kind, "dismiss");
  };
  const clickCta = () => { if (hint) track("reality_hint", hint.kind, "click", { to: hint.to }); };

  if (!hint) return null;
  const accent = hint.grow ? "#a9cf94" : "#e8c25a";

  return (
    <div role="status" aria-live="polite" style={{
      position: "fixed", bottom: 18, insetInlineEnd: 18, zIndex: 60,
      width: "min(330px, calc(100vw - 32px))",
      background: "linear-gradient(180deg,#1c1633,#151027)",
      border: `1px solid ${hint.grow ? "rgba(169,207,148,.32)" : "rgba(232,194,90,.22)"}`,
      borderRadius: 16, padding: "13px 13px 12px",
      boxShadow: "0 20px 44px -18px #000e, inset 0 1px 0 #ffffff0c",
      transform: (show && !ucOpen) ? "translateY(0)" : "translateY(24px)",
      opacity: (show && !ucOpen) ? 1 : 0,
      pointerEvents: (show && !ucOpen) ? "auto" : "none",
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
