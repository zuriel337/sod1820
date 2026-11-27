// /number, the landing of the number page (ZURIEL 27.11.2026): one small module of pure helpers and two bounded readers. It owns no engine, no count and no store:
// gematria values come from the existing client preview (settled by fn_method_profile on the number page), hot numbers from research_pulse_2029, the foundation
// numbers from number_anchors (value and category only), the admitted numbers from sitemap_numbers (the same public decision the number documents use).
// A reader that fails yields null and the surface draws nothing: no zero and no old-wall fallback is ever invented.
import { supabase } from "../supabase.js";
import { numberPageHref } from "./numberPageAddress.js";

export const SEARCH_MODES = Object.freeze([
  ["expression", "ביטוי או מספר"],
  ["reverse", "הפוך: מספר ← ביטויים"],
  ["method", "לפי שיטה"],
  ["cross", "הצלבת ביטויים"],
]);

const clean = value => value == null ? "" : String(value).trim().replace(/\s+/g, " ");
export const isNumericTerm = term => /^\d{1,9}$/.test(clean(term));

/** The one address of the number page: a number or an expression, optionally in one method (the existing ?method= focus). */
export function landingHref(term, { method = null } = {}) {
  const text = clean(term);
  if (!text) return null;
  const base = numberPageHref(text);
  const key = clean(method);
  return key ? `${base}${base.includes("?") ? "&" : "?"}method=${encodeURIComponent(key)}` : base;
}

// ---- the Hebrew date (Asia/Jerusalem): "the number of the day" changes with it, the same number for everyone on the same date ----
const HEBREW_PARTS = new Intl.DateTimeFormat("en-u-ca-hebrew", { timeZone: "Asia/Jerusalem", year: "numeric", month: "long", day: "numeric" });
const HEBREW_LABEL = new Intl.DateTimeFormat("he-u-ca-hebrew", { timeZone: "Asia/Jerusalem", day: "numeric", month: "long", year: "numeric" });

function hashText(text) {
  let h = 2166136261;
  for (const ch of String(text)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

/** { key, label } of the Hebrew date: key is stable for the whole date, label is the readable date. */
export function hebrewDay(date = new Date()) {
  const parts = Object.fromEntries(HEBREW_PARTS.formatToParts(date).map(part => [part.type, part.value]));
  return { key: `${parts.relatedYear || parts.year}|${parts.month}|${parts.day}`, label: HEBREW_LABEL.format(date) };
}

/** The number of the day: one of the approved foundation numbers, chosen by the Hebrew date (deterministic, never random). */
export function numberOfTheDay(anchors, date = new Date()) {
  const pool = [...new Map((Array.isArray(anchors) ? anchors : []).filter(row => Number.isSafeInteger(row?.value) && row.value > 0).map(row => [row.value, row])).values()]
    .sort((a, b) => a.value - b.value);
  if (!pool.length) return null;
  const day = hebrewDay(date);
  return { ...pool[hashText(day.key) % pool.length], dateLabel: day.label };
}

/** Foundation numbers grouped by their approved classification (the larger groups first), values ascending. */
export function foundationGroups(anchors) {
  const groups = new Map();
  for (const row of Array.isArray(anchors) ? anchors : []) {
    const category = clean(row?.category);
    if (!category || !Number.isSafeInteger(row?.value) || row.value <= 0) continue;
    if (!groups.has(category)) groups.set(category, new Set());
    groups.get(category).add(row.value);
  }
  return [...groups.entries()].map(([category, values]) => ({ category, values: [...values].sort((a, b) => a - b) }))
    .sort((a, b) => b.values.length - a.values.length || a.category.localeCompare(b.category, "he"));
}

/** A number to open for "surprise me": any admitted public number except the one the visitor just saw. */
export function pickSurprise(admitted, { avoid = null, random = Math.random } = {}) {
  const pool = (Array.isArray(admitted) ? admitted : []).filter(value => Number.isSafeInteger(value) && value !== avoid);
  return pool.length ? pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))] : null;
}

