// Owner-controlled runtime switches for secondary functions. ONE owner: the existing public `site_flags` table
// (site_flags_lock_law v3), under its own `fx_` key prefix so they can never be mistaken for `lock_*` access locks.
// Semantics for `fx_*` rows ONLY: enabled=true -> the function is ON, enabled=false -> OFF. An absent row (or a failed
// read) means ON, i.e. the current behavior. Switches never gate user saves, authorization, primary content or consent.
// Writing goes through the admin-only RPC `admin_set_runtime_switch`; reading is the same public site_flags read.
import { useEffect, useState } from "react";
import { getSiteFlags, supabase } from "./supabase.js";

// `group` is only for display. Costs (requests / KB / server ms per page load) live in runtimeSwitchCosts2029.js,
// measured by switching each function off and diffing the real requests; see docs/perf-evidence-20261014/claude-continuation.
export const RUNTIME_SWITCHES_2029 = Object.freeze([
  { key: "fx_now_feed", group: "מסגרת", label: "סרגל ״עכשיו״ ופיד העדכונים", note: "מונה חדשים ופאנל; מתרענן כל דקה" },
  { key: "fx_analytics", group: "מסגרת", label: "אנליטיקה וטלמטריה", note: "Google Analytics, פיקסל שיווק, ביקורים, מעורבות וביצועי דפדפן; כיבוי = לא נשלח דבר" },
  { key: "fx_tier_signals", group: "מספרים", label: "סימוני זהב ויהלום על מספרים", note: "convergence_meter לכל מספר מוצג" },
  { key: "fx_number_dossier", group: "מספרים", label: "תיק המספר", note: "fn_number_dossier; חלק מפתיחת מספר" },
  { key: "fx_number_journey", group: "מספרים", label: "מסע המספר", note: "fn_number_journey; נקרא רק כשמבקשים את המסע" },
  { key: "fx_home_videos", group: "בית", label: "סרטוני הצפנים בשערי הגילוי", note: "get_category_videos, עד 80 סרטונים" },
  { key: "fx_home_gateways", group: "בית", label: "שערי הגילוי: שפה, קולנוע, מימד חמש, צפנים", note: "ארבע שאילתות קטגוריה" },
  { key: "fx_home_pulse", group: "בית", label: "דופק המערכת — מילים חדשות", note: "ספירות ומילים אחרונות מ־gematria_words" },
  { key: "fx_home_temporal", group: "בית", label: "״העת עכשיו״ בבית", note: "אימות שנה, ממצאים, תרומות ואוצרות" },
  { key: "fx_home_world_preview", group: "בית", label: "תצוגת העולם בבית", note: "זרם גילוי, כותבים ותרומות" },
  { key: "fx_home_convergences", group: "בית", label: "התכנסויות בולטות", note: "הרצועה מתחת לעדכונים האחרונים" },
  { key: "fx_world_discovery", group: "עולם", label: "זרם הגילוי בעולם", note: "פוסטים, ממצאי מחקר, הגעות קבוצה; מתרענן כל דקה" },
  { key: "fx_els_gallery", group: "צפנים", label: "גלריית הצפנים השמורים בכלי", note: "60 מטריצות מהענן בכל פתיחה" },
]);
export const RUNTIME_SWITCH_KEYS = new Set(RUNTIME_SWITCHES_2029.map((entry) => entry.key));
export { RUNTIME_SWITCH_COSTS_2029 } from "./runtimeSwitchCosts2029.js";

const TTL_MS = 30_000;
let cache = null;
const listeners = new Set();

// A switch is a performance/owner control, not an authorization lock, so a short in-memory window is fine.
export function switchesFromFlags(flags = {}) {
  const map = {};
  for (const { key } of RUNTIME_SWITCHES_2029) map[key] = !(flags?.[key] && flags[key].enabled === false);
  return map;
}
export async function readRuntimeSwitches({ fresh = false } = {}) {
  if (!fresh && cache && Date.now() - cache.at < TTL_MS) return cache.map;
  let map;
  try { map = switchesFromFlags(await getSiteFlags()); } catch { map = switchesFromFlags({}); }
  cache = { at: Date.now(), map };
  return map;
}
export async function isRuntimeSwitchOn(key) {
  return (await readRuntimeSwitches())[key] !== false;
}
// True only when the owner switched the function OFF (2029 build; a failed read means ON, i.e. unchanged behavior).
export async function runtimeOff(key) {
  if (typeof __SOD_2029_BUILD__ === "undefined" || !__SOD_2029_BUILD__) return false;
  return (await readRuntimeSwitches())[key] === false;
}
export async function setRuntimeSwitch(key, on) {
  if (!RUNTIME_SWITCH_KEYS.has(key)) throw new Error("unknown runtime switch");
  const { error } = await supabase.rpc("admin_set_runtime_switch", { p_key: key, p_on: !!on });
  if (error) throw error;
  cache = null;
  const map = await readRuntimeSwitches({ fresh: true });
  listeners.forEach((fn) => fn(map));
  return map;
}

// React: {loading, on}. While loading nothing secondary should start (callers wait), so a switched-off
// function never fires its first request.
export function useRuntimeSwitch(key) {
  const [state, setState] = useState(() => cache && Date.now() - cache.at < TTL_MS ? { loading: false, on: cache.map[key] !== false } : { loading: true, on: true });
  useEffect(() => {
    let live = true;
    const apply = (map) => { if (live) setState({ loading: false, on: map[key] !== false }); };
    readRuntimeSwitches().then(apply);
    listeners.add(apply);
    return () => { live = false; listeners.delete(apply); };
  }, [key]);
  return state;
}
