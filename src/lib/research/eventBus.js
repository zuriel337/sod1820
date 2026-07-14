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
  PIN_ADD: "pin:add",         // 📌 ישות הוצמדה למחקר
  PIN_REMOVE: "pin:remove",
  SEARCH_GEMATRIA: "search:gematria",
  PAGE_NUMBER_OPEN: "page:number:open",
  ENTITY_FOCUS: "entity:focus",   // 🎯 הכלי הפעיל משדר את הישות שבמוקד → הפאנל הימני מציג את הפירוק. payload: {title, word?, value, kind?, meter?, counts?}
  ENTITY_BLUR: "entity:blur",     // הכלי איבד מוקד (עזיבה/איפוס) → הפאנל מתרוקן
  ENTITY_SECTION: "entity:section", // 🧭 הפאנל מבקש מדף-המספר לקפוץ למקטע (words/dna/galleries/posts/roots) → EntityPage גולל
  AI_ANALYZE: "ai:analyze",
  ELS_STATE: "els:state",   // ElsGrid מפרסם את תוצאותיו → הקיר הימני מציג
  ELS_LOAD: "els:load",     // הקיר הימני מבקש לטעון חיפוש שמור → ElsGrid מיישם
  MIDRASH_NAV: "midrash:nav", // הקיר הימני מבקש מבית-המדרש לעבור מדור/שיטה → BeitMidrashPage מיישם
};
