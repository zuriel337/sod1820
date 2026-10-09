import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePalette } from "../lib/palette.js";
import { F } from "../theme.js";

// Fixed public announcement deadline, Asia/Jerusalem. A countdown is not a capability-release gate.
export const WORLD_OPENING_AT = "2026-10-13T13:40:00+03:00";

export function worldOpeningRemaining(now = Date.now()) {
  const ms = Math.max(0, Date.parse(WORLD_OPENING_AT) - now);
  const seconds = Math.floor(ms / 1000);
  return {
    ended: ms === 0,
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  };
}

export default function WorldOpeningCountdown({ compact = false }) {
  const P = usePalette();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);
  const remaining = worldOpeningRemaining(now);
  const units = [
    ["ימים", remaining.days],
    ["שעות", remaining.hours],
    ["דקות", remaining.minutes],
    ["שניות", remaining.seconds],
  ];

  return (
    <section dir="rtl" className={`sod-world-opening ${compact ? "is-compact" : ""}`}
      aria-label="ספירה לאחור לפתיחת העולם החדש"
      style={{ background: P.cardGrad || P.card, border: `1px solid ${P.borderStrong}`, color: P.ink }}>
      <style>{`
        .sod-world-opening { max-width:1120px; margin:0 auto; padding:22px clamp(16px,4vw,32px); border-radius:22px; text-align:center; box-sizing:border-box; }
        .sod-world-opening .swo-heading { display:flex; flex-direction:column; align-items:center; gap:7px; }
        .sod-world-opening .swo-hourglass { display:inline-flex; align-items:center; justify-content:center; font-size:34px; animation:swo-turn 6s ease-in-out infinite; transform-origin:center; }
        @keyframes swo-turn { 0%,42%,100% { transform:rotate(0) } 51%,91% { transform:rotate(180deg) } }
        .sod-world-opening .swo-clock { display:flex; flex-wrap:wrap; justify-content:center; gap:clamp(8px,2vw,16px); margin:18px auto 10px; direction:rtl; }
        .sod-world-opening .swo-cell { flex:0 1 106px; min-width:68px; padding:12px 8px; border:1px solid currentColor; border-radius:14px; opacity:.94; }
        .sod-world-opening .swo-value { display:block; font-size:clamp(26px,4vw,43px); font-variant-numeric:tabular-nums; line-height:1.15; font-weight:800; }
        .sod-world-opening .swo-unit { display:block; font-size:14px; margin-top:5px; }
        .sod-world-opening .swo-link { display:inline-flex; justify-content:center; min-height:44px; align-items:center; text-decoration:underline; text-underline-offset:5px; font-weight:800; }
        @media (max-width:440px) { .sod-world-opening .swo-clock { gap:7px } .sod-world-opening .swo-cell { flex-basis:68px; padding:9px 4px } }
        @media (prefers-reduced-motion:reduce) { .sod-world-opening .swo-hourglass { animation:none } }
      `}</style>
      <div className="swo-heading">
        <span className="swo-hourglass" aria-hidden="true">⏳</span>
        <h2 style={{ margin:0, fontFamily:F.heading, fontSize:"clamp(22px,3.4vw,34px)", fontWeight:900 }}>
          העולם החדש עומד להיפתח
        </h2>
        <p style={{ margin:0, fontFamily:F.body, lineHeight:1.65, fontSize:16, color:P.inkSoft }}>
          {remaining.ended
            ? "מועד הספירה הגיע. גלו אילו חלקים כבר נפתחו בפועל."
            : "ארבעה ימים של ציפייה · SOD1820 2029 נפתח בהדרגה"}
        </p>
      </div>
      {!remaining.ended ? (
        <div className="swo-clock" role="timer" aria-live="off" aria-label="הזמן שנותר לפתיחה">
          {units.map(([label, value]) => (
            <div key={label} className="swo-cell" style={{ borderColor:P.border }}>
              <span className="swo-value" style={{ fontFamily:F.mono, color:P.accentText }}>{String(value).padStart(2, "0")}</span>
              <span className="swo-unit" style={{ fontFamily:F.heading }}>{label}</span>
            </div>
          ))}
        </div>
      ) : <p role="status" style={{fontFamily:F.heading,fontWeight:800}}>הספירה הסתיימה · בדקו מה זמין עכשיו</p>}
      <div style={{fontFamily:F.body,fontSize:14,color:P.inkSoft,margin:"0 0 6px"}}>יום שלישי · 13.10.2026 · 13:40 שעון ישראל</div>
      <Link className="swo-link" to="/map" style={{color:P.accentText,fontFamily:F.heading}}>🏗️ מה כבר נבנה ומה עומד להיפתח? ←</Link>
    </section>
  );
}
