// Cumulative open activity for /stats (ZURIEL 27.11.2026): which public items were opened, even once.
// ONE more reader on the SAME events pipeline (research_open_activity_2029, a sibling of research_pulse_2029). No collection, no storage here.
// Three layers stay apart: ACTIVITY (every public item opened), POPULARITY (the existing 10 events / 5 sessions floor, tier "popular") and
// MACHINES (served crawler hits). People are never counted and nothing here carries an identity, a time of one open or a private search.
import { supabase } from "./supabase.js";

export const OPEN_ACTIVITY_WINDOWS = Object.freeze([["day", "אתמול", "יממה"], ["week", "7 הימים האחרונים", "שבוע"], ["month", "30 הימים האחרונים", "חודש"]]);
export const OPEN_ACTIVITY_FAMILIES = Object.freeze([["number", "דפי מספר"], ["post", "פוסטים"], ["cipher", "צפנים"], ["topic", "נושאים ותגיות"], ["video", "סרטונים"]]);
const cache = new Map();

// The reader is a proposal until its SQL is applied (supabase/proposed/APPLY-BEFORE-DEPLOY.json): PGRST202 (function not found) or HTTP 404 is "not applied yet"
// and answers null, so the section simply does not draw and never shows an invented number. Any other error (42501, network) is thrown as before.
export const notAppliedYet = error => error?.code === "PGRST202" || error?.status === 404;
export function readOpenActivity(window, client = supabase) {
  if (!cache.has(window)) {
    cache.set(window, client.rpc("research_open_activity_2029", { p_window: window }).then(({ data, error }) => {
      if (error) { if (notAppliedYet(error)) return null; throw error; }
      return data;
    }).catch(error => { cache.delete(window); throw error; }));
  }
  return cache.get(window);
}
export function resetOpenActivityCacheForTest() { cache.clear(); }

export function openActivityUsable(d) {
  return Boolean(d && d.version === 1 && d.state === "measured" && d.families && typeof d.families === "object");
}

const label = (fam, item) => {
  if (fam === "number") return item.n != null ? String(item.n) : "";
  if (fam === "post" || fam === "cipher") return String(item.title || "").trim();
  if (fam === "topic") return String(item.label || "").trim();
  return ""; // a video has no public title in this payload: the model numbers it (never an invented name)
};

// Pure model: per family, the popular items first (already ordered by the server), then the items seen below the floor in the server's fixed order.
// An item without a safe internal address or without a label is dropped (the server never sends one; this keeps a bad payload from drawing garbage).
export function openActivityModel(d) {
  if (!openActivityUsable(d)) return null;
  const families = [];
  for (const [key, name] of OPEN_ACTIVITY_FAMILIES) {
    const f = d.families[key];
    if (!f || !Number.isSafeInteger(f.items) || f.items < 1) continue;
    const list = (Array.isArray(f.list) ? f.list : []).filter(x => typeof x?.href === "string" && /^\/[A-Za-z0-9֐-׿%_\-./]+$/.test(x.href) && Number.isSafeInteger(x.opens) && x.opens > 0)
      .map((x, i) => ({ href: x.href, text: label(key, x) || (key === "video" ? "סרטון " + (i + 1) : ""), opens: x.opens, tier: x.tier === "popular" ? "popular" : "seen" }))
      .filter(x => x.text);
    families.push({ key, name, items: f.items, opens: Number.isSafeInteger(f.opens) ? f.opens : 0,
      popular: list.filter(x => x.tier === "popular"), seen: list.filter(x => x.tier === "seen"),
      hidden: Math.max(0, f.items - list.length) });
  }
  const unknown = Object.entries(d.unknown || {}).reduce((s, [, v]) => s + (Number.isSafeInteger(v?.opens) ? v.opens : 0), 0);
  const served = Number.isSafeInteger(d.machines?.served) ? d.machines.served : 0;
  return { window: d.window, from: d.from, to: d.to, families, unknownOpens: unknown, machinesServed: served,
    unmeasured: Array.isArray(d.not_measured_by_item) ? d.not_measured_by_item : [] };
}
