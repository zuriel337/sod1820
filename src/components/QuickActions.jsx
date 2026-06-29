import React from "react";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { emit, EVENTS } from "../lib/research/eventBus.js";

// ⚡ Quick Actions — פס-הפעולות האחיד ליד כל ישות (Reality Graph Law · Zero-Duplicate).
// ➕ הוסף למחקר · ⭐ שמור · 📌 הצמד · 🔗 שתף · 📋 העתק · 🤖 AI — אותו מקום ועיצוב בכל Hub.
// כל פעולה פולטת Event ל-Bus → הפאנלים מאזינים. עובד על כל type (לא תלוי-דף).
export default function QuickActions({ entity, onShare, extra }) {
  const { addToResearch, saveItem, togglePin, isPinned } = useResearch();
  if (!entity) return null;
  const pinned = isPinned?.(entity.id);
  // onShare = שיתוף עשיר ספציפי-לסוג (למשל תמונת-מספר בדף המספר) → מונע כפילות שיתוף.
  const share = () => { emit(EVENTS.ITEM_SHARE, entity); if (onShare) return onShare(); try { navigator.share?.({ title: entity.title }); } catch { /* noop */ } };
  const copy = () => { emit(EVENTS.ITEM_COPY, entity); try { navigator.clipboard?.writeText(entity.title); } catch { /* noop */ } };
  const ai = () => emit(EVENTS.AI_ANALYZE, entity);
  return (
    <div className="rw-qa">
      {/* סגנון עצמאי — עובד בכל דף (לא רק במעבדה). בתוך ה-Shell משתני-ה-CSS גוברים → המראה זהה. */}
      <style>{QA_CSS}</style>
      <button className="pri" onClick={() => addToResearch?.(entity)}>➕ הוסף למחקר</button>
      <button onClick={() => saveItem?.(entity)}>⭐ שמור</button>
      <button className={pinned ? "on" : ""} onClick={() => togglePin?.(entity)} title="הצמד למחקר — יישאר זמין בכל המעבדה">
        {pinned ? "📌 מוצמד" : "📌 הצמד"}
      </button>
      <button onClick={share}>🔗 שתף</button>
      <button onClick={copy}>📋 העתק</button>
      <button onClick={ai}>🤖 AI</button>
      {extra}
    </div>
  );
}

// fallbacks חוצי-תמה (בהיר/כהה): טקסט יורש את צבע-ההקשר, אקסנט זהב. בתוך המעבדה — המשתנים גוברים.
const QA_CSS = `
.rw-qa{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;justify-content:center}
.rw-qa button{font-family:inherit;border:1px solid var(--line,rgba(196,154,46,.45));background:var(--card,rgba(196,154,46,.12));border-radius:999px;padding:9px 15px;font-size:13.5px;font-weight:700;color:var(--ink,inherit);min-height:44px;cursor:pointer;transition:transform .1s ease}
.rw-qa button:active{transform:scale(.96)}
.rw-qa .pri{background:var(--acc,#c79a2e);border-color:var(--acc,#c79a2e);color:#fff}
.rw-qa button.on{background:var(--accS,rgba(196,154,46,.22));border-color:var(--acc,#c79a2e);color:var(--acc,#b8901f)}
`;
