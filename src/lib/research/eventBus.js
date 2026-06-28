// 🔌 Event Bus — pub/sub גלובלי (research_workspace_law). הפאנלים *מאזינים*,
// לא שואלים את הדפים «מה קרה». אפס תלות בין רכיבים → כל כלי/פאנל עתידי מתחבר בלי לשבור.
const listeners = new Map(); // event -> Set<fn>

export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  return () => off(event, fn);
}
export function off(event, fn) { listeners.get(event)?.delete(fn); }

export function emit(event, payload) {
  listeners.get(event)?.forEach(fn => { try { fn(payload); } catch { /* listener errors never break the bus */ } });
  listeners.get("*")?.forEach(fn => { try { fn({ event, payload }); } catch { /* noop */ } });
}

// אירועי-הליבה. כל פעולה במערכת פולטת אחד מהם.
export const EVENTS = {
  RESEARCH_ADD: "research:add",
  RESEARCH_CLEAR: "research:clear",
  ITEM_SAVE: "item:save",
  ITEM_SHARE: "item:share",
  ITEM_COPY: "item:copy",
  SEARCH_GEMATRIA: "search:gematria",
  PAGE_NUMBER_OPEN: "page:number:open",
  AI_ANALYZE: "ai:analyze",
};
