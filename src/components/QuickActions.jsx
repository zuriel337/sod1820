import React from "react";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { emit, EVENTS } from "../lib/research/eventBus.js";

// ⚡ Quick Actions — שכבת הפעולות האחידה ליד כל ישות (research_workspace_law).
// ➕ הוסף למחקר · ⭐ שמור · 🔗 שתף · 📋 העתק · 🤖 נתח ב-AI — תמיד אותו מקום ועיצוב.
// כל פעולה פולטת Event ל-Bus → הפאנלים מאזינים.
export default function QuickActions({ entity }) {
  const { addToResearch, saveItem } = useResearch();
  if (!entity) return null;
  const share = () => { emit(EVENTS.ITEM_SHARE, entity); try { navigator.share?.({ title: entity.title }); } catch { /* noop */ } };
  const copy = () => { emit(EVENTS.ITEM_COPY, entity); try { navigator.clipboard?.writeText(entity.title); } catch { /* noop */ } };
  const ai = () => emit(EVENTS.AI_ANALYZE, entity);
  return (
    <div className="rw-qa">
      <button className="pri" onClick={() => addToResearch?.(entity)}>➕ הוסף למחקר</button>
      <button onClick={() => saveItem?.(entity)}>⭐ שמור</button>
      <button onClick={share}>🔗 שתף</button>
      <button onClick={copy}>📋 העתק</button>
      <button onClick={ai}>🤖 נתח ב-AI</button>
    </div>
  );
}
