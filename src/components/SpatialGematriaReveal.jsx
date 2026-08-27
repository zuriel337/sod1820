import React, { useEffect, useMemo, useRef, useState } from "react";
import { openNumberDrawer } from "../lib/numberDrawer.js";

// ===== SpatialGematriaReveal — רכיב-תצוגה יחיד לממצאי «גימטריה מרחבית» =====
// מקבל spec מובנה (לא HTML גולמי) ומציג חשיפה מדורגת בעומק (layered depth), mobile-first.
//   שלב 1: משולש נקי · שלב 2: המעטפת החיצונית נספרת כצורה-אחת → ערך חיצוני
//   שלב 3: השכבה החיצונית נסוגה בעומק, הפנימית מתקדמת → ערך פנימי · שלב 4: רמז-הצלבה מחקרי.
// ברירת-המחדל = layered_3d; יורד ל-static_2d ב-prefers-reduced-motion. אין three.js — CSS/SVG בלבד.
// הפרדת אמת/תצוגה: הערכים הם ממצא-מנוע (spec), «3D» הוא תצוגה; ההצלבה מסומנת כפרשנות-מחקר.
// דו-קיום עם NumberDrawer: הערכים נושאים data-gem (פותח את מגירת-המספר דרך המאזין הקנוני);
// המילים אינן נצבעות אחת-אחת (ההדגשה = מתאר/עומק/שכבה), והמעטף מסומן class="spatial-reveal-root"
// כדי שהעוטף-האוטומטי (auto number-linker) ידלג על תת-העץ.

const CSS = `
.sgr{--sgr-gold:#f0dc9a;--sgr-gold-line:#e8c84a;--sgr-blue:#7fd4ff;--sgr-blue-line:#58bfff;
  max-width:640px;margin:26px auto;padding:20px 12px 16px;border-radius:18px;direction:rtl;text-align:center;
  background:radial-gradient(120% 120% at 50% 0%,#191233,#0d0a1a 70%);border:1px solid rgba(232,200,74,.32);
  box-shadow:0 12px 44px rgba(0,0,0,.45);overflow:hidden;color:#ece6d6;position:relative}
.sgr-kick{font-size:12.5px;letter-spacing:.14em;opacity:.62;text-transform:none}
.sgr-title{font-family:inherit;font-weight:800;font-size:clamp(21px,5.4vw,28px);margin:4px 0 4px;color:#f4ecd6}
.sgr-sub{font-size:clamp(13px,3.6vw,15px);opacity:.78;max-width:460px;margin:0 auto 8px;line-height:1.55}
.sgr-stage{position:relative;width:100%;max-width:440px;margin:8px auto 4px;aspect-ratio:1/.92;perspective:1000px;
  contain:layout paint}
.sgr-depth{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .5s ease}
.sgr-layer{position:absolute;inset:0;transition:transform .7s cubic-bezier(.22,.61,.36,1),opacity .7s ease,filter .7s ease}
.sgr-svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.sgr-tri{fill:none;stroke-linejoin:round;stroke-linecap:round;vector-effect:non-scaling-stroke}
.sgr-outer-line{stroke:var(--sgr-blue-line);stroke-width:3.4;filter:drop-shadow(0 0 6px rgba(88,191,255,.5));
  stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset 1.15s ease}
.sgr-outer-fill{fill:rgba(88,191,255,.09);opacity:0;transition:opacity .6s ease}
.sgr-inner-line{stroke:var(--sgr-gold-line);stroke-width:3.2;filter:drop-shadow(0 0 6px rgba(240,189,80,.5));
  stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset 1.05s ease}
.sgr-inner-fill{fill:rgba(240,189,80,.12);opacity:0;transition:opacity .6s ease}
.sgr-words{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;justify-content:center;gap:2px;
  padding:6% 4%;font-family:Georgia,'Times New Roman',serif}
.sgr-row{display:flex;justify-content:center;gap:clamp(6px,2.4vw,16px);white-space:nowrap}
.sgr-w{display:inline-block;font-size:clamp(13px,3.9vw,20px);line-height:1.5;color:#e7e0cf;
  transition:color .5s ease,text-shadow .5s ease,transform .5s ease;padding:0 1px}
.sgr-w.is-inner{color:#e7e0cf}
.sgr-w.lit{color:#ffe6a6;text-shadow:0 0 12px rgba(240,189,80,.6);transform:translateY(-1px)}
/* מצבי-עומק */
.sgr[data-stage="inner"] .sgr-layer-outer,.sgr[data-stage="innerDone"] .sgr-layer-outer,.sgr[data-stage="cross"] .sgr-layer-outer{
  transform:translateZ(-70px) scale(.9);opacity:.32;filter:blur(.6px)}
.sgr[data-stage="inner"] .sgr-layer-inner,.sgr[data-stage="innerDone"] .sgr-layer-inner,.sgr[data-stage="cross"] .sgr-layer-inner{
  transform:translateZ(46px) scale(1.04)}
.sgr-layer-inner{opacity:0;transition:opacity .5s ease,transform .7s cubic-bezier(.22,.61,.36,1)}
.sgr[data-stage="inner"] .sgr-layer-inner,.sgr[data-stage="innerDone"] .sgr-layer-inner,.sgr[data-stage="cross"] .sgr-layer-inner{opacity:1}
/* קריאת-הערכים */
.sgr-readouts{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin:8px auto 2px}
.sgr-card{flex:1 1 180px;max-width:280px;border-radius:14px;padding:9px 12px 11px;opacity:.28;
  transition:opacity .5s ease,transform .5s ease;transform:translateY(4px)}
.sgr-card.on{opacity:1;transform:translateY(0)}
.sgr-card-outer{background:rgba(88,191,255,.08);border:1px solid rgba(88,191,255,.28)}
.sgr-card-inner{background:rgba(240,189,80,.09);border:1px solid rgba(240,189,80,.3)}
.sgr-clabel{font-size:12px;opacity:.72;line-height:1.4}
.sgr-cval{font-weight:900;font-size:clamp(30px,9vw,44px);line-height:1.05;margin-top:1px;cursor:pointer;
  display:inline-block;text-decoration:none}
.sgr-card-outer .sgr-cval{color:#bfe6ff}
.sgr-card-inner .sgr-cval{color:var(--sgr-gold)}
.sgr-cross{margin:12px auto 2px;max-width:520px;font-size:14px;opacity:0;transition:opacity .6s ease;line-height:1.6}
.sgr[data-stage="cross"] .sgr-cross{opacity:1}
.sgr-cross b .sgr-xval,.sgr-cross .sgr-xterm{color:var(--sgr-gold);font-weight:800}
.sgr-xval{cursor:pointer;text-decoration:none}
.sgr-note{font-size:12px;opacity:.62;margin-top:3px}
.sgr-ctrls{display:flex;gap:8px;justify-content:center;margin-top:10px}
.sgr-btn{appearance:none;border:1px solid rgba(232,200,74,.4);background:rgba(232,200,74,.1);color:#f0dc9a;
  font:inherit;font-size:13px;font-weight:700;border-radius:999px;padding:7px 16px;cursor:pointer}
.sgr-btn:active{transform:scale(.97)}
@media (max-width:380px){.sgr{padding:16px 8px 14px}.sgr-stage{max-width:340px;aspect-ratio:1/.98}
  .sgr-row{gap:clamp(4px,2vw,10px)}.sgr-card{flex-basis:150px}}
@media (prefers-reduced-motion:reduce){.sgr-depth,.sgr-layer,.sgr-w,.sgr-card,.sgr-cross,.sgr-outer-line,.sgr-inner-line{transition:none!important}}
`;

