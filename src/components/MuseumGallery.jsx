import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { cleanName } from "../lib/galleryName.js";
import { stripHtml } from "../lib/format.js";
import { domNum, shortDate } from "../lib/reality.js";

// 👑 גלריות המוזיאון — חוק: **לעולם לא חותכים תמונה** (object-fit: contain / יחס טבעי בלבד).
// הטקסט שבתוך התמונה הוא חצי מהרמז — חיתוך = איבוד הרמז.
//   • MuseumGallery (ברירת-מחדל) — «שער המניפה»: Hero ענק ביחס מלא + כרטיס-תיאור תלת-מימדי צף
//     בצד (גדול, כמו שלט-מוזיאון) + «מניפה» של השאר ברוחבים יורדים. ה-Hero חי — מתחלף כל 15ש'.
//   • CascadeContain — «מפל ללא-חיתוך»: Hero מלא עם התיאור, והשאר משתלשלות פנימה בתלת-מימד,
//     כל אחת ביחס הטבעי שלה, בגודל יחסי לראשונה.

const heDate = h => shortDate(h) || "";

// כרטיס-התיאור («שלט המוזיאון») — תלת-מימדי, גדול, צף בצד ה-Hero (במובייל יורד מתחת)
function Placard({ h, side = "start" }) {
  const title = cleanName(h.name);
  const desc = h.description ? stripHtml(h.description).trim() : "";
  const v = domNum(h);
  const date = heDate(h);
  if (!title && !desc) return null;
  return (
    <div className={`mgal-placard ${side}`}>
      <div className="mgal-placard-in">
        {v != null && (
          <Link to={`/number/${v}`} className="mgal-pnum">{v}</Link>
        )}
        {title && <div className="mgal-ptitle">{title}</div>}
        {desc && <div className="mgal-pdesc">{desc}</div>}
        {date && <div className="mgal-pdate">🗓 {date}</div>}
      </div>
    </div>
  );
}

