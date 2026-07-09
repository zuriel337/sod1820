import React, { useState, useRef, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { thumb, galThumb } from "../lib/img.js";
import { cleanName } from "../lib/galleryName.js";
import { stripHtml } from "../lib/format.js";
import { domNum, shortDate, streamLabel } from "../lib/reality.js";
import { isNewSince } from "../lib/crossesNew.js";
import { gallerySetFor, gallerySetHref } from "../lib/numberSets.js";

// 🎡 «גלגל הזרם» — הזרם בעמוד הבית כגלגל תלת-מימדי אנכי (בקשת צוריאל):
// תמונה אחת במוקד, הבאות/הקודמות מתרחקות פנימה למעלה/למטה — קטנות, דוהות. מושכים את
// ה«מוט» המוזהב בצד (או גוללים/מחליקים/חצים) כדי לנוע בזמן. לצד התמונה (או מתחתיה
// במובייל) — הפירוט המלא באותיות יפות וגדולות. **אפס חיתוך** (חוק) — יחס טבעי תמיד.
const STEP = 130;          // פיקסלים של גרירה = מעבר תמונה
const VISIBLE = 1.35;      // חלון של שלוש: המוקד + אחת מעל + אחת מתחת (בקשת צוריאל)

export default function StreamWheel({ hints = [], cutoff, onOpen, onEdit, max = 10 }) {
  const items = hints.slice(0, max);
  const n = items.length;
  const [idx, setIdx] = useState(0);
  const [drag, setDrag] = useState(0);           // גרירה חיה (px) — מזיזה את כל הגלגל
  const stageRef = useRef(null);
  const rodRef = useRef(null);
  const gesture = useRef(null);
  const wheelAcc = useRef(0);
  const clamp = useCallback(v => Math.max(0, Math.min(n - 1, v)), [n]);

  // גלגלת עכבר — צעד-צעד עם סף (לא חוטף את גלילת-הדף כשבקצוות)
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = e => {
      const dir = e.deltaY > 0 ? 1 : -1;
      const next = clamp(idx + dir);
      if (next === idx) return;              // בקצה — נותנים לדף לגלול
      e.preventDefault();
      wheelAcc.current += e.deltaY;
      if (Math.abs(wheelAcc.current) > 40) { setIdx(next); wheelAcc.current = 0; }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [idx, clamp]);

  // גרירה על הבמה (מגע/עכבר) — הגלגל זז חי עם האצבע, ובעזיבה ננעל על הקרוב
  const onDown = e => { gesture.current = { y: e.clientY, moved: false }; };
  const onMove = e => {
    if (!gesture.current) return;
    const dy = e.clientY - gesture.current.y;
    if (Math.abs(dy) > 6) gesture.current.moved = true;
    setDrag(dy);
  };
  const onUp = () => {
    if (!gesture.current) return;
    const moved = gesture.current.moved;
    setIdx(i => clamp(Math.round(i - drag / STEP)));
    setDrag(0);
    gesture.current = null;
    return moved;
  };

  // ה«מוט» — גרירת הידית ממפה ישירות לאינדקס (כמו מנוף)
  const rodDrag = e => {
    const el = rodRef.current;
    if (!el || n < 2) return;
    const r = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    setIdx(clamp(Math.round(ratio * (n - 1))));
  };

  if (!n) return null;
  const cur = items[idx];
  const v = domNum(cur);
  const title = cleanName(cur.name);
  const desc = cur.description ? stripHtml(cur.description).trim() : "";
  const fresh = cutoff ? isNewSince(cur, cutoff) : false;
  const p = idx - drag / STEP;   // מיקום רציף בזמן גרירה

  return (
    <div style={{ direction: "rtl" }}>
      <style>{`
        .sw-grid { display:flex; gap:20px; align-items:stretch; }
        .sw-stagewrap { flex:1.35; min-width:0; display:flex; gap:12px; }
        .sw-stage { position:relative; flex:1; min-width:0; height:clamp(320px,48vh,470px);
          perspective:1050px; touch-action:pan-x; cursor:grab; user-select:none; overflow:hidden; }
        .sw-stage:active { cursor:grabbing; }
        .sw-item { position:absolute; top:50%; left:50%; width:min(86%,560px);
          transition:transform .45s cubic-bezier(.2,.7,.3,1), opacity .45s; will-change:transform;
          padding:8px; border-radius:16px; background:linear-gradient(150deg,#241b10,#0f0b07); }
        .sw-stage.dragging .sw-item { transition:none; }
        .sw-item img { display:block; width:100%; max-height:clamp(300px,46vh,470px); object-fit:contain;
          border-radius:2px; margin:0 auto; }
        .sw-item.focus { border:1.5px solid rgba(212,175,55,.6);
          box-shadow:0 26px 60px -18px rgba(0,0,0,.9), 0 0 44px rgba(212,175,55,.14); }
        .sw-item:not(.focus) { border:1px solid rgba(212,175,55,.18); }
        .sw-item:not(.focus) img { filter:brightness(.6); }
        /* ה«מוט» — מסילה + ידית זהב תלת-מימדית */
        .sw-rod { flex:0 0 40px; position:relative; border-radius:999px; cursor:ns-resize;
          background:linear-gradient(180deg, rgba(212,175,55,.35), rgba(58,134,200,.25) 55%, rgba(212,175,55,.15));
          box-shadow:inset 0 0 8px rgba(0,0,0,.6); }
        .sw-knob { position:absolute; left:50%; transform:translate(-50%,-50%); width:52px; height:68px;
          border-radius:12px; background:linear-gradient(150deg,#f6dd92,#c9a227 55%,#8a6410);
          border:1px solid #6b4e10; box-shadow:0 6px 16px rgba(0,0,0,.6), inset 0 1px 2px rgba(255,255,255,.5);
          transition:top .35s cubic-bezier(.2,.7,.3,1); display:flex; align-items:center; justify-content:center;
          color:#3a2a06; font-size:20px; pointer-events:none; }
        .sw-arrows { position:absolute; inset-inline-end:10px; top:50%; transform:translateY(-50%);
          display:flex; flex-direction:column; gap:8px; z-index:6; }
        .sw-arrows button { width:36px; height:36px; border-radius:999px; border:1px solid rgba(212,175,55,.5);
          background:rgba(10,8,5,.7); color:#e8c84a; font-size:15px; cursor:pointer; }
        .sw-arrows button:disabled { opacity:.3; cursor:default; }
        /* שלט-הפירוט — אותיות יפות וגדולות, לצד התמונה (במובייל מתחת) */
        .sw-placard { flex:1; min-width:min(100%,280px); display:flex; flex-direction:column; justify-content:center; }
        .sw-placard-in { background:linear-gradient(150deg, rgba(30,22,10,.96), rgba(14,10,5,.96));
          border:1px solid rgba(212,175,55,.5); border-radius:18px; padding:20px 22px;
          box-shadow:0 26px 60px -18px rgba(0,0,0,.85); animation:sw-in .45s ease both; }
        @keyframes sw-in { from { opacity:0; transform:translateY(8px);} to { opacity:1; transform:none;} }
        .sw-counter { text-align:center; color:#a99a7c; font-family:${F.heading}; font-size:11.5px; margin-top:8px; }
        /* ⤴ מגירת-«עברת» — הרמזים שכבר עברת, קטנים ומסודרים למעלה; לחיצה מחזירה אליהם */
        .sw-tray { display:flex; gap:6px; align-items:center; overflow-x:auto; margin:0 auto 14px;
          background:rgba(10,8,5,.85); border:1px solid rgba(212,175,55,.4); border-radius:999px;
          padding:5px 13px; max-width:min(560px,96%); animation:sw-in .25s ease; }
        .sw-tray-l { color:#a99a7c; font-family:${F.heading}; font-size:10px; font-weight:800; white-space:nowrap; }
        .sw-mini { flex:none; width:34px; height:34px; border-radius:8px; overflow:hidden;
          border:1px solid rgba(212,175,55,.45); padding:0; cursor:pointer; background:#0a0710; }
        .sw-mini img { width:100%; height:100%; object-fit:cover; display:block; }
        .sw-mini:hover { border-color:#e8c84a; }
        @media (max-width:820px) {
          .sw-grid { flex-direction:column; }
          .sw-stage { height:clamp(280px,44vh,420px); }
        }
      `}</style>

      {/* ⤴ «עברת (N)» — כל מה שמעל המוקד בגלגל, ממוזער ומסודר למעלה. לחיצה = קפיצה חזרה */}
      {idx > 0 && (
        <div className="sw-tray">
          <span className="sw-tray-l">⤴ עברת ({idx})</span>
          {items.slice(0, idx).map((h, i) => (
            <button key={h.id} className="sw-mini" title={cleanName(h.name) || String(domNum(h) || "")}
              onClick={() => setIdx(i)}>
              <img src={galThumb(h, 360)} alt="" />
            </button>
          ))}
        </div>
      )}

      <div className="sw-grid">
        {/* הבמה התלת-מימדית + המוט */}
        <div className="sw-stagewrap">
          <div className="sw-rod" ref={rodRef}
            onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); rodDrag(e); }}
            onPointerMove={e => { if (e.buttons) rodDrag(e); }}
            title="משכו את המוט למעלה/למטה כדי לנוע בזרם">
            <div className="sw-knob" style={{ top: `${n > 1 ? (idx / (n - 1)) * 100 : 50}%` }}>⇕</div>
          </div>
          <div ref={stageRef} className={`sw-stage${drag ? " dragging" : ""}`}
            onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); onDown(e); }}
            onPointerMove={onMove}
            onPointerUp={e => { const moved = onUp(e); if (!moved) onOpen?.(idx); }}
            onPointerCancel={() => { gesture.current = null; setDrag(0); }}>
            {items.map((h, i) => {
              const d = i - p;                          // מרחק מהמוקד (רציף בגרירה)
              const ad = Math.abs(d);
              if (ad > VISIBLE + 0.7) return null;
              return (
                <div key={h.id} className={`sw-item${i === idx ? " focus" : ""}`} style={{
                  transform: `translate(-50%,-50%) translateY(${d * STEP * 0.92}px) translateZ(${-ad * 190}px) rotateX(${-d * 14}deg) scale(${Math.max(0.5, 1 - ad * 0.2)})`,
                  opacity: Math.max(0, 1 - ad * 0.52),
                  zIndex: 50 - Math.round(ad * 10),
                }}>
                  <img src={thumb(h.image_url, 900)} alt={i === idx ? (title || "") : ""} loading={ad < 1.5 ? "eager" : "lazy"} draggable={false} />
                </div>
              );
            })}
            <div className="sw-arrows">
              <button onClick={e => { e.stopPropagation(); setIdx(clamp(idx - 1)); }} disabled={idx === 0} aria-label="חדש יותר">▲</button>
              <button onClick={e => { e.stopPropagation(); setIdx(clamp(idx + 1)); }} disabled={idx === n - 1} aria-label="ישן יותר">▼</button>
            </div>
          </div>
        </div>

        {/* הפירוט המלא — אותיות גדולות ויפות, לצד/מתחת */}
        <div className="sw-placard">
          <div className="sw-placard-in" key={cur.id}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
              {v != null && (
                <Link to={`/number/${v}`} style={{ background: "rgba(212,175,55,.96)", color: "#1a0e00", fontFamily: F.mono,
                  fontWeight: 900, fontSize: 22, borderRadius: 11, padding: "1px 14px", textDecoration: "none", lineHeight: 1.3 }}>{v}</Link>
              )}
              {fresh && <span style={{ background: "#e0556a", color: "#fff", fontFamily: F.heading, fontSize: 10.5, fontWeight: 800, borderRadius: 999, padding: "3px 10px" }}>🆕 נוסף {streamLabel(cur) || "עכשיו"}</span>}
              {shortDate(cur) && <span style={{ color: "#a99a7c", fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>🗓 {shortDate(cur)}</span>}
            </div>
            {title && <div style={{ color: "#f6e27a", fontFamily: F.regal, fontSize: "clamp(19px,2.6vw,25px)", fontWeight: 800, lineHeight: 1.5, marginBottom: 10 }}>{title}</div>}
            {desc
              ? <div style={{ color: "#e2d5b2", fontFamily: F.body, fontSize: 16.5, lineHeight: 2.05, whiteSpace: "pre-wrap", maxHeight: "38vh", overflowY: "auto" }}>{desc}</div>
              : <div style={{ color: "#8f8266", fontFamily: F.body, fontSize: 13.5, fontStyle: "italic" }}>אין תיאור לרמז הזה עדיין.</div>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 14 }}>
              {v != null && (
                <Link to={gallerySetHref(v)} style={{ display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none", color: "#e8c84a",
                  background: "linear-gradient(150deg, rgba(35,26,10,.95), rgba(14,10,5,.95))", border: "1px solid rgba(212,175,55,.55)",
                  borderRadius: 10, padding: "6px 14px", fontFamily: F.heading, fontSize: 12, fontWeight: 800,
                  transform: "perspective(300px) rotateY(-7deg)", animation: "sw-in .5s ease both" }}>
                  🖼 כל {gallerySetFor(v).join("+")} בגלריה ←
                </Link>
              )}
              <button onClick={() => onOpen?.(idx)} style={{ cursor: "zoom-in", background: "none", border: "1px solid rgba(212,175,55,.4)",
                color: "#d8c89a", borderRadius: 999, fontFamily: F.heading, fontSize: 12, fontWeight: 700, padding: "6px 14px" }}>⛶ הגדל</button>
              {onEdit && (
                <button onClick={() => onEdit(cur)} style={{ cursor: "pointer", background: "none", border: "1px solid rgba(212,175,55,.4)",
                  color: "#d8c89a", borderRadius: 999, fontFamily: F.heading, fontSize: 12, fontWeight: 700, padding: "6px 14px" }}>✏️ ערוך</button>
              )}
            </div>
          </div>
          <div className="sw-counter">{idx + 1} / {n} · משכו את המוט, החליקו או גללו — לנוע בזמן ⇕</div>
        </div>
      </div>
    </div>
  );
}