const STAGES = ["whole", "outer", "outerDone", "inner", "innerDone", "cross"];
// זמני-שהייה בין שלבים (ms) — רצף קצר ולא-מטריד; מסתיים במצב composite יציב (שני הערכים גלויים).
const DWELL = { whole: 650, outer: 1350, outerDone: 850, inner: 1150, innerDone: 950 };

function prefersReducedMotion() {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
}

// ספירה-מתקדמת (0→target) לפי rAF — «סופרים את החיצוניות»
function useCountUp(target, active, durationMs) {
  const [v, setV] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    if (!active) { setV(0); return; }
    let start = null;
    const step = (ts) => {
      if (start == null) start = ts;
      const p = Math.min(1, (ts - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(target * eased));
      if (p < 1) raf.current = requestAnimationFrame(step);
      else setV(target);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, active, durationMs]);
  return v;
}

export default function SpatialGematriaReveal({ spec }) {
  const reduce = useMemo(prefersReducedMotion, []);
  const [stage, setStage] = useState(reduce ? "cross" : "whole");
  const [runKey, setRunKey] = useState(0);
  const rootRef = useRef(null);
  const timers = useRef([]);

  // רצף אוטומטי (פעם אחת) — מתחיל כשהרכיב נכנס למסך; מדלג בכיבוד reduced-motion.
  useEffect(() => {
    if (reduce) { setStage("cross"); return; }
    const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
    clear();
    let started = false;
    const run = () => {
      if (started) return; started = true;
      let acc = 0;
      STAGES.slice(0, -1).forEach((s, i) => {
        acc += DWELL[s];
        timers.current.push(setTimeout(() => setStage(STAGES[i + 1]), acc));
      });
    };
    setStage("whole");
    let io;
    const el = rootRef.current;
    if (el && "IntersectionObserver" in window) {
      io = new IntersectionObserver((ents) => {
        ents.forEach((e) => { if (e.isIntersecting) { run(); io && io.disconnect(); } });
      }, { threshold: 0.35 });
      io.observe(el);
    } else { run(); }
    return () => { clear(); io && io.disconnect(); };
  }, [reduce, runKey]);

  const idx = STAGES.indexOf(stage);
  const outerActive = idx >= 1;               // outline מצויר מ-stage "outer"
  const innerActive = idx >= 3;
  const outerCounting = stage === "outer";
  const outerVal = useCountUp(spec.outer.value, !reduce && idx >= 1, 1250);
  const innerVal = useCountUp(spec.inner.value, !reduce && idx >= 3, 1000);
  const showOuterFinal = reduce || idx >= 2;
  const showInnerFinal = reduce || idx >= 4;

  const rows = spec.rows || [];
  const innerCells = spec.innerCells || {};
  const isInner = (r, c) => Array.isArray(innerCells[r]) && innerCells[r].includes(c);

  // גיאומטריית המשולשים (viewBox 100x100) — מעטפת + תת-משולש תחתון-מרכזי.
  const OUTER = "50,6 94,86 6,86";
  const INNER = "50,40 80,82 20,82";

  const openGem = (term) => {
    try { openNumberDrawer(String(term)); }
    catch { /* מגירת-המספר מטופלת גם ע"י המאזין הקנוני על data-gem */ }
  };

  return (
    <div className="sgr spatial-reveal-root" data-stage={stage} ref={rootRef} dir="rtl">
      <style>{CSS}</style>
      <div className="sgr-kick">גימטריה מרחבית · הצצה</div>
      <div className="sgr-title">{spec.title}</div>
      {spec.subtitle && <div className="sgr-sub">{spec.subtitle}</div>}

      <div className="sgr-stage">
        <div className="sgr-depth">
          {/* שכבה חיצונית — מתאר המעטפת כצורה אחת */}
          <div className="sgr-layer sgr-layer-outer">
            <svg className="sgr-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <polygon className="sgr-tri sgr-outer-fill" points={OUTER} style={{ opacity: outerActive ? 1 : 0 }} />
              <polygon className="sgr-tri sgr-outer-line" points={OUTER}
                style={{ strokeDashoffset: outerActive ? 0 : 1 }} pathLength="1" />
            </svg>
          </div>
          {/* שכבת המילים */}
          <div className="sgr-words" aria-label="ברכת כהנים מסודרת כמשולש">
            {rows.map((row, r) => (
              <div className="sgr-row" key={r}>
                {row.map((w, c) => (
                  <span key={c} className={`sgr-w${isInner(r, c) ? " is-inner" : ""}${isInner(r, c) && innerActive ? " lit" : ""}`}>{w}</span>
                ))}
              </div>
            ))}
          </div>
          {/* שכבה פנימית — תת-המשולש מתקדם בעומק */}
          <div className="sgr-layer sgr-layer-inner">
            <svg className="sgr-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <polygon className="sgr-tri sgr-inner-fill" points={INNER} style={{ opacity: innerActive ? 1 : 0 }} />
              <polygon className="sgr-tri sgr-inner-line" points={INNER}
                style={{ strokeDashoffset: innerActive ? 0 : 1 }} pathLength="1" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
        </div>
      </div>

      <div className="sgr-readouts">
        <div className={`sgr-card sgr-card-outer${outerActive ? " on" : ""}`}>
          <div className="sgr-clabel">{spec.outer.label}</div>
          <a className="sgr-cval" data-gem={String(spec.outer.value)} href={`/number/${spec.outer.value}`}
            onClick={(e) => { e.preventDefault(); openGem(spec.outer.value); }}>
            {showOuterFinal ? spec.outer.value : (outerCounting ? outerVal : 0)}
          </a>
        </div>
        <div className={`sgr-card sgr-card-inner${innerActive ? " on" : ""}`}>
          <div className="sgr-clabel">{spec.inner.label}</div>
          <a className="sgr-cval" data-gem={String(spec.inner.value)} href={`/number/${spec.inner.value}`}
            onClick={(e) => { e.preventDefault(); openGem(spec.inner.value); }}>
            {showInnerFinal ? spec.inner.value : innerVal}
          </a>
        </div>
      </div>

      {spec.crossref && (
        <div className="sgr-cross">
          <b>הצלבה:</b> <span className="sgr-xterm">״{spec.crossref.term}״</span> ={" "}
          <a className="sgr-xval" data-gem={String(spec.crossref.value)} href={`/number/${spec.crossref.value}`}
            onClick={(e) => { e.preventDefault(); openGem(spec.crossref.term); }}>{spec.crossref.value}</a>
          <div className="sgr-note">{spec.crossref.note}</div>
        </div>
      )}

      {!reduce && (
        <div className="sgr-ctrls">
          <button className="sgr-btn" type="button" onClick={() => { setStage("whole"); setRunKey((k) => k + 1); }}>▶ הצג שוב</button>
        </div>
      )}
    </div>
  );
}
