import React, { useEffect, useRef, useState } from "react";

// 🎞️ טיקר-תריס אנכי — «שנת תשפ״ו · הארת פנים». גולל שורה-אחרי-שורה (roll כמו תריס).
// כל הערכים מאומתים במנוע: תשפ״ו = 786 = הארת פנים = קטנתי מכל החסדים
//   = ×2 «ברחמים גדולים» (393) = ×2 «אור פניך יהוה» (393).
const LINES = [
  "📅 שנת תשפ״ו — «הארת פנים»",
  "ברחמים גדולים + ברחמים גדולים = 393 + 393 = 786 = תשפ״ו",
  "🦌 כפל של «ברחמים גדולים» — שנת תשפ״ו",
  "«קטנתי מכל החסדים» = תשפ״ו = 786",
  "אור פניך יהוה + אור פניך יהוה = 393 + 393 = 786 = תשפ״ו",
  "👑 כפל של «הארת פנים»",
  "🌈 «הארת פנים» בגימטריה = 786 = תשפ״ו",
];
const H = 44; // גובה שורה

export default function YearTicker() {
  const [pos, setPos] = useState(0);
  const [anim, setAnim] = useState(true);
  const paused = useRef(false);

  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // כבוד ל-reduced-motion: נשאר על השורה הראשונה
    const t = setInterval(() => { if (!paused.current) { setAnim(true); setPos(p => p + 1); } }, 2800);
    return () => clearInterval(t);
  }, []);

  // לולאה חלקה: כשמגיעים לכפיל (LINES[0] המשוכפל) — קופצים לאפס בלי אנימציה.
  useEffect(() => {
    if (pos === LINES.length) {
      const t = setTimeout(() => { setAnim(false); setPos(0); }, 720);
      return () => clearTimeout(t);
    }
  }, [pos]);

  const stack = [...LINES, LINES[0]];

  return (
    <div
      role="marquee" aria-label="שנת תשפ״ו · הארת פנים"
      onMouseEnter={() => { paused.current = true; }}
      onMouseLeave={() => { paused.current = false; }}
      style={{
        position: "relative", overflow: "hidden", height: H, direction: "rtl",
        background: "linear-gradient(90deg,#0b0713,#1a0f2e 45%,#0b0713)",
        borderBlockEnd: "1px solid rgba(212,175,55,.35)",
        borderBlockStart: "1px solid rgba(212,175,55,.2)",
      }}
    >
      {/* פאדות בקצוות */}
      <span style={{ position: "absolute", insetInlineStart: 0, top: 0, bottom: 0, width: 40, zIndex: 2, background: "linear-gradient(90deg,#0b0713,transparent)", pointerEvents: "none" }} />
      <span style={{ position: "absolute", insetInlineEnd: 0, top: 0, bottom: 0, width: 40, zIndex: 2, background: "linear-gradient(270deg,#0b0713,transparent)", pointerEvents: "none" }} />
      <span aria-hidden style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", color: "#f2dd88", fontSize: 15, fontWeight: 900, letterSpacing: 1, zIndex: 3, textShadow: "0 0 10px rgba(212,175,55,.5)" }}>786</span>
      <div style={{ transform: `translateY(-${pos * H}px)`, transition: anim ? "transform .62s cubic-bezier(.6,.05,.2,1)" : "none" }}>
        {stack.map((line, i) => (
          <div key={i} style={{
            height: H, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            color: "#f6e7a8", fontFamily: "'Heebo',sans-serif", fontWeight: 800, fontSize: 15.5,
            padding: "0 56px", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            textShadow: "0 1px 6px rgba(0,0,0,.6)",
          }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
