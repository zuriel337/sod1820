// Private search wall writer (ZURIEL 21.11.2026). What a visitor typed in the gematria calculators, the Bible-code search and
// the site search is sent once it settles (not per keystroke) to log_search_2029: term, regular value, source. No identity is
// sent or stored. Bots and the anonymous mode ("חיפוש בלי שמירה") are never logged. Shown to admins only; never public.
import { supabase } from "./supabase.js";
import { isBot } from "./botVerdict.js";
import { isAnon } from "./privacy.js";

export const SEARCH_SOURCES = Object.freeze(["gematria", "els", "site"]);
export const SEARCH_SETTLE_MS = 1500;
const timers = new Map(), lastSent = new Map();
let unavailable = false;

export const normalizeSearchTerm = term => String(term ?? "").replace(/\s+/g, " ").trim().slice(0, 120);

// The regular (רגיל) value from a method profile, when the caller has one.
export function regularValueOf(rows) {
  const row = Array.isArray(rows) ? rows.find(r => r?.methodKey === "רגיל" || r?.displayLabel === "רגיל") : null;
  const value = Number(row?.computedValue ?? row?.value);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function logSearch2029(term, value = null, source = "gematria", { rpc = (_name, args) => supabase.rpc("log_search_2029", args), settleMs = SEARCH_SETTLE_MS } = {}) {
  const t = normalizeSearchTerm(term);
  if (!SEARCH_SOURCES.includes(source) || !t || !/[א-תA-Za-z0-9]/.test(t)) return false;
  if (unavailable || isBot() || isAnon()) return false;
  clearTimeout(timers.get(source));
  timers.set(source, setTimeout(() => {
    timers.delete(source);
    if (lastSent.get(source) === t || isAnon()) return;
    lastSent.set(source, t);
    Promise.resolve(rpc("log_search_2029", { p_term: t, p_value: Number.isSafeInteger(value) ? value : null, p_source: source }))
      .then(result => { if (result?.error?.code === "PGRST202" || result?.status === 404) unavailable = true; }) // writer not applied yet: stop for this page life
      .catch(() => {}); // never breaks the page
  }, settleMs));
  return true;
}
