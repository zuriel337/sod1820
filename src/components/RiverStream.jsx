import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { thumb } from "../lib/img.js";
import { cleanName } from "../lib/galleryName.js";
import { stripHtml } from "../lib/format.js";
import { domNum, shortDate, streamLabel, effDate } from "../lib/reality.js";
import { isNewSince } from "../lib/crossesNew.js";
import { getHotNumbers } from "../lib/supabase.js";
import { gallerySetFor, gallerySetHref } from "../lib/numberSets.js";
import NumberBubbles from "./NumberBubbles.jsx";

// 🌊 «נהר הזרם» — זרם המציאות כנהר (בחירת צוריאל):
// קו-זרם מוזהב יורד במרכז · תמונות-לאורך עוגנות בו לסירוגין ימין/שמאל · תמונה מאוזנת = «גשר»
// שחוצה את הנהר · טיפות-זמן (היום/אתמול/השבוע) · **אפס חיתוך** (חוק — הגובה תמיד טבעי).
// היסטוריה: יורדים במורד הנהר — הרמזים שעברת מתכווצים ל«מגירת-זיכרון» דביקה למעלה (לחיצה
// מחזירה אליהם); גוללים חזרה מעלה — הם חוזרים לגדול. עד 20 רמזים; השאר → הגלריות.

const MAX_RIVER = 20;

function dayBucket(h, now = Date.now()) {
  const d = effDate(h);
  if (!d) return null;
  const days = Math.floor((now - d) / 864e5);
  if (days <= 0) return "היום";
  if (days === 1) return "אתמול";
  if (days <= 7) return "השבוע";
  if (days <= 31) return "החודש";
  return "מוקדם יותר";
}

