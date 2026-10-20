// Heichal entry, stage 2: PRESENTATION data for the compact entry (HEICHAL-HYBRID-20261019, HEICHAL-13-STATIC-FIRST,
// HEICHAL-DEMO-776, HEICHAL-ENTRY-SCREEN). No engine, no network, no storage, no dispatch.
//
//  - The two examples are static editorial content approved by ZURIEL. Every number shown is DERIVED here with the canonical
//    client engine function calcGem (regular method); an example whose numbers do not reproduce is not rendered (fail closed).
//    An arithmetic equality is a calculation fact; the quoted reading is an attributed interpretation and is kept separate.
//  - Domain gates only PROJECT availability: the access state is resolved by the existing resolveFeatureState over the real
//    site_flags, never invented here. A gate that is closed shows the truth and does not link.
import { calcGem } from "../../theme.js";

const HEBREW_LETTER = /[א-ת]/;

export const ENTRY_METHOD_LABEL = "גימטריה רגילה";

export const HEICHAL_ENTRY_EXAMPLES = Object.freeze([
  Object.freeze({
    key: "love-one",
    order: 1,
    activation: "static", // open on first sight, no animation, no engine run
    title: "אהבה = אחד",
    expressions: Object.freeze(["אהבה", "אחד"]),
    total: 13,
    interpretation: null,
    exploreExpression: "אהבה",
  }),
  Object.freeze({
    key: "messiah-coincidence",
    order: 2,
    activation: "explicit", // shown only after the person asks for the next example
    title: "ביאת המשיח = צירוף מקרים",
    expressions: Object.freeze(["ביאת המשיח", "צירוף מקרים"]),
    total: 776,
    interpretation: Object.freeze({
      attributedTo: "בעל האתר",
      text: "כשיודעים לצרף את המקרים, מתחילים להבין מה זה משיח",
      status: "פרשנות ורמז, לא הוכחה סיבתית ולא תחזית",
    }),
    exploreExpression: "ביאת המשיח",
  }),
]);

// Letter-by-letter breakdown of one word, derived from the canonical per-letter value.
export function letterBreakdown(word) {
  return [...String(word || "")].filter((ch) => HEBREW_LETTER.test(ch)).map((ch) => ({ letter: ch, value: calcGem(ch) }));
}

// One expression → its words (each with its letters and value) and its total. Derived, never typed in.
export function breakdownExpression(expression) {
  const words = String(expression || "").trim().split(/\s+/).filter(Boolean).map((word) => ({
    word,
    value: calcGem(word),
    letters: letterBreakdown(word),
  }));
  return { expression: String(expression || "").trim(), words, total: calcGem(String(expression || "")) };
}

// Projected example, or null when the numbers do not reproduce with the canonical function (fail closed).
export function projectEntryExample(example) {
  if (!example || !Array.isArray(example.expressions)) return null;
  const rows = example.expressions.map(breakdownExpression);
  const verified = rows.length >= 2 && rows.every((row) => row.total === example.total
    && row.words.reduce((sum, word) => sum + word.value, 0) === row.total
    && row.words.every((word) => word.letters.reduce((sum, letter) => sum + letter.value, 0) === word.value));
  if (!verified) return null;
  return {
    key: example.key,
    title: example.title,
    method: ENTRY_METHOD_LABEL,
    total: example.total,
    rows,
    interpretation: example.interpretation,
    activation: example.activation,
    exploreExpression: example.exploreExpression,
    // The equality is an arithmetic fact; it is never described as proof of meaning.
    factLabel: "שוויון גימטרי · עובדה חשבונית",
  };
}

export function projectEntryExamples() {
  return HEICHAL_ENTRY_EXAMPLES.map(projectEntryExample).filter(Boolean);
}

// ---- Domain gates (visual doors into EXISTING surfaces; none is a new product) ----
export const HEICHAL_DOMAIN_GATES = Object.freeze([
  Object.freeze({ key: "gematria", label: "גימטריה ומספרים", detail: "מחשבון ודף המספר", href: "/2029/calculator", flag: null, requireFlag: false }),
  Object.freeze({ key: "els", label: "הצופן התנכי", detail: "ELS ומקורות", href: "/code", flag: "lock_els", requireFlag: false }),
  Object.freeze({ key: "books", label: "ספרים ומקורות", detail: "עיון במקורות", href: "/books", flag: "lock_books", requireFlag: true }),
  Object.freeze({ key: "world", label: "עולם", detail: "סיפור, תאריך, מקום ונושא", href: "/world", flag: "lock_world", requireFlag: false }),
  Object.freeze({ key: "journey", label: "מסע החיים שלי", detail: "אישי ופרטי", href: "/2029/journey", flag: "lock_life_journey", requireFlag: true, personal: true }),
  Object.freeze({ key: "kingdom", label: "ממלכת המספרים", detail: "משחק", href: "/2029/kingdom", flag: null, requireFlag: false, preview: true }),
]);

const STATE_LABEL = Object.freeze({
  open: "פתוח",
  registered_only: "למשתמשים רשומים בלבד",
  closed: "סגור כרגע",
  preview_only: "פריוויו בלבד",
  not_open: "פריוויו בלבד · לא פתוח",
  checking: "בודק זמינות…",
  unknown: "זמינות לא ידועה",
});

// flagsStatus: "loading" | "ready" | "unknown" (the read failed, timed out or returned no flags at all).
// lock: the raw site_flags row for the gate's flag (null when the row is missing).
// resolved: the result of the existing resolveFeatureState(lock, ...) - the canonical availability contract.
// A state is "open" only when it is KNOWN to be open: either the route carries no site flag, or the expected flag row was
// read and the canonical contract allows it. A failed/empty read or a missing expected row is "unknown", never "open".
// (A requireFlag route with a missing row is canonically closed - that is the contract's own answer, not a guess.)
export function projectDomainGate(gate, { flagsStatus = "ready", lock = null, resolved = null, kingdomPreview = false } = {}) {
  const base = { key: gate.key, label: gate.label, detail: gate.detail, personal: Boolean(gate.personal) };
  const make = (state, href = null) => ({ ...base, state, stateLabel: STATE_LABEL[state], href });
  if (gate.preview) {
    // Kingdom is a prototype gated by VITE_KINGDOM_PREVIEW: it opens only in a preview build, never in a public one.
    return kingdomPreview ? make("preview_only", gate.href) : make("not_open");
  }
  if (!gate.flag) return make("open", gate.href); // the route table carries no site flag for this door
  if (flagsStatus === "loading") return make("checking");
  if (flagsStatus !== "ready") return make("unknown");
  if (!lock && !gate.requireFlag) return make("unknown"); // expected flag not returned: do not promise openness
  if (!resolved) return make("unknown");
  if (resolved.blocked) return make(resolved.publicState === "registered_only" ? "registered_only" : "closed");
  return make("open", gate.href);
}