const CSS = `
  .mgal { direction: rtl; }
  /* ── במת ה-Hero: תמונה ביחס מלא + שלט צף ── */
  .mgal-stage { display:flex; gap:0; align-items:center; justify-content:center; flex-wrap:wrap; margin-bottom:30px; perspective:1100px; }
  .mgal-heroBox { position:relative; flex:1.6; min-width:min(100%,340px); display:flex; justify-content:center; }
  .mgal-hero { position:relative; display:inline-block; cursor:zoom-in; animation: mgal-fade .8s ease both; }
  .mgal-hero img { display:block; max-width:100%; max-height:70vh; width:auto; height:auto; border-radius:16px;
    border:1.5px solid rgba(212,175,55,.55); box-shadow:0 30px 70px -20px rgba(0,0,0,.9), 0 0 50px rgba(212,175,55,.13); }
  @keyframes mgal-fade { from { opacity:0; transform:scale(.985);} to { opacity:1; transform:none;} }
  .mgal-heroNum { position:absolute; top:12px; inset-inline-start:12px; z-index:2; background:rgba(212,175,55,.96); color:#1a0e00;
    font-family:'Courier New',monospace; font-weight:900; font-size:clamp(22px,3.4vw,36px); border-radius:12px; padding:2px 15px;
    text-decoration:none; line-height:1.15; box-shadow:0 4px 18px rgba(0,0,0,.5); }
  .mgal-edit { position:absolute; bottom:10px; inset-inline-end:10px; z-index:3; background:rgba(0,0,0,.55); color:#fff;
    border:1px solid rgba(255,255,255,.3); border-radius:999px; width:28px; height:28px; font-size:13px; cursor:pointer;
    display:flex; align-items:center; justify-content:center; }
  /* שלט-המוזיאון — צף בצד, מוטה בתלת-מימד, גדול */
  .mgal-placard { flex:1; min-width:min(100%,270px); max-width:430px; z-index:3; animation: mgal-fade .9s ease both; }
  .mgal-placard.start { margin-inline-start:-26px; transform: rotateY(9deg); }
  .mgal-placard.under { margin:14px auto 0; transform:none; max-width:640px; }
  .mgal-placard-in { background:linear-gradient(150deg, rgba(30,22,10,.97), rgba(14,10,5,.97)); border:1px solid rgba(212,175,55,.5);
    border-radius:16px; padding:18px 20px; box-shadow:0 26px 60px -18px rgba(0,0,0,.85), 0 0 34px rgba(212,175,55,.08); }
  .mgal-pnum { display:inline-block; background:rgba(212,175,55,.16); border:1px solid rgba(212,175,55,.5); color:#e8c84a;
    font-family:'Courier New',monospace; font-weight:900; font-size:17px; border-radius:999px; padding:1px 13px;
    text-decoration:none; margin-bottom:9px; }
  .mgal-ptitle { color:#f3e6c0; font-family:${F.regal}; font-size:clamp(16px,2.4vw,20px); font-weight:800; line-height:1.45; margin-bottom:8px; }
  .mgal-pdesc { color:#d9cba6; font-family:${F.body}; font-size:14.5px; line-height:1.95; white-space:pre-wrap;
    max-height:44vh; overflow-y:auto; }
  .mgal-pdate { color:#a99a7c; font-family:${F.heading}; font-size:11.5px; margin-top:10px; }
  @media (max-width:760px) {
    .mgal-placard.start { margin-inline-start:0; transform:none; margin-top:14px; max-width:100%; }
    .mgal-hero img { max-height:56vh; }
  }
  /* ── המניפה — רוחב יורד, יחס טבעי, הטיה וצל (בלי חיתוך) ── */
  .mgal-fan { display:flex; flex-wrap:wrap; gap:16px; justify-content:center; align-items:flex-start; }
  .mgal-f { position:relative; cursor:zoom-in; transition:transform .2s; }
  .mgal-f:hover { transform:translateY(-5px) rotate(0deg) !important; z-index:9; }
  .mgal-f img { display:block; width:100%; height:auto; border-radius:12px; border:1px solid rgba(212,175,55,.25);
    box-shadow:0 16px 36px -14px rgba(0,0,0,.8); }
  .mgal-fnum { position:absolute; top:7px; inset-inline-start:7px; background:rgba(212,175,55,.94); color:#1a0e00;
    font-family:'Courier New',monospace; font-weight:800; font-size:12px; border-radius:8px; padding:1px 8px; text-decoration:none; }
  /* ── מפל ללא-חיתוך ── */
  .mgc { direction:rtl; display:flex; gap:18px; align-items:flex-start; flex-wrap:wrap; }
  .mgc-main { flex:1.7; min-width:min(100%,320px); }
  .mgc-main .mgal-hero { display:block; text-align:center; }
  .mgc-side { flex:1; min-width:min(100%,220px); perspective:900px; display:flex; flex-direction:column; gap:12px; }
  .mgc-item { position:relative; cursor:zoom-in; transform-style:preserve-3d; transition:transform .3s, opacity .3s; }
  .mgc-item:hover { transform:none !important; opacity:1 !important; z-index:5; }
  .mgc-item img { display:block; width:100%; height:auto; border-radius:12px; box-shadow:0 14px 34px -14px rgba(0,0,0,.8); }
`;

