import React from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";

// 🫧 בועות-מספרים תלת-מימדיות (זהב) — רכיב קנוני משותף.
// props:
//   data       — [{key,label,nums,count,hot}] (מ-computeBubbles ב-lib/bubbles.js)
//   title      — כותרת אופציונלית
//   hrefFor(b) — אם מסופק, כל בועה היא Link אל הכתובת (למשל /archive?...)
//   onPick(b)  — אחרת, כל בועה היא כפתור שקורא ל-onPick
//   activeKeys — Set של מפתחות-בועה פעילים (מובלטים)
export default function NumberBubbles({ data, title, hrefFor, onPick, activeKeys, compact }) {
  if (!data || !data.length) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  // 📱 compact — טווח-גודל קטן יותר למובייל/דף-הבית (אותה מפת-חום, ~40% פחות גובה). ברירת-מחדל: המלא.
  const sMin = compact ? 38 : 50, sSpan = compact ? 30 : 46;         // גודל: 38..68 (compact) · 50..96 (מלא)
  const fMin = compact ? 13 : 15, fSpan = compact ? 8 : 11;
  return (
    <div className="nb-wrap">
      <style>{NB_CSS}</style>
      {title && <div className="nb-title">{title}</div>}
      <div className="nb-row" style={compact ? { gap: 9 } : undefined}>
        {data.map(b => {
          const t = b.count / max;                                   // 0..1 עוצמה
          const size = Math.round(sMin + t * sSpan);
          const fs = Math.round(fMin + t * fSpan - (b.label.length > 3 ? 4 : 0));
          const on = activeKeys && activeKeys.has(b.key);
          const cls = `nb-bub${b.hot ? " hot" : ""}${on ? " on" : ""}`;
          const style = { width: size, height: size, fontSize: fs };
          const inner = (<><span className="nb-v">{b.label}</span><span className="nb-c">{b.count}</span></>);
          return hrefFor
            ? <Link key={b.key} to={hrefFor(b)} className={cls} style={style} title={`${b.label} · ${b.count} תמונות`}>{inner}</Link>
            : <button key={b.key} type="button" onClick={() => onPick && onPick(b)} className={cls} style={style} title={`${b.label} · ${b.count} תמונות`}>{inner}</button>;
        })}
      </div>
    </div>
  );
}

const NB_CSS = `
.nb-wrap { direction: rtl; }
.nb-title { color: #e8c840; font-family: ${F.heading}; font-size: 13px; font-weight: 800; margin-bottom: 12px; letter-spacing: .3px; }
.nb-row { display: flex; flex-wrap: wrap; gap: 13px; align-items: center; }
.nb-bub { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;
  border-radius: 50%; cursor: pointer; text-decoration: none; border: 1px solid rgba(255,240,200,0.5); flex: 0 0 auto;
  background: radial-gradient(circle at 34% 28%, #fff6d8 0%, #f6dd92 26%, #e3bd54 52%, #b8901f 82%, #8a6913 100%);
  box-shadow: 0 7px 18px rgba(0,0,0,0.55), inset 0 -7px 13px rgba(90,60,0,0.5), inset 0 5px 9px rgba(255,250,220,0.65);
  transition: transform .15s, box-shadow .15s; }
.nb-bub:hover { transform: translateY(-3px) scale(1.04); box-shadow: 0 12px 26px rgba(0,0,0,0.6), 0 0 22px rgba(212,175,55,0.45), inset 0 -7px 13px rgba(90,60,0,0.5), inset 0 5px 9px rgba(255,250,220,0.7); }
.nb-v { font-family: ${F.mono}; font-weight: 800; color: #2a1c02; line-height: 1; text-shadow: 0 1px 0 rgba(255,250,220,0.55); }
.nb-c { position: absolute; top: -3px; inset-inline-start: -3px; min-width: 19px; height: 19px; padding: 0 5px;
  border-radius: 999px; background: #1a0e00; color: #f6dd92; font-family: ${F.mono}; font-size: 10.5px; font-weight: 800;
  display: flex; align-items: center; justify-content: center; border: 1px solid rgba(212,175,55,0.6); }
.nb-bub.on { border-color: #fff; box-shadow: 0 0 0 3px rgba(246,226,122,0.85), 0 11px 26px rgba(0,0,0,0.55), inset 0 -7px 13px rgba(90,60,0,0.5), inset 0 5px 9px rgba(255,250,220,0.7); }
.nb-bub.hot { border-color: rgba(255,170,60,0.85); animation: nb-hot 2.4s ease-in-out infinite; }
@keyframes nb-hot {
  0%, 100% { box-shadow: 0 7px 18px rgba(0,0,0,0.55), 0 0 12px rgba(255,140,30,0.45), inset 0 -7px 13px rgba(90,60,0,0.55), inset 0 5px 9px rgba(255,250,220,0.65); }
  50%      { box-shadow: 0 7px 18px rgba(0,0,0,0.55), 0 0 24px rgba(255,150,40,0.75), 0 0 40px rgba(255,120,20,0.35), inset 0 -7px 13px rgba(90,60,0,0.55), inset 0 5px 9px rgba(255,250,220,0.7); }
}
.nb-bub.hot.on { animation: none; }
`;
