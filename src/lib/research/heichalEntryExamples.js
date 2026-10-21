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

// ---- Domain gates: visual doors (NAVIGATION) into EXISTING surfaces; none is a new product ----
// HEICHAL-PREVIEW-ONLY-20261021: in the development preview every surface is open for work and viewing, so the gates only
// navigate. They carry no open/closed/registered state and read no site flags. Privacy and RLS stay enforced by the
// destination surfaces themselves (a gate to a personal surface grants nothing).
export const HEICHAL_DOMAIN_GATES = Object.freeze([
  Object.freeze({ key: "gematria", label: "גימטריה ומספרים", detail: "מחשבון ודף המספר", href: "/calculator" }),
  Object.freeze({ key: "els", label: "הצופן התנכי", detail: "ELS ומקורות", href: "/code" }),
  Object.freeze({ key: "books", label: "ספרים ומקורות", detail: "עיון במקורות", href: "/books" }),
  Object.freeze({ key: "world", label: "עולם", detail: "סיפור, תאריך, מקום ונושא", href: "/world" }),
  Object.freeze({ key: "journey", label: "מסע החיים שלי", detail: "אישי ופרטי", href: "/journey", personal: true }),
  // The Kingdom route is registered only in a build with VITE_KINGDOM_PREVIEW; without it there is no destination to navigate to.
  Object.freeze({ key: "kingdom", label: "ממלכת המספרים", detail: "משחק", href: "/kingdom", requiresKingdomBuild: true }),
]);

export function projectDomainGates({ kingdomBuild = false } = {}) {
  return HEICHAL_DOMAIN_GATES
    .filter((gate) => !gate.requiresKingdomBuild || kingdomBuild)
    .map((gate) => ({ key: gate.key, label: gate.label, detail: gate.detail, href: gate.href, personal: Boolean(gate.personal) }));
}
