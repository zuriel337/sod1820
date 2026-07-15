import React from "react";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { emit, EVENTS } from "../lib/research/eventBus.js";
import { withRid } from "../lib/propagation.js";
import { shareOrCopy } from "../lib/share.js";

// ⚡ Quick Actions — פס-הפעולות האחיד ליד כל ישות (Reality Graph Law · Zero-Duplicate).
// ➕ הוסף למחקר · ⭐ שמור · 📌 הצמד · 🔗 שתף · 📋 העתק · 🤖 AI — אותו מקום ועיצוב בכל Hub.
// כל פעולה פולטת Event ל-Bus → הפאנלים מאזינים. עובד על כל type (לא תלוי-דף).
export default function QuickActions({ entity, onShare, onAnalyze, extra, style }) {
  const { addToResearch, saveItem, togglePin, isPinned } = useResearch();
  if (!entity) return null;
  const pinned = isPinned?.(entity.id);
  // onShare = שיתוף עשיר ספציפי-לסוג (למשל תמונת-מספר בדף המספר) → מונע כפילות שיתוף.
  // 🔗 שיתוף חייב לכלול URL — בלי url הדפדפן/וואטסאפ שולח רק כותרת בלי לינק (התקלה "האפליקציה לא נתן לינק").
  // משתפים את הקישור הקנוני של העמוד הנוכחי (כמו RoyalShareWidget) עם rid למדידת ויראליות. בלי navigator.share — נופלים ל-copy.
  const share = () => {
    emit(EVENTS.ITEM_SHARE, entity);
    if (onShare) return onShare();
    // לוגיקת-שיתוף קנונית אחת (lib/share.js) — הקישור הקנוני של העמוד + rid למדידת ויראליות
    const url = typeof window !== "undefined" ? withRid(window.location.href) : "https://sod1820.co.il";
    shareOrCopy({ title: entity.title || "סוד 1820", url });
  };
  const copy = () => { emit(EVENTS.ITEM_COPY, entity); try { navigator.clipboard?.writeText(entity.title); } catch { /* noop */ } };
  // style = משתני-תמה מהדף (P) → צבעים נקראים נכון בבהיר ובכהה (לא נשענים על fallback מעומעם).
  return (
    <div className="rw-qa" style={style}>
      {/* סגנון עצמאי — עובד בכל דף (לא רק במעבדה). בתוך ה-Shell משתני-ה-CSS גוברים → המראה זהה. */}
      <style>{QA_CSS}</style>
      <button onClick={() => addToResearch?.(entity)}>➕ הוסף למחקר</button>
      <button onClick={() => saveItem?.(entity)}>⭐ שמור</button>
      <button className={pinned ? "on" : ""} onClick={() => togglePin?.(entity)} title="הצמד למחקר — יישאר זמין בכל המעבדה">
        {pinned ? "📌 מוצמד" : "📌 הצמד"}
      </button>
      <button onClick={share}>🔗 שתף</button>
      <button onClick={copy}>📋 העתק</button>
      {/* 🤖 מנוע ה-AI — פעיל כשהדף מספק onAnalyze (מבוסס עובדות-מנוע, ai_analyze_contract).
          בדפים שעוד לא חיברו — נשאר «בבנייה» מושבת (לא פולט Event לריק). */}
      {onAnalyze
        ? <button onClick={() => { emit(EVENTS.AI_ANALYZE, entity); onAnalyze(); }} title="🤖 ניתוח AI — מבוסס עובדות המנוע">🤖 נתח ב-AI</button>
        : <button className="soon" disabled title="🤖 ניתוח AI — בבנייה, ייפתח בקרוב לכל החוקרים">🤖 AI · בבנייה</button>}
      {extra}
    </div>
  );
}

// fallbacks חוצי-תמה (בהיר/כהה): טקסט יורש את צבע-ההקשר, אקסנט זהב. בתוך המעבדה — המשתנים גוברים.
const QA_CSS = `
.rw-qa{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;justify-content:center}
.rw-qa button{font-family:inherit;border:1px solid var(--line,rgba(196,154,46,.45));background:var(--card,rgba(196,154,46,.12));border-radius:999px;padding:9px 15px;font-size:13.5px;font-weight:700;color:var(--ink,inherit);min-height:44px;cursor:pointer;transition:transform .1s ease}
.rw-qa button:active{transform:scale(.96)}
.rw-qa button.on{background:var(--accS,rgba(196,154,46,.22));border-color:var(--acc,#c79a2e);color:var(--acc,#b8901f)}
.rw-qa button.soon{opacity:.5;cursor:default}
.rw-qa button.soon:active{transform:none}
`;
