import React, { useEffect, useRef, useState } from "react";


function untabbable(nodes) {
  return React.Children.map(nodes, (child) => {
    if (!React.isValidElement(child)) return child;
    const props = {};
    if (child.props.children != null) props.children = untabbable(child.props.children);
    if (typeof child.type === "string" && /^(a|button|input|select|textarea)$/.test(child.type)) props.tabIndex = -1;
    return React.cloneElement(child, props);
  });
}

function MarqueeUnit({ measureRef, duplicate = false, gap, direction, children }) {
  return <span ref={measureRef} aria-hidden={duplicate || undefined}
    style={{ display: "inline-flex", alignItems: "center", flex: "none", paddingInlineEnd: gap, whiteSpace: "nowrap", direction }}>
    {duplicate ? untabbable(children) : children}
  </span>;
}

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
  paused = false,
  accessibleCopies = false,
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

  const half = Array.from({ length: reps }, (_, i) => <MarqueeUnit key={`a${i}`} gap={gap} direction={direction} duplicate={accessibleCopies && i > 0}>{children}</MarqueeUnit>);
  const halfB = Array.from({ length: reps }, (_, i) => <MarqueeUnit key={`b${i}`} gap={gap} direction={direction} duplicate={accessibleCopies}>{children}</MarqueeUnit>);

  return (
    <div ref={boxRef} className={`sod-mq ${className}`} role="marquee" aria-label={ariaLabel}
      style={{ overflow: "hidden", maxWidth: "100%", ...style }}>
      <style>{`
        @keyframes sod-mq-run { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .sod-mq-track { display: inline-flex; flex-wrap: nowrap; white-space: nowrap; will-change: transform; }
        ${pauseOnHover ? ".sod-mq:hover .sod-mq-track { animation-play-state: paused; }" : ""}
        ${accessibleCopies ? ".sod-mq:focus-within .sod-mq-track { animation-play-state: paused; }" : ""}
        @media (prefers-reduced-motion: reduce) { .sod-mq-track { animation: none !important; } }
      `}</style>
      {/* מד-רוחב נסתר של יחידה אחת (לחישוב כמה עותקים צריך למילוי) — לא משפיע על הפריסה */}
      <span aria-hidden style={{ position: "absolute", visibility: "hidden", pointerEvents: "none", height: 0, overflow: "hidden" }}>
        <MarqueeUnit measureRef={unitRef} gap={gap} direction={direction}>{children}</MarqueeUnit>
      </span>
      {/* dir=ltr במסילה → סדר-עותקים צפוי; טקסט עברי בתוך כל יחידה נשאר rtl תקין */}
      <div className="sod-mq-track" dir="ltr" style={{ animationName: "sod-mq-run", animationDuration: `${duration}s`, animationTimingFunction: "linear", animationIterationCount: "infinite", animationPlayState: paused ? "paused" : undefined }}>
        {half}
        {halfB}
      </div>
    </div>
  );
}
