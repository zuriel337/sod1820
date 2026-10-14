// Owner-controlled runtime switches for secondary functions. ONE owner: the existing public `site_flags` table
// (site_flags_lock_law v3), under its own `fx_` key prefix so they can never be mistaken for `lock_*` access locks.
// Semantics for `fx_*` rows ONLY: enabled=true -> ON, enabled=false -> OFF. Missing/failed reads use each entry's
// default: existing capabilities stay ON; opt-in optimizations stay OFF and retain the current execution path.
// Switches never gate user saves, authorization or consent.
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
  { key: "fx_home_convergences", group: "בית", label: "התכנסויות בולטות", mode: "freeze", note: "הרצועה מתחת לעדכונים האחרונים. כבוי = ממשיכה להציג את מה שנשמר אצל הגולש, בלי בקשות ובלי עדכון" },
  { key: "fx_world_discovery", group: "עולם", label: "זרם הגילוי בעולם", note: "פוסטים, ממצאי מחקר, הגעות קבוצה; מתרענן כל דקה" },
  { key: "fx_els_gallery", group: "צפנים", label: "גלריית הצפנים השמורים בכלי", note: "60 מטריצות מהענן בכל פתיחה" },
  { key: "fx_world_relation_identity", group: "האצות", label: "מעבר קל בין קשרים בעולם", mode: "optimization", defaultOn: false, note: "מזהה את יעד הקשר בלי להכין מראש את כל המחקר שלו. כיבוי מחזיר את דרך הטעינה הקיימת; התוכן נשמר" },
  { key: "fx_number_lookup_page", group: "האצות", label: "האצת חיפוש המספרים", mode: "optimization", defaultOn: false, requiresRpc: "fn_number_lookup_2029_page", note: "מחשב את הפירוט היקר רק לעמוד התוצאות המוחזר. כיבוי משאיר את המימוש המאובטח הקיים; המספרים, הספירות וההרשאות נשמרים" },
]);
export const RUNTIME_SWITCH_KEYS = new Set(RUNTIME_SWITCHES_2029.map((entry) => entry.key));
export { RUNTIME_SWITCH_COSTS_2029 } from "./runtimeSwitchCosts2029.js";

const TTL_MS = 30_000;
let cache = null;
const listeners = new Set();

// A switch is a performance/owner control, not an authorization lock, so a short in-memory window is fine.
export function switchesFromFlags(flags = {}) {
  const map = {};
  for (const { key, defaultOn = true } of RUNTIME_SWITCHES_2029) {
    const value = flags?.[key]?.enabled;
    map[key] = typeof value === "boolean" ? value : defaultOn;
  }
  return map;
}
export async function readRuntimeSwitches({ fresh = false } = {}) {
  if (!fresh && cache && Date.now() - cache.at < TTL_MS) return cache.map;
  let map;
  try { map = switchesFromFlags(await getSiteFlags()); } catch { map = switchesFromFlags({}); }
  cache = { at: Date.now(), map };
  return map;
}
// "Freeze" switches (entry.mode === "freeze"): ON = fetch and refresh the saved copy; OFF = show the last saved copy
// (kept in this browser) with no request and no update. No saved copy yet => nothing is shown.
const SNAP_PREFIX = "sod_fx_snapshot:";
const SNAP_MAX_CHARS = 200_000;
export function readFrozenSnapshot(key) {
  try { const raw = localStorage.getItem(SNAP_PREFIX + key); const row = raw ? JSON.parse(raw) : null; return row && "data" in row ? row.data : null; } catch { return null; }
}
export function saveFrozenSnapshot(key, data) {
  try { const raw = JSON.stringify({ at: new Date().toISOString(), data }); if (raw.length <= SNAP_MAX_CHARS) localStorage.setItem(SNAP_PREFIX + key, raw); } catch { /* storage unavailable: nothing to keep */ }
}

// Test hook: seed the in-memory window with an exact switch map.
export function primeRuntimeSwitches(map) { cache = { at: Date.now(), map: { ...switchesFromFlags({}), ...map } }; }
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
  const entry = RUNTIME_SWITCHES_2029.find((item) => item.key === key);
  // A flag must not claim the optimized DB path is ready before its additive migration exists.
  // NULL matches no number: this checks availability without fetching a user's research rows.
  if (on && entry?.requiresRpc) {
    const { error: probeError } = await supabase.rpc(entry.requiresRpc, { p_value: null, p_limit: 1, p_after_bid_id: null });
    if (probeError?.code === "PGRST202") throw new Error("עדכון המסד להאצה הזו עדיין לא הותקן. המימוש הקיים נשאר פעיל.");
    if (probeError) throw probeError;
  }
  const { error } = await supabase.rpc("admin_set_runtime_switch", { p_key: key, p_on: !!on });
  if (error) throw error;
  cache = null;
  // Verify the write with a new read, not the permissive startup reader or a pre-write in-flight request.
  let rows;
  try {
    const result = await supabase.from("site_flags").select("key,enabled");
    if (result.error) throw result.error;
    rows = result.data;
    if (!Array.isArray(rows) || rows.find((row) => row.key === key)?.enabled !== !!on) throw new Error("flag readback mismatch");
  } catch (cause) {
    const failure = new Error("בקשת השינוי נשמרה, אבל לא ניתן לאמת את המצב הנוכחי. רענן את לוח הבקרה לפני הבדיקה.", { cause });
    failure.code = "RUNTIME_SWITCH_STATE_UNVERIFIED";
    throw failure;
  }
  const map = switchesFromFlags(Object.fromEntries(rows.map((row) => [row.key, row])));
  cache = { at: Date.now(), map };
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
