import React, { useEffect, useRef, useState } from "react";

// 📜 רצועה-זזה קנונית (marquee) — שורה שרצה ברצף עם לולאה חלקה, לכל אורך-תוכן ולכל רוחב-מסך.
// ⚠️ למה קיים (החוק `ticker_marquee_law`): המסילה הנאיבית «שני עותקים + translateX(-50%)»
//    נשברת כשהתוכן קצר מרוחב-המסך — התוכן «זז מהאמצע ונעלם» עם רווח ולא חוזר על עצמו.
//    כאן מודדים את רוחב יחידת-התוכן ומשכפלים אותה מספיק פעמים כדי למלא את המיכל (חצי-לולאה
//    ≥ רוחב-המיכל), ואז מכפילים את כל הרצף → אזור-הצפייה תמיד מכוסה, בלי רווח ובלי «קפיצה».
// 🧩 קנוני: כל טיקר/רצועה-זזה באתר עובר דרך הרכיב הזה (canonical_ui_components_law) —
//    לא כותבים marquee מקומי חדש. שימוש: <Marquee speedPxPerSec={55} gap={60}>…</Marquee>.
export default function Marquee({
  children,
  speedPxPerSec = 60,   // מהירות אחידה (פיקסלים לשנייה) — לא תלוי באורך התוכן
  gap = 44,             // רווח בין חזרות (px)
  pauseOnHover = true,
  className = "",
  style,
  ariaLabel,
  direction = "rtl",
}) {
  const boxRef = useRef(null);
  const unitRef = useRef(null);
  const [reps, setReps] = useState(2);
  const [duration, setDuration] = useState(20);

  useEffect(() => {
    const box = boxRef.current, unit = unitRef.current;
    if (!box || !unit) return;
    const measure = () => {
      const cw = box.clientWidth || 1;
      const uw = unit.offsetWidth || 1;                  // רוחב יחידת-תוכן אחת (כולל הרווח)
      const need = Math.max(2, Math.ceil(cw / uw) + 1);  // עותקים למילוי המיכל, תמיד ≥ 2
      setReps(need);
      setDuration((uw * need) / speedPxPerSec);          // חצי-לולאה = need עותקים → מהירות קבועה
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [speedPxPerSec, gap, children]);

  const Unit = ({ measure }) => (
    <span ref={measure ? unitRef : undefined}
      style={{ display: "inline-flex", alignItems: "center", flex: "none", paddingInlineEnd: gap, whiteSpace: "nowrap", direction }}>
      {children}
    </span>
  );
  const half = Array.from({ length: reps }, (_, i) => <Unit key={`a${i}`} />);
  const halfB = Array.from({ length: reps }, (_, i) => <Unit key={`b${i}`} />);

  return (
    <div ref={boxRef} className={`sod-mq ${className}`} role="marquee" aria-label={ariaLabel}
      style={{ overflow: "hidden", maxWidth: "100%", ...style }}>
      <style>{`
        @keyframes sod-mq-run { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .sod-mq-track { display: inline-flex; flex-wrap: nowrap; white-space: nowrap; will-change: transform; }
        ${pauseOnHover ? ".sod-mq:hover .sod-mq-track { animation-play-state: paused; }" : ""}
        @media (prefers-reduced-motion: reduce) { .sod-mq-track { animation: none !important; } }
      `}</style>
      {/* מד-רוחב נסתר של יחידה אחת (לחישוב כמה עותקים צריך למילוי) — לא משפיע על הפריסה */}
      <span aria-hidden style={{ position: "absolute", visibility: "hidden", pointerEvents: "none", height: 0, overflow: "hidden" }}>
        <Unit measure />
      </span>
      {/* dir=ltr במסילה → סדר-עותקים צפוי; טקסט עברי בתוך כל יחידה נשאר rtl תקין */}
      <div className="sod-mq-track" dir="ltr" style={{ animation: `sod-mq-run ${duration}s linear infinite` }}>
        {half}
        {halfB}
      </div>
    </div>
  );
}
