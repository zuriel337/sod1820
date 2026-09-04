// src/lib/dev/glyphPrototypeData.js — SYNTHETIC data only, zero DB/network access.
// Pure, framework-free generator for the 10k Glyph Runtime Golden Prototype
// (Spatial 3D Slice 0 contract validation, work_log 50533e56 + 27c9ad23).
// Same "renderer doesn't know content, only shape" boundary as spatialRenderModel.js —
// this module knows nothing about React/Three; it only produces plain occurrence records.
//
// Six-layer contract mapping (frozen Slice 0):
//   family        -> Layer 1 Character/Grapheme Identity (base letter family, script-neutral)
//   char           -> Layer 2 Textual Occurrence (the EXACT grapheme actually present)
//   variant        -> Layer 3 Representation Variant (final/enlarged/inverted/... taxonomy tag)
//   sourceWitness  -> Layer 4 Source/Witness Representation State (a CLAIM, only on tagged rows)
// Layers 5-6 (Renderable Glyph Representation, Rendering Instance) are the React/Three scene,
// not this module — this module never renders anything.

export const ROWS = 100;
export const COLS = 100;
export const TOTAL_OCCURRENCES = ROWS * COLS; // 10,000

// ---- Layer 1: base letter-family identities (script-neutral, finals NOT forked here) ----
const HEBREW_FAMILIES = ["א","ב","ג","ד","ה","ו","ז","ח","ט","י","כ","ל","מ","נ","ס","ע","פ","צ","ק","ר","ש","ת"];

// Layer 3 taxonomy entry for the final-form Variant: family -> {base grapheme, final grapheme}
export const FINAL_FORM_VARIANTS = {
  "כ": { base: "כ", final: "ך" },
  "מ": { base: "מ", final: "ם" },
  "נ": { base: "נ", final: "ן" },
  "פ": { base: "פ", final: "ף" },
  "צ": { base: "צ", final: "ץ" },
};

// Representative niqqud (combining marks — own Layer-1 identities, script "he-niqqud")
const NIQQUD = [
  { char: "ָ", name: "kamatz" },
  { char: "ֶ", name: "segol" },
  { char: "ִ", name: "hiriq" },
  { char: "ֹ", name: "holam" },
  { char: "ֻ", name: "kubutz" },
];

// Representative te'amim (combining marks — own Layer-1 identities, script "he-taam")
const TEAMIM = [
  { char: "֑", name: "etnachta" },
  { char: "֚", name: "yetiv" },
  { char: "֭", name: "dechi" },
];

const DIGITS = ["0","1","2","3","4","5","6","7","8","9"];
const LATIN = ["A","B","C","D","a","b","c","d"];
// Arabic capability probe only — lam+alef is a classic ligature-joining test pair; not product support.
const ARABIC_PROBE = ["ل","ا","م","ل","ا"];

export const GOLDEN_SET = {
  hebrewBase: HEBREW_FAMILIES,
  hebrewFinals: FINAL_FORM_VARIANTS,
  niqqud: NIQQUD,
  teamim: TEAMIM,
  digits: DIGITS,
  latin: LATIN,
  arabicProbe: ARABIC_PROBE,
};

// One synthetic Peliah-style Source/Witness claim (Layer 4), attached to exactly ONE occurrence.
// Shape follows the frozen Slice 0 Locator Contract convention (meta.ext.locator), in-memory only —
// no research_objects row is written; this is clearly labeled synthetic throughout.
function buildSyntheticSourceWitnessClaim() {
  return {
    variant: "enlarged", // a Layer-3 Representation Variant, asserted here as a Layer-4 CLAIM
    note: "SYNTHETIC — demonstration only, not a real research_objects row",
    locator: {
      book: "ספר הפליאה (synthetic demo)",
      edition_or_witness: "HebrewBooks 6355 (synthetic demo, real witness id reused for realism only)",
      page: { source_page: 319, digital_mirror_page: null, verified: false },
      region: { column: null, bbox: null },
      digital_object_url: null,
      ocr_state: "not_attempted",
      research_object_ref: "synthetic:prototype-demo-only",
    },
  };
}

