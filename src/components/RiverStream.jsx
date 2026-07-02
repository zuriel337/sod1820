import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { cleanName } from "../lib/galleryName.js";
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

export default function RiverStream({ hints = [], cutoff, palette: P, onOpen, onEdit, max = MAX_RIVER }) {
  const list = hints.slice(0, Math.min(max, MAX_RIVER));
  const [ratios, setRatios] = useState({});     // id → w/h (לזיהוי «גשר» מאוזן)
  const [passed, setPassed] = useState([]);     // רמזים שגללת מעבר להם — מוצגים במגירה למעלה
  const refs = useRef({});
  const overflow = hints.length - list.length;

  // 🔥 המספרים החמים באתר — לפי מפת-החום האמיתית (search_log), בקצה הנהר
  const [hot, setHot] = useState([]);
  useEffect(() => {
    let live = true;
    getHotNumbers(7, 10).then(h => { if (live) setHot(h || []); }).catch(() => {});
    return () => { live = false; };
  }, []);

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
          const above = !en.isIntersecting && en.boundingClientRect.bottom < 120;
          if (above && !next.includes(id)) next.push(id);
          if (en.isIntersecting && next.includes(id)) next = next.filter(x => x !== id);
        }
        return next;
      });
    }, { rootMargin: "-90px 0px 0px 0px", threshold: 0 });
    Object.values(refs.current).forEach(el => el && io.observe(el));
    return () => io.disconnect();
  }, [list.length]);

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
        .rv-drop { position:relative; z-index:2; width:fit-content; margin:0 auto 16px; background:#0f0b1a;
          border:1px solid ${gold}.5); color:#e8c84a; font-family:${F.heading}; font-size:11px; font-weight:800;
          border-radius:999px; padding:3px 14px; box-shadow:0 0 12px ${gold}.22); }
        .rv-hint { position:relative; width:46%; margin-bottom:28px; z-index:1; cursor:zoom-in; }
        .rv-hint.r { margin-inline-start:2%; transform:rotate(-1.4deg); }
        .rv-hint.l { margin-inline-start:52%; transform:rotate(1.4deg); }
        .rv-hint::after { content:""; position:absolute; top:38px; width:8%; height:2px;
          background:linear-gradient(90deg, ${gold}.55), transparent); }
        .rv-hint.r::after { inset-inline-end:-8%; transform:scaleX(-1); }
        .rv-hint.l::after { inset-inline-start:-8%; }
        .rv-hint img { display:block; width:100%; height:auto; border-radius:14px; border:1px solid ${gold}.3);
          box-shadow:0 18px 44px -16px rgba(0,0,0,.85); }
        .rv-bridge { position:relative; z-index:2; width:88%; margin:0 auto 28px; transform:rotate(-.5deg); cursor:zoom-in; }
        .rv-bridge img { display:block; width:100%; height:auto; border-radius:16px; border:1.5px solid ${gold}.5);
          box-shadow:0 24px 60px -18px rgba(0,0,0,.9), 0 0 34px ${gold}.1); }
        .rv-bridge .rv-btag { position:absolute; top:-10px; right:18px; background:#0f0b1a; border:1px solid ${gold}.5);
          color:#e8c84a; font-family:${F.heading}; font-size:10.5px; font-weight:800; border-radius:999px; padding:2px 12px; }
        /* המספר ליד התמונה — לא עליה (חוק: לא חוסמים את התוכן שבתמונה) */
        .rv-num { display:inline-block; background:${gold}.96); color:#1a0e00;
          font-family:${F.mono}; font-weight:900; font-size:13.5px; border-radius:9px; padding:1px 10px;
          text-decoration:none; box-shadow:0 2px 10px rgba(0,0,0,.4); }
        .rv-added { display:inline-block; background:rgba(224,85,106,.95); color:#fff;
          font-family:${F.heading}; font-size:9px; font-weight:800; border-radius:999px; padding:2px 8px; }
        .rv-cap { margin-top:7px; color:${P?.ink || "#efe6d2"}; font-family:${F.body}; font-size:12.5px; font-weight:700; line-height:1.5;
          display:flex; flex-wrap:wrap; align-items:center; gap:6px; }
        .rv-cap .rv-t span { display:block; color:${P?.inkSoft || "#a99a7c"}; font-size:10.5px; font-weight:400; margin-top:1px; }
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
        @media (max-width:560px) { .rv-hint { width:47.5%; } .rv-hint.l { margin-inline-start:50.5%; } .rv-tray { top:58px; } }
      `}</style>

      {/* מגירת-הזיכרון — הרמזים שכבר עברת (קטנים, מסודרים למעלה). לחיצה = חזרה אליהם */}
      {passedHints.length > 0 && (
        <div className="rv-tray">
          <span className="rv-tray-l">⤴ עברת ({passedHints.length})</span>
          {passedHints.map(h => (
            <button key={h.id} className="rv-mini" title={cleanName(h.name) || String(domNum(h) || "")}
              onClick={() => refs.current[h.id]?.scrollIntoView({ behavior: "smooth", block: "center" })}>
              <img src={h.image_url} alt="" />
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
          const added = streamLabel(h);
          const fresh = cutoff ? isNewSince(h, cutoff) : false;
          const isBridge = (ratios[h.id] || 0) > 1.25;    // מאוזנת → «גשר» חוצה-נהר
          // התמונה נקייה לגמרי (בלי שכבות שחוסמות תוכן); המספר/התגיות — בכיתוב שלידה
          const inner = (
            <>
              <img src={h.image_url} alt={title || ""} loading={i < 3 ? "eager" : "lazy"} onLoad={e => onImgLoad(h.id, e)} />
              {onEdit && <button className="rv-edit" title="ערוך" onClick={e => { e.stopPropagation(); onEdit(h); }}>✏️</button>}
            </>
          );
          const caption = (
            <div className="rv-cap" onClick={e => e.stopPropagation()}>
              {v != null && <Link className="rv-num" to={`/number/${v}`}>{v}</Link>}
              <span className="rv-t" style={{ flex: 1, minWidth: 0 }}>{title}
                <span>{shortDate(h) ? `🗓 ${shortDate(h)}` : ""}{fresh && added ? ` · 🆕 נוסף ${added}` : ""}</span>
              </span>
              {/* שער-הסט המהבהב — כל 14+45 / כל 358 בגלריה (קישור סטטי, אפס שאילתות) */}
              {v != null && (
                <Link className="rv-gal" to={gallerySetHref(v)} title={`כל התמונות של ${gallerySetFor(v).join("+")} בגלריה`}>
                  🖼 כל {gallerySetFor(v).join("+")} ←
                </Link>
              )}
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

      {/* קצה הנהר — הפניה לגלריות (מעבר ל-20) */}
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
    </div>
  );
}