export default function RiverStream({ hints = [], cutoff, palette: P, onOpen, onEdit, max = MAX_RIVER, windowed = false }) {
  const list = hints.slice(0, Math.min(max, MAX_RIVER));
  const [ratios, setRatios] = useState({});     // id → w/h (לזיהוי «גשר» מאוזן)
  const [passed, setPassed] = useState([]);     // רמזים שגללת מעבר להם — מוצגים במגירה למעלה
  const refs = useRef({});
  // 🕹 מצב-חלון (הבית): הנהר רץ בתוך אשנב שמראה ~3 בכל רגע + מוט-ענק שגולל אותו
  const viewRef = useRef(null);
  const rodRef = useRef(null);
  const [rodRatio, setRodRatio] = useState(0);
  const [activeId, setActiveId] = useState(null);   // הרמז שמול העין — ההסבר שלו מוצג בבועה שליד המוט
  const onViewScroll = () => {
    const el = viewRef.current;
    if (!el) return;
    setRodRatio(el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight));
    // הרמז הפעיל = הראשון שעדיין נראה ברצועה העליונה של האשנב
    const vr = el.getBoundingClientRect();
    const band = vr.top + Math.min(220, vr.height * 0.3);
    for (const h of list) {
      const r = refs.current[h.id]?.getBoundingClientRect();
      if (r && r.bottom > band) { setActiveId(h.id); break; }
    }
  };
  const rodDrag = e => {
    const rod = rodRef.current, el = viewRef.current;
    if (!rod || !el) return;
    const r = rod.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    el.scrollTop = t * (el.scrollHeight - el.clientHeight);
  };
  const overflow = hints.length - list.length;

  // 🔥 המספרים החמים באתר — לפי מפת-החום האמיתית (search_log), בקצה הנהר
  const [hot, setHot] = useState([]);
  useEffect(() => {
    if (windowed) return;   // בבית הבועות לא מוצגות — אין צורך בשאילתה
    let live = true;
    getHotNumbers(7, 10).then(h => { if (live) setHot(h || []); }).catch(() => {});
    return () => { live = false; };
  }, [windowed]);

  // 🚿 חימום-קאש עדין: אחרי שהדף נרגע, טוען ברקע את שאר תמונות הנהר (עד 20, גודל-תצוגה בלבד)
  // → משיכת-מוט חדה תמיד פוגשת תמונה מוכנה, בלי "קפיצות". לא נוגע בגלריות הגדולות (שם lazy).
  useEffect(() => {
    const idle = window.requestIdleCallback || (fn => setTimeout(fn, 900));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const id = idle(() => {
      hints.slice(3, Math.min(max, MAX_RIVER)).forEach(h => {
        if (h.image_url) { const im = new Image(); im.decoding = "async"; im.src = thumb(h.image_url, 900); }
      });
    });
    return () => cancel(id);
  }, [hints, max]);

  const onImgLoad = useCallback((id, e) => {
    const im = e.target;
    if (im.naturalWidth && im.naturalHeight) setRatios(r => ({ ...r, [id]: im.naturalWidth / im.naturalHeight }));
  }, []);

  // מגירת-ההיסטוריה: כרטיס שיצא מלמעלה נכנס למגירה; חוזרים מעלה — יוצא ממנה (הפיך)
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(entries => {
      setPassed(prev => {
        let next = [...prev];
        for (const en of entries) {
          const id = en.target.dataset.hid;
          const topEdge = (en.rootBounds?.top ?? 0) + 90;
          const above = !en.isIntersecting && en.boundingClientRect.bottom < topEdge + 40;
          if (above && !next.includes(id)) next.push(id);
          if (en.isIntersecting && next.includes(id)) next = next.filter(x => x !== id);
        }
        return next;
      });
    }, { root: windowed ? viewRef.current : null, rootMargin: "-70px 0px 0px 0px", threshold: 0 });
    Object.values(refs.current).forEach(el => el && io.observe(el));
    return () => io.disconnect();
  }, [list.length, windowed]);

  if (!list.length) return null;
  const gold = "rgba(232,200,74,";
  const passedHints = passed.map(id => list.find(h => h.id === id)).filter(Boolean);
  let lastBucket = null;

  return (
    <div style={{ direction: "rtl" }}>
      <style>{`
        .rv { position:relative; padding:6px 0 10px; }
        .rv::before { content:""; position:absolute; top:0; bottom:0; right:50%; width:3px; transform:translateX(50%);
          background:linear-gradient(180deg, ${gold}1), rgba(58,134,200,.65) 45%, ${gold}.45) 80%, transparent);
          box-shadow:0 0 14px ${gold}.3); border-radius:99px; }
        .rv-drop { position:relative; z-index:3; width:fit-content; margin:0 auto 16px; background:#0f0b1a;
          border:1px solid ${gold}.5); color:#e8c84a; font-family:${F.heading}; font-size:11px; font-weight:800;
          border-radius:999px; padding:3px 14px; box-shadow:0 0 12px ${gold}.22); }
        /* רמז = שורה מלאה: תמונה בצד אחד של הנהר, הטקסט המלא בצד השני — לסירוגין (בקשת צוריאל) */
        .rv-hint { position:relative; width:96%; margin:0 auto 30px; display:flex; gap:6%; align-items:flex-start; z-index:1; cursor:zoom-in; }
        .rv-hint.l { flex-direction:row-reverse; }
        .rv-hint .rv-frame { flex:0 0 45%; min-width:0; }
        .rv-hint.r .rv-frame { transform:rotate(-1.2deg); }
        .rv-hint.l .rv-frame { transform:rotate(1.2deg); }
        /* «פספרטו» — העיגול/מסגרת על המעטפת (עם שוליים); פינות התמונה עצמה כמעט ישרות = אפס חיתוך */
        .rv-frame { display:block; position:relative; padding:8px; border-radius:16px;
          background:linear-gradient(150deg,#241b10,#0f0b07); border:1px solid ${gold}.3);
          box-shadow:0 18px 44px -16px rgba(0,0,0,.85); }
        .rv-frame img { display:block; width:100%; height:auto; border-radius:2px; }
        .rv-bridge { position:relative; z-index:2; width:88%; margin:0 auto 28px; transform:rotate(-.5deg); cursor:zoom-in; }
        .rv-bridge .rv-frame { border-width:1.5px; border-color:${gold}.5);
          box-shadow:0 24px 60px -18px rgba(0,0,0,.9), 0 0 34px ${gold}.1); }
        /* z-index:3 — התגית מעל המסגרת (ה-frame הוא position:relative ומאוחר יותר ב-DOM, בלעדיו הוא מכסה אותה) */
        .rv-bridge .rv-btag { position:absolute; top:-10px; right:18px; z-index:3; background:#0f0b1a; border:1px solid ${gold}.5);
          color:#e8c84a; font-family:${F.heading}; font-size:10.5px; font-weight:800; border-radius:999px; padding:2px 12px; }
        /* המספר ליד התמונה — לא עליה (חוק: לא חוסמים את התוכן שבתמונה) */
        .rv-num { display:inline-block; background:${gold}.96); color:#1a0e00;
          font-family:${F.mono}; font-weight:900; font-size:13.5px; border-radius:9px; padding:1px 10px;
          text-decoration:none; box-shadow:0 2px 10px rgba(0,0,0,.4); }
        .rv-added { display:inline-block; background:rgba(224,85,106,.95); color:#fff;
          font-family:${F.heading}; font-size:9px; font-weight:800; border-radius:999px; padding:2px 8px; }
        .rv-cap { flex:1; min-width:0; margin-top:4px; color:${P?.ink || "#efe6d2"}; font-family:${F.body}; font-size:14px; font-weight:700; line-height:1.55;
          display:flex; flex-wrap:wrap; align-content:flex-start; align-items:center; gap:7px; }
        .rv-cap .rv-t { font-family:${F.regal}; font-size:16.5px; }
        .rv-cap .rv-t span { display:block; color:${P?.inkSoft || "#a99a7c"}; font-family:${F.body}; font-size:11.5px; font-weight:400; margin-top:2px; }
        /* התיאור המלא של הרמז — אותיות גדולות ויפות (חצי מהרמז הוא הטקסט) */
        .rv-desc { width:100%; color:#e6d9b8; font-family:${F.body}; font-size:15px; font-weight:400; line-height:1.95;
          white-space:pre-wrap; }
        /* 🖼 שער-הסט — קישור תלת-מימדי מהבהב לגלריה המסוננת (סטטי, אפס-עומס על השרת) */
        .rv-gal { display:inline-flex; align-items:center; gap:5px; text-decoration:none; color:#e8c84a;
          background:linear-gradient(150deg, rgba(35,26,10,.95), rgba(14,10,5,.95)); border:1px solid ${gold}.55);
          border-radius:10px; padding:4px 11px; font-family:${F.heading}; font-size:10.5px; font-weight:800;
          transform:perspective(300px) rotateY(-7deg); transform-origin:right center;
          animation: rv-glow 2.2s ease-in-out infinite; transition:transform .18s; }
        .rv-gal:hover { transform:perspective(300px) rotateY(0deg) scale(1.05); }
        @keyframes rv-glow { 0%,100% { box-shadow:0 0 6px ${gold}.15); } 50% { box-shadow:0 0 16px ${gold}.5); } }
        .rv-edit { position:absolute; bottom:8px; inset-inline-end:8px; z-index:3; background:rgba(0,0,0,.55); color:#fff;
          border:none; border-radius:999px; width:24px; height:24px; font-size:11px; cursor:pointer;
          display:flex; align-items:center; justify-content:center; }
        /* מגירת-ההיסטוריה — מה שעברת מתכווץ לרצועה דביקה למעלה; לחיצה מחזירה */
        .rv-tray { position:sticky; top:66px; z-index:40; display:flex; gap:6px; align-items:center; overflow-x:auto;
          background:rgba(10,8,16,.92); backdrop-filter:blur(6px); border:1px solid ${gold}.35); border-radius:999px;
          padding:5px 12px; margin:0 auto 16px; max-width:min(560px,94%); animation: rv-in .25s ease; }
        @keyframes rv-in { from { opacity:0; transform:translateY(-6px);} to { opacity:1; transform:none;} }
        .rv-tray-l { color:#a99a7c; font-family:${F.heading}; font-size:10px; font-weight:800; white-space:nowrap; }
        .rv-mini { flex:none; width:34px; height:34px; border-radius:8px; overflow:hidden; border:1px solid ${gold}.4);
          padding:0; cursor:pointer; background:#0a0710; }
        .rv-mini img { width:100%; height:100%; object-fit:cover; display:block; }
        @media (max-width:560px) {
          .rv-hint { gap:4.5%; }
          .rv-hint .rv-frame { flex:0 0 48%; }
          .rv-cap { font-size:12.5px; }
          .rv-cap .rv-t { font-size:14px; }
          .rv-desc { font-size:13px; line-height:1.8; }
          .rv-tray { top:58px; } }
        /* 🕹 מצב-חלון (הבית): אשנב גדול — רמז שלם נראה בלי לגלול את המסך, ה-2 האחרונים נכנסים יחד;
           ההסבר של הרמז שמול העין חי ב«בועת-מוזיאון» ליד המוט (פורמט אוצרות-הגילוי) */
        .rvw { position:relative; }
        .rvw-view { flex:1; min-width:0; height:clamp(680px,88vh,1060px); overflow-y:auto; overscroll-behavior:contain; scrollbar-width:none; }
        .rvw-view::-webkit-scrollbar { display:none; }
        .rvw .rv-tray { top:8px; }
        /* התמונה קטנה וממורכזת — הגובה מוגבל כך שנכנסות שתיים שלמות באשנב */
        .rvw .rv-hint, .rvw .rv-hint.l, .rvw .rv-hint.r { width:94%; margin:0 auto 16px; display:block; transform:none; text-align:center; }
        .rvw .rv-frame { display:inline-block; max-width:100%; }
        .rvw .rv-frame img { max-height:36vh; width:auto; max-width:100%; margin:0 auto; }
        /* הכיתוב = גוש קומפקטי: כותרת+תאריך בשורה מלאה ממורכזת, ושני הצ'יפים יחד בשורה אחת מתחת.
           רקע כהה לכל הגוש — שלא יתנגש ויזואלית עם המוט/הנהר (בקשת צוריאל) */
        .rvw .rv-cap { justify-content:center; font-size:13.5px; margin-top:8px; gap:6px 8px;
          position:relative; z-index:2; background:rgba(10,8,14,.85); border:1px solid rgba(232,200,74,.18);
          border-radius:14px; padding:10px 14px; }
        .rvw .rv-cap .rv-t { order:1; flex:1 1 100%; }
        .rvw .rv-cap .rv-t span { margin-top:2px; }
        .rvw .rv-num { order:2; }
        .rvw .rv-gal { order:3; }
        .rvw .rv-desc { display:none; }   /* ההסבר עבר לבועה שליד המוט */
        .rvw .rv-hint::after { display:none; }
        .rvw .rv-bridge { width:94%; text-align:center; }
        .rvw-rod { flex:0 0 40px; position:relative; border-radius:999px; cursor:ns-resize; touch-action:none;
          background:linear-gradient(180deg, ${gold}.35), rgba(58,134,200,.25) 55%, ${gold}.15));
          box-shadow:inset 0 0 8px rgba(0,0,0,.6); }
        .rvw-knob { position:absolute; left:50%; transform:translate(-50%,-50%); width:52px; height:68px; z-index:2;
          border-radius:12px; background:linear-gradient(150deg,#f6dd92,#c9a227 55%,#8a6410);
          border:1px solid #6b4e10; box-shadow:0 6px 16px rgba(0,0,0,.6), inset 0 1px 2px rgba(255,255,255,.5);
          display:flex; align-items:center; justify-content:center; color:#3a2a06; font-size:20px; pointer-events:none;
          transition:top .15s linear; }
        /* 💬 בועת-המוזיאון — ההסבר המלא של הרמז הפעיל, בפורמט השלט של אוצרות-הגילוי, צמודה למוט */
        .rvw-side { flex:0 0 min(320px,30%); min-width:0; }
        .rvw-bubble { position:relative; background:linear-gradient(150deg, rgba(30,22,10,.97), rgba(14,10,5,.97));
          border:1px solid rgba(212,175,55,.5); border-radius:16px; padding:16px 18px;
          box-shadow:0 26px 60px -18px rgba(0,0,0,.85), 0 0 34px rgba(212,175,55,.08);
          animation: rvb-in .35s ease both; }
        .rvw-bubble::after { content:""; position:absolute; top:30px; inset-inline-start:-16px;
          border:8px solid transparent; border-inline-end-color:rgba(212,175,55,.5); }
        @keyframes rvb-in { from { opacity:0; transform:translateY(6px);} to { opacity:1; transform:none;} }
        .rvb-num { display:inline-block; background:rgba(212,175,55,.16); border:1px solid rgba(212,175,55,.5); color:#e8c84a;
          font-family:${F.mono}; font-weight:900; font-size:17px; border-radius:999px; padding:1px 13px;
          text-decoration:none; margin-bottom:9px; }
        .rvb-title { color:#f3e6c0; font-family:${F.regal}; font-size:clamp(16px,2vw,19px); font-weight:800; line-height:1.5; margin-bottom:8px; }
        .rvb-desc { color:#d9cba6; font-family:${F.body}; font-size:14.5px; line-height:1.95; white-space:pre-wrap;
          max-height:52vh; overflow-y:auto; }
        .rvb-date { color:#a99a7c; font-family:${F.heading}; font-size:11.5px; margin-top:10px; }
        @media (max-width:760px) {
          /* מובייל: תיבת-ההסבר (החשובה ביותר) עוברת למעלה — רצועה מלאה מעל המוט והזרם.
             המוט עובר לצד שמאל — שלא יוסתר מאחורי הכפתורים הצפים (שתפו/מחשבון) שבצד ימין. */
          .rvw { flex-wrap:wrap; }
          .rvw-side { flex:1 1 100%; order:-1; }
          .rvw-rod { order:3; }
          .rvw-view { padding-inline:8px; }
          .rvw-bubble::after { display:none; }
          .rvb-desc { max-height:26vh; font-size:14px; }
          .rvb-title { font-size:16px; }
          .rvw .rv-frame img { max-height:44vh; }
          .rvw-view { height:clamp(560px,80vh,880px); } }
      `}</style>

      {/* 🕹 מצב-חלון (הבית): מוט-ענק + אשנב פנימי; במצב רגיל — העטיפות שקופות */}
      <div className={windowed ? "rvw" : undefined} style={windowed ? { display: "flex", gap: 14 } : undefined}>
        {windowed && (
          <div className="rvw-rod" ref={rodRef}
            onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); rodDrag(e); }}
            onPointerMove={e => { if (e.buttons) rodDrag(e); }}
            title="משכו את המוט למעלה/למטה — לנוע בנהר">
            <div className="rvw-knob" style={{ top: `${8 + rodRatio * 84}%` }}>⇕</div>
          </div>
        )}
        {/* 💬 בועת-המוזיאון ליד המוט — ההסבר המלא של הרמז שמול העין (מתעדכן עם הגלילה/המוט) */}
        {windowed && (() => {
          const a = list.find(h => h.id === activeId) || list[0];
          if (!a) return null;
          const bT = cleanName(a.name);
          const bD = a.description ? stripHtml(a.description).trim() : "";
          const bV = domNum(a);
          const bDate = shortDate(a);
          if (!bT && !bD && bV == null) return null;
          return (
            <div className="rvw-side">
              <div className="rvw-bubble" key={a.id}>
                {bV != null && <Link className="rvb-num" to={`/number/${bV}`}>{bV}</Link>}
                {bT && <div className="rvb-title">{bT}</div>}
                {bD && <div className="rvb-desc">{bD}</div>}
                {bDate && <div className="rvb-date">🗓 {bDate}</div>}
              </div>
            </div>
          );
        })()}
        <div className={windowed ? "rvw-view" : undefined} ref={viewRef} onScroll={windowed ? onViewScroll : undefined}>

      {/* מגירת-הזיכרון — הרמזים שכבר עברת (קטנים, מסודרים למעלה). לחיצה = חזרה אליהם */}
      {passedHints.length > 0 && (
        <div className="rv-tray">
          <span className="rv-tray-l">⤴ עברת ({passedHints.length})</span>
          {passedHints.map(h => (
            <button key={h.id} className="rv-mini" title={cleanName(h.name) || String(domNum(h) || "")}
              onClick={() => refs.current[h.id]?.scrollIntoView({ behavior: "smooth", block: "center" })}>
              <img src={thumb(h.image_url, 360)} alt="" />
            </button>
          ))}
        </div>
      )}

      <div className="rv">
        {list.map((h, i) => {
          const bucket = dayBucket(h);
          const showDrop = bucket && bucket !== lastBucket;
          lastBucket = bucket || lastBucket;
          const v = domNum(h);
          const title = cleanName(h.name);
          const desc = h.description ? stripHtml(h.description).trim() : "";
          const added = streamLabel(h);
          const fresh = cutoff ? isNewSince(h, cutoff) : false;
          const isBridge = (ratios[h.id] || 0) > 1.25;    // מאוזנת → «גשר» חוצה-נהר
          // התמונה נקייה לגמרי (בלי שכבות שחוסמות תוכן); המספר/התגיות — בכיתוב שלידה
          const inner = (
            <span className="rv-frame">
              <img src={thumb(h.image_url, 900)} alt={title || ""} loading={i < 3 ? "eager" : "lazy"} onLoad={e => onImgLoad(h.id, e)} />
              {onEdit && <button className="rv-edit" title="ערוך" onClick={e => { e.stopPropagation(); onEdit(h); }}>✏️</button>}
            </span>
          );
          const caption = (
            <div className="rv-cap" onClick={e => e.stopPropagation()}>
              {v != null && <Link className="rv-num" to={`/number/${v}`}>{v}</Link>}
              <span className="rv-t">{title}
                <span>{shortDate(h) ? `🗓 ${shortDate(h)}` : ""}{fresh && added ? ` · 🆕 נוסף ${added}` : ""}</span>
              </span>
              {/* שער-הסט המהבהב — כל 14+45 / כל 358 בגלריה (קישור סטטי, אפס שאילתות) */}
              {v != null && (
                <Link className="rv-gal" to={gallerySetHref(v)} title={`כל התמונות של ${gallerySetFor(v).join("+")} בגלריה`}>
                  🖼 כל {gallerySetFor(v).join("+")} ←
                </Link>
              )}
              {/* התיאור המלא — ליד/מתחת לתמונה, באותיות גדולות ויפות (הטקסט הוא חצי מהרמז) */}
              {desc && <div className="rv-desc">{desc}</div>}
            </div>
          );
          return (
            <React.Fragment key={h.id}>
              {showDrop && <div className="rv-drop">{bucket}</div>}
              {isBridge ? (
                <div className="rv-bridge" data-hid={h.id} ref={el => { refs.current[h.id] = el; }} onClick={() => onOpen?.(i)}>
                  <span className="rv-btag">⟷ רמז רוחבי</span>
                  {inner}
                  {caption}
                </div>
              ) : (
                <div className={`rv-hint ${i % 2 ? "l" : "r"}`} data-hid={h.id} ref={el => { refs.current[h.id] = el; }} onClick={() => onOpen?.(i)}>
                  {inner}
                  {caption}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* קצה הנהר — הפניה לגלריות + המספרים החמים. ⛔ לא בתוך האשנב הנגלל של הבית
          (בקשת צוריאל — בבית יש כבר באנר-ארכיון ומספרים-חמים ב«מה קורה באתר») */}
      {!windowed && (
        <>
          <div style={{ textAlign: "center", margin: "6px 0 26px" }}>
            <Link to="/archive?tab=pool" style={{ display: "inline-block", background: "linear-gradient(135deg,#e9c84a,#9a7818)", color: "#231603",
              textDecoration: "none", fontFamily: F.heading, fontWeight: 800, fontSize: 14, borderRadius: 999, padding: "11px 28px",
              boxShadow: "0 10px 28px -10px rgba(184,144,31,.6)" }}>
              🔎 {overflow > 0 ? `עוד ${overflow.toLocaleString("he")} רמזים בגלריות ←` : "לכל הגלריות ←"}
            </Link>
          </div>

          {/* 🔥 בסוף הנהר — המספרים החמים באתר, לפי מפת-החום האמיתית (חיפושים, 7 ימים) */}
          {hot.length > 0 && (
            <div style={{ border: `1px solid ${P?.borderStrong || "rgba(232,200,74,.35)"}`, borderRadius: 16, background: P?.cardSoft || "rgba(20,15,26,.6)", padding: "15px 16px" }}>
              <NumberBubbles
                data={hot.map(x => ({ label: String(x.n), count: x.count, nums: [x.n] }))}
                title="🔥 המספרים החמים באתר עכשיו — לפי מפת-החום (7 ימים) · לחצו לדף המספר"
                hrefFor={b => `/number/${b.nums[0]}`}
              />
            </div>
          )}
        </>
      )}
        </div>
      </div>
    </div>
  );
}