// ---- Hebrew names of the mathematical families the existing profile reports (a family without a name here is not drawn: nothing is invented) ----
export const FAMILY_NAMES = Object.freeze({
  prime: "ראשוני", semiprime: "מכפלת שני ראשוניים", square: "ריבוע", cube: "קובייה", triangular: "משולש", pentagonal: "מחומש", hexagonal: "משושה",
  heptagonal: "מושבע", octagonal: "מתומן", power_of_two: "חזקת 2", perfect: "מושלם", abundant: "שופע", deficient: "חסר",
  palindrome_base10: "פלינדרום", palindromic_prime_base10: "ראשוני פלינדרומי", repdigit_base10_multi_digit: "ספרה חוזרת", harshad_base10: "מספר הרשד",
  happy_base10: "מספר שמח", narcissistic_base10: "מספר נרקיסיסטי", twin_prime: "ראשוני תאום", cousin_prime: "ראשוני דוד", sexy_prime: "ראשוני סקסי",
  safe_prime: "ראשוני בטוח", left_truncatable_prime: "ראשוני קטום משמאל", right_truncatable_prime: "ראשוני קטום מימין", sophie_germain_prime: "ראשוני סופי ז'רמן", emirp: "ראשוני הפוך", circular_prime: "ראשוני מעגלי", superprime: "ראשוני־על",
});

/** Plain facts of a number for the day card, from the existing mathematical profile (loaded only when the card is drawn). */
export function mathFacts(profile) {
  if (!profile?.arithmetic) return null;
  const arithmetic = profile.arithmetic, digits = profile.digit_structure || {};
  const factors = arithmetic.factorization?.complete ? (arithmetic.factorization.factors || []).map(f => f.exponent > 1 ? `${f.prime}^${f.exponent}` : String(f.prime)).join(" × ") : null;
  const families = (profile.families || []).map(family => FAMILY_NAMES[family.key]).filter(Boolean);
  return { prime: arithmetic.prime === true, factors, digitSum: Number.isFinite(digits.digit_sum) ? digits.digit_sum : null, reversed: Number.isFinite(digits.reversed) ? digits.reversed : null, families };
}

/**
 * Shared values of two expressions from their client previews: one entry per value that both expressions reach, with the methods that reach it on each side.
 * Preview values only; the number page settles them through the canonical method profile.
 */
export function crossMatches(previewA, previewB) {
  const side = preview => (preview?.methods || []).filter(m => m.computedValue > 0).reduce((map, m) => map.set(m.computedValue, [...(map.get(m.computedValue) || []), m.displayLabel]), new Map());
  const a = side(previewA), b = side(previewB);
  return [...a.keys()].filter(value => b.has(value)).sort((x, y) => x - y).map(value => ({ value, methodsA: a.get(value), methodsB: b.get(value) }));
}

// ---- readers (public, bounded, cached for the page session) ----
let anchorsRead = null, admittedRead = null;

/** The approved foundation numbers: value and classification only (the curated fact and hint are not read here). null when unavailable. */
export function readFoundationNumbers() {
  if (!anchorsRead) {
    anchorsRead = Promise.resolve(supabase.from("number_anchors").select("value,category").order("value", { ascending: true }).limit(200))
      .then(({ data, error }) => (error || !Array.isArray(data) || !data.length) ? (anchorsRead = null) : data)
      .catch(() => (anchorsRead = null));
  }
  return anchorsRead;
}

/** The admitted public numbers (sitemap_numbers: the decision the number documents already use), read in pages with an exact total; a partial set is never used. */
export function readAdmittedNumbers() {
  if (!admittedRead) {
    const page = (from, to) => supabase.rpc("sitemap_numbers", {}, { count: "exact" }).range(from, to);
    admittedRead = (async () => {
      const first = await page(0, 999);
      if (first.error || !Array.isArray(first.data)) return null;
      const total = Number(first.count);
      let rows = first.data;
      if (Number.isSafeInteger(total) && total > rows.length) {
        const rest = await page(rows.length, total - 1);
        if (rest.error || !Array.isArray(rest.data)) return null;
        rows = rows.concat(rest.data);
      }
      if (Number.isSafeInteger(total) && rows.length !== total) return null;
      const values = rows.map(row => Number(row.value)).filter(Number.isSafeInteger);
      return values.length ? values : null;
    })().catch(() => null).then(result => { if (!result) admittedRead = null; return result; });
  }
  return admittedRead;
}

export function forgetNumberLandingReads() { anchorsRead = null; admittedRead = null; }
