import React, { useState, useEffect, useRef } from "react";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { emit, EVENTS } from "../lib/research/eventBus.js";
import { withRid } from "../lib/propagation.js";
import { shareOrCopy } from "../lib/share.js";

// ⚡ Quick Actions — פס-הפעולות האחיד ליד כל ישות (Reality Graph Law · Zero-Duplicate).
// היררכיה (לא ערימה): ➕ הוסף למחקר = ראשי מלא · ⭐ שמור · 🔗 שתף = משניים · ⋯ = תפריט-גלישה
// (📌 הצמד · 📋 העתק · extra). פוקוס אחד ברור, שורה רגועה. כל פעולה פולטת Event ל-Bus.
export default function QuickActions({ entity, onShare, onAnalyze, extra, style, hideAnalyze }) {
  const { addToResearch, saveItem, togglePin, isPinned } = useResearch();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);
  // סגירת תפריט-הגלישה בלחיצה מחוץ לו
  useEffect(() => {
    if (!moreOpen) return;
    const onDoc = e => { if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false); };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [moreOpen]);
  if (!entity) return null;
  const pinned = isPinned?.(entity.id);
  // onShare = שיתוף עשיר ספציפי-לסוג (למשל תמונת-מספר בדף המספר) → מונע כפילות שיתוף.
  // 🔗 שיתוף חייב לכלול URL — משתפים את הקישור הקנוני של העמוד עם rid למדידת ויראליות. בלי navigator.share — copy.
  const share = () => {
    emit(EVENTS.ITEM_SHARE, entity);
    if (onShare) return onShare();
    const url = typeof window !== "undefined" ? withRid(window.location.href) : "https://sod1820.co.il";
    shareOrCopy({ title: entity.title || "סוד 1820", url });
  };
  const copy = () => { emit(EVENTS.ITEM_COPY, entity); try { navigator.clipboard?.writeText(entity.title); } catch { /* noop */ } };
  // style = משתני-תמה מהדף (P) → צבעים נקראים נכון בבהיר ובכהה (לא נשענים על fallback מעומעם).
  return (
    <div className="rw-qa" style={style}>
      <style>{QA_CSS}</style>
      {/* ראשי — הפעולה שרוצים שיעשו (מלא-אקסנט) */}
      <button className="qa-primary" onClick={() => addToResearch?.(entity)}>➕ הוסף למחקר</button>
      {/* משניים — מתאר */}
      <button onClick={() => saveItem?.(entity)}>⭐ שמור</button>
      <button onClick={share}>🔗 שתף</button>
      {/* 🤖 כפתור-AI רק בהאבים שאין בהם כרטיס-AI מלא (hideAnalyze מונע כפילות) */}
      {!hideAnalyze && (onAnalyze
        ? <button onClick={() => { emit(EVENTS.AI_ANALYZE, entity); onAnalyze(); }} title="🤖 ניתוח AI — מבוסס עובדות המנוע">🤖 נתח ב-AI</button>
        : <button className="soon" disabled title="🤖 ניתוח AI — בבנייה, ייפתח בקרוב לכל החוקרים">🤖 AI · בבנייה</button>)}
      {/* ⋯ תפריט-גלישה — פעולות-עזר שלא צריכות משקל של כפתור מלא */}
      <div className="qa-more" ref={moreRef}>
        <button className="qa-moretog" onClick={() => setMoreOpen(o => !o)} aria-expanded={moreOpen} aria-label="עוד פעולות" title="עוד פעולות">⋯</button>
        {moreOpen && (
          <div className="qa-menu" onClick={() => setMoreOpen(false)}>
            <button className={pinned ? "on" : ""} onClick={() => togglePin?.(entity)} title="הצמד למחקר — יישאר זמין בכל המעבדה">
              {pinned ? "📌 מוצמד" : "📌 הצמד"}
            </button>
            <button onClick={copy}>📋 העתק</button>
            {extra}
          </div>
        )}
      </div>
    </div>
  );
}

// fallbacks חוצי-תמה (בהיר/כהה): טקסט יורש את צבע-ההקשר, אקסנט מהמשתנים. בתוך המעבדה — המשתנים גוברים.
const QA_CSS = `
.rw-qa{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;justify-content:center;align-items:center}
.rw-qa button{font-family:inherit;border:1px solid var(--line,rgba(196,154,46,.45));background:var(--card,transparent);border-radius:999px;padding:9px 16px;font-size:13.5px;font-weight:700;color:var(--ink,inherit);min-height:44px;cursor:pointer;transition:transform .1s ease,background .15s ease,filter .15s ease}
.rw-qa button:active{transform:scale(.96)}
.rw-qa .qa-primary{background:var(--acc,#2f6df6);border-color:transparent;color:var(--onAcc,#fff)}
.rw-qa .qa-primary:hover{filter:brightness(1.06)}
.rw-qa button.on{background:var(--accS,rgba(196,154,46,.22));border-color:var(--acc,#c79a2e);color:var(--acc,#b8901f)}
.rw-qa button.soon{opacity:.5;cursor:default}
.rw-qa button.soon:active{transform:none}
.rw-qa .qa-more{position:relative;display:inline-flex}
.rw-qa .qa-moretog{min-width:46px;padding:9px 14px;font-size:20px;line-height:.7;letter-spacing:1px;color:var(--ink2,var(--ink,inherit))}
.rw-qa .qa-menu{position:absolute;top:calc(100% + 6px);inset-inline-end:0;z-index:60;display:flex;flex-direction:column;gap:4px;
  background:var(--card,#fff);border:1px solid var(--line,rgba(0,0,0,.12));border-radius:14px;padding:7px;min-width:172px;
  box-shadow:0 14px 36px rgba(0,0,0,.18)}
.rw-qa .qa-menu button,.rw-qa .qa-menu a{width:100%;justify-content:flex-start;text-align:start;border:none;background:transparent;min-height:40px;border-radius:9px;text-decoration:none}
.rw-qa .qa-menu a>button{width:100%}
.rw-qa .qa-menu button:hover{background:var(--chip,rgba(0,0,0,.05))}
`;
