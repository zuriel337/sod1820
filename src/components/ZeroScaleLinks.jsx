import React from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette, PALETTES } from "../lib/palette.js";

// 🔗 זיקת האפסים — חוק DB `zero_scale_law` (צוריאל פולייס).
// אותו שורש בסדר גודל אחר: ×10 (הוספת אפס) ו-÷10 (הסרת אפס, כשנגמר ב-0).
// הגרעין נשמר, רק הדרגה משתנה. 216↔2160 (יראה) · 358→3580 (משיח).
// תצוגה: כרטיס "סולם" עדין — המספר הנוכחי במרכז, שכניו כצ׳יפים מוגבהים.
// רכיב אחד שמשרת את החוק בכל מקום. ברירת מחדל = פלטה גלובלית; prop `light` = override.
export default function ZeroScaleLinks({ value, compact = false, showEssence = true, light }) {
  const globalP = usePalette();
  const pal = light == null ? globalP : PALETTES[light ? "light" : "dark"];
  const n = Number(value);
  if (!Number.isFinite(n) || n < 10) return null;
  const down = (n % 10 === 0 && n >= 20) ? n / 10 : null;
  const up = n * 10;

  const C = {
    gold: pal.accentText, dim: pal.accentDim, muted: pal.inkSoft,
    border: pal.border, borderStrong: pal.borderStrong, glow: pal.glow,
    soft: pal.cardSoft, grad: pal.cardGrad,
  };

  const neighbor = (num, label) => (
    <Link to={`/number/${num}`} className="zsl-chip" title={`אותו שורש — ${label}`}
      style={{ background: C.soft, border: `1px solid ${C.border}`, color: C.gold }}>
      <span className="zsl-chip-num">{num}</span>
      <span className="zsl-chip-tag" style={{ color: C.dim }}>{label}</span>
    </Link>
  );

  return (
    <div className={`zsl-wrap${compact ? " is-compact" : ""}`} style={{ background: C.grad, border: `1px solid ${C.border}` }}>
      <div className="zsl-eyebrow" style={{ color: C.dim }}>🔗 אותו שורש · משפחת סדר הגודל</div>
      <div className="zsl-ladder">
        {down && neighbor(down, "÷10")}
        {down && <span className="zsl-arrow" style={{ color: C.dim }} aria-hidden>←</span>}
        <span className="zsl-current" style={{ color: C.gold, borderColor: C.borderStrong, background: C.glow }}>{n}</span>
        <span className="zsl-arrow" style={{ color: C.dim }} aria-hidden>→</span>
        {neighbor(up, "×10")}
      </div>
      {showEssence && !compact && (
        <p className="zsl-essence" style={{ color: C.muted }}>
          האפס מסמן את <b style={{ color: C.dim }}>סדר הגודל</b>, לא את המהות — מספר קטן וגדול הם אותו שורש.
        </p>
      )}
      <style>{`
        .zsl-wrap { border-radius: 16px; padding: 14px 16px 13px; text-align: center; direction: rtl;
          box-shadow: inset 0 1px 0 rgba(246,226,122,0.05); }
        .zsl-wrap.is-compact { padding: 9px 11px; border-radius: 12px; }
        .zsl-eyebrow { font-family: ${F.heading}; font-size: 11.5px; font-weight: 700; letter-spacing: 1.5px; margin-bottom: 12px; }
        .zsl-wrap.is-compact .zsl-eyebrow { font-size: 10.5px; margin-bottom: 8px; }
        .zsl-ladder { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; }
        .zsl-chip { display: inline-flex; flex-direction: column; align-items: center; gap: 1px; text-decoration: none;
          border-radius: 13px; padding: 7px 17px; transition: transform .18s, box-shadow .18s, border-color .18s; }
        .zsl-chip:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(0,0,0,.18); }
        .zsl-chip-num { font-family: ${F.mono}; font-weight: 800; font-size: 18px; line-height: 1; }
        .zsl-chip-tag { font-family: ${F.heading}; font-size: 10.5px; font-weight: 700; }
        .zsl-current { font-family: ${F.mono}; font-weight: 800; font-size: 24px; line-height: 1;
          border: 1px solid; border-radius: 14px; padding: 8px 18px; }
        .zsl-arrow { font-family: ${F.mono}; font-size: 15px; font-weight: 700; opacity: .65; }
        .zsl-essence { font-family: ${F.body}; font-size: 12.5px; line-height: 1.7; max-width: 440px; margin: 12px auto 0; }
        .zsl-wrap.is-compact .zsl-chip { padding: 5px 12px; }
        .zsl-wrap.is-compact .zsl-chip-num { font-size: 15px; }
        .zsl-wrap.is-compact .zsl-current { font-size: 19px; padding: 6px 13px; }
        @media (prefers-reduced-motion: reduce) { .zsl-chip:hover { transform: none; } }
      `}</style>
    </div>
  );
}