// Deterministic PRNG so the scene is reproducible across runs/measurements (no Math.random noise).
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Row content plan — deliberately controlled, not random junk, so every Golden Set requirement
// has a dedicated, findable location in the 10,000-occurrence field.
const ROW_PLAN = {
  finalFormDemo: [0, 1, 2, 3, 4],       // one row per final-form family, alternating base/final
  niqqudDemo: 5,                          // base letters carrying representative niqqud
  teamimDemo: 6,                          // base letters carrying representative te'amim
  digitsDemo: 7,
  latinDemo: 8,
  mixedDemo: 9,                           // Hebrew + digits + Latin + RTL/LTR mixed in one row
  arabicProbeDemo: 10,                    // Arabic shaping probe (capability test only)
  sourceWitnessRow: 11,                   // carries the one synthetic Source/Witness claim
  // rows 12..99 = plain Hebrew field (the bulk of the 10,000, matches production ELS windowing)
};

export function buildOccurrences(seed = 1820) {
  const rnd = mulberry32(seed);
  const occurrences = new Array(TOTAL_OCCURRENCES);
  const rowStrings = new Array(ROWS);
  let sourceWitnessIndex = -1;

  for (let row = 0; row < ROWS; row++) {
    const chars = new Array(COLS);
    for (let col = 0; col < COLS; col++) {
      const index = row * COLS + col;
      let family, char, variant = null;

      if (ROW_PLAN.finalFormDemo.includes(row)) {
        const famKey = Object.keys(FINAL_FORM_VARIANTS)[row];
        const pair = FINAL_FORM_VARIANTS[famKey];
        family = famKey;
        const isFinalSlot = col % 2 === 1;
        char = isFinalSlot ? pair.final : pair.base;
        variant = isFinalSlot ? "final" : "base";
      } else if (row === ROW_PLAN.niqqudDemo) {
        const base = HEBREW_FAMILIES[col % HEBREW_FAMILIES.length];
        const nq = NIQQUD[col % NIQQUD.length];
        family = base;
        char = base + nq.char; // grapheme cluster: base + combining niqqud
        variant = "niqqud:" + nq.name;
      } else if (row === ROW_PLAN.teamimDemo) {
        const base = HEBREW_FAMILIES[col % HEBREW_FAMILIES.length];
        const tm = TEAMIM[col % TEAMIM.length];
        family = base;
        char = base + tm.char;
        variant = "taam:" + tm.name;
      } else if (row === ROW_PLAN.digitsDemo) {
        family = "digit";
        char = DIGITS[col % DIGITS.length];
      } else if (row === ROW_PLAN.latinDemo) {
        family = "latin";
        char = LATIN[col % LATIN.length];
      } else if (row === ROW_PLAN.mixedDemo) {
        const pool = [...HEBREW_FAMILIES, ...DIGITS, ...LATIN];
        const c = pool[col % pool.length];
        family = /[0-9]/.test(c) ? "digit" : /[A-Za-z]/.test(c) ? "latin" : c;
        char = c;
        variant = "mixed_rtl_ltr";
      } else if (row === ROW_PLAN.arabicProbeDemo) {
        family = "arabic_probe";
        char = ARABIC_PROBE[col % ARABIC_PROBE.length];
        variant = "arabic_shaping_probe";
      } else if (row === ROW_PLAN.sourceWitnessRow && col === 42) {
        family = "ב";
        char = "ב";
        variant = "enlarged";
        sourceWitnessIndex = index;
      } else if (row === ROW_PLAN.sourceWitnessRow) {
        family = HEBREW_FAMILIES[col % HEBREW_FAMILIES.length];
        char = family;
      } else {
        const famIdx = Math.floor(rnd() * HEBREW_FAMILIES.length);
        family = HEBREW_FAMILIES[famIdx];
        char = family;
      }

      chars[col] = char;
      occurrences[index] = { index, row, col, family, char, variant, sourceWitness: null };
    }
    rowStrings[row] = chars.join("");
  }

  if (sourceWitnessIndex >= 0) {
    occurrences[sourceWitnessIndex].sourceWitness = buildSyntheticSourceWitnessClaim();
  }

  return { occurrences, rowStrings, sourceWitnessIndex };
}

// A synthetic ELS-result-SHAPED trajectory (positions/skip/direction) — NOT a real ELS search,
// just data shaped like one, to test highlight-update cost without touching the ELS engine.
export function buildSyntheticElsPath(occurrences, { count = 64, skip = 17, startIndex = 1234, direction = 1 } = {}) {
  const path = [];
  let idx = startIndex;
  for (let step = 0; step < count && path.length < count; step++) {
    idx = ((idx + skip * direction) % TOTAL_OCCURRENCES + TOTAL_OCCURRENCES) % TOTAL_OCCURRENCES;
    path.push({ step, index: idx, skip, direction, row: Math.floor(idx / COLS), col: idx % COLS });
  }
  return path;
}