// ═══ שער המניפה (ברירת-מחדל) ═══
export default function MuseumGallery({ hints = [], onOpen, onEdit, live = true }) {
  const [heroIdx, setHeroIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = hints.length;

  // ה-Hero החי — כל 15 שניות האוצר הבא עולה לבמה (עוצר בריחוף/מגע)
  useEffect(() => {
    if (!live || n < 2 || paused) return;
    const id = setInterval(() => setHeroIdx(i => (i + 1) % n), 15000);
    return () => clearInterval(id);
  }, [live, n, paused]);
  useEffect(() => { if (heroIdx >= n && n > 0) setHeroIdx(0); }, [n, heroIdx]);

  if (!n) return null;
  const hero = hints[heroIdx];
  const v = domNum(hero);
  const rest = hints.filter((_, i) => i !== heroIdx);
  const widths = [46, 38, 32, 27, 23, 20, 18, 16];   // הרוחב יורד — הגובה נגזר מהיחס (בלי חיתוך)

  return (
    <div className="mgal" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onTouchStart={() => setPaused(true)}>
      <style>{CSS}</style>
      {/* הבמה: תמונה ביחס מלא + שלט-מוזיאון תלת-מימדי צף בצד (במובייל יורד מתחת) */}
      <div className="mgal-stage">
        <div className="mgal-heroBox">
          <div className="mgal-hero" key={hero.id} onClick={() => onOpen?.(heroIdx)}>
            <img src={hero.image_url} alt={cleanName(hero.name) || ""} />
            {v != null && <Link to={`/number/${v}`} className="mgal-heroNum" onClick={e => e.stopPropagation()}>{v}</Link>}
            {onEdit && <button className="mgal-edit" title="ערוך" onClick={e => { e.stopPropagation(); onEdit(hero); }}>✏️</button>}
          </div>
        </div>
        <Placard key={"p" + hero.id} h={hero} side="start" />
      </div>

      {/* המניפה — כל השאר, רוחב יורד, הטיה עדינה, אף אחת לא נחתכת */}
      {rest.length > 0 && (
        <div className="mgal-fan">
          {rest.map((h, i) => {
            const w = widths[i] || 15;
            const rv = domNum(h);
            const origIdx = hints.indexOf(h);
            return (
              <div key={h.id} className="mgal-f" onClick={() => onOpen?.(origIdx)}
                style={{ width: `${w}%`, minWidth: 110, transform: `rotate(${i % 2 ? 1.6 : -1.6}deg) translateY(${(i % 3) * 6}px)`, zIndex: 8 - i }}>
                <img src={h.image_url} alt="" loading="lazy" />
                {rv != null && <Link to={`/number/${rv}`} className="mgal-fnum" onClick={e => e.stopPropagation()}>{rv}</Link>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══ מפל ללא-חיתוך — Hero מלא עם התיאור, השאר משתלשלות פנימה בגודל יחסי ═══
export function CascadeContain({ hints = [], onOpen, onEdit }) {
  if (!hints.length) return null;
  const hero = hints[0];
  const v = domNum(hero);
  const rest = hints.slice(1, 5);
  // מדרגות: רוחב יורד + סיבוב/עומק גדלים — «משתלשל פנימה», הגובה טבעי (בלי חיתוך)
  const steps = [
    { w: "94%", rot: -13, z: 24,  op: 1 },
    { w: "82%", rot: -19, z: 0,   op: .88 },
    { w: "70%", rot: -24, z: -26, op: .66 },
    { w: "58%", rot: -28, z: -52, op: .45 },
  ];
  return (
    <div className="mgc">
      <style>{CSS}</style>
      <div className="mgc-main">
        <div className="mgal-hero" onClick={() => onOpen?.(0)} style={{ cursor: "zoom-in" }}>
          <img src={hero.image_url} alt={cleanName(hero.name) || ""} style={{ margin: "0 auto" }} />
          {v != null && <Link to={`/number/${v}`} className="mgal-heroNum" onClick={e => e.stopPropagation()}>{v}</Link>}
          {onEdit && <button className="mgal-edit" title="ערוך" onClick={e => { e.stopPropagation(); onEdit(hero); }}>✏️</button>}
        </div>
        <Placard h={hero} side="under" />
      </div>
      {rest.length > 0 && (
        <div className="mgc-side">
          {rest.map((h, i) => {
            const s = steps[i] || steps[steps.length - 1];
            const rv = domNum(h);
            return (
              <div key={h.id} className="mgc-item" onClick={() => onOpen?.(i + 1)}
                style={{ width: s.w, marginInlineStart: `${i * 7}%`, opacity: s.op,
                  transform: `rotateY(${s.rot}deg) translateZ(${s.z}px)` }}>
                <img src={h.image_url} alt="" loading="lazy" style={{ border: "1px solid rgba(212,175,55,.3)" }} />
                {rv != null && i < 2 && <Link to={`/number/${rv}`} className="mgal-fnum" onClick={e => e.stopPropagation()}>{rv}</Link>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
