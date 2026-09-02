// wa-raziel v49 regression test (PRE-MERGE CORRECTION PASS on v48).
// Pure, offline (no DB, no Deno, no network) — this file has TWO jobs, kept separate on purpose:
//
//   1. Verify wa-raziel/index.ts's OWN logic that v49 actually keeps: the HE_DATE_RE fix (mirrored here
//      verbatim — wa-raziel is a Deno .ts file with a jsr: import, so it can't be imported into this Node
//      test directly; same pattern test/normalize-parity.test.mjs uses for SQL-vs-JS parity). If
//      wa-raziel/index.ts's HE_DATE_RE changes, update the mirror below in lockstep.
//
//   2. Verify the SHARED src/lib pipeline (triage.js/analysisFlow.js) directly and independently of any
//      wa-raziel wiring — v49 REMOVED wa-raziel's direct use of this pipeline (no proven server-callable
//      boundary from the Edge runtime — see wa-raziel/index.ts header (a)+(b)), so this corpus no longer
//      claims wa-raziel itself runs compound-claim/arithmetic verification. It proves the shared library
//      ITSELF still works, which is what a future shared-boundary adapter would need to be correct.
import { extractCompoundClaims } from "../src/lib/triage.js";

// ── mirror of wa-raziel/index.ts's v49 HE_DATE_RE (see that file's header point (e)) ──
const HE_VAL = { "א":1,"ב":2,"ג":3,"ד":4,"ה":5,"ו":6,"ז":7,"ח":8,"ט":9,"י":10,"כ":20,"ך":20,"ל":30,"מ":40,"ם":40,"נ":50,"ן":50,"ס":60,"ע":70,"פ":80,"ף":80,"צ":90,"ץ":90,"ק":100,"ר":200,"ש":300,"ת":400 };
function heNumeral(s) { let n = 0; for (const ch of (s || "").replace(/[^א-ת]/g, "")) n += HE_VAL[ch] || 0; return n; }
const HE_DATE_RE = new RegExp("(?:ב(?=[א-ת]{2,3}\\s))?([א-ת]{1,3})['׳\"״]?\\s+(?:ב)?(תשרי|מרחשוון|מרחשון|חשוון|חשון|כסליו|כסלו|טבת|שבט|אדר(?:\\s+[אב])?|ניסן|אייר|סיוון|סיון|תמוז|אב|אלול),?\\s+(ה?['׳]?ת[א-ת\"״'׳]{2,6})");
const GREG_DATE_RE = /\b(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})\b/;

let pass = 0, fail = 0;
function check(label, cond, detail) {
  if (cond) { pass++; }
  else { fail++; console.error(`FAIL: ${label}${detail ? " — " + detail : ""}`); }
}

console.log("=== 1. HE_DATE_RE fix (wa-raziel v49, kept regression) ===");
{
  // REQUIRED (VERIFICATION): "בטו בתשרי התשנ״ה" must be recognized structurally.
  const m = "מה אפשר ללמוד על מי שנולד בטו בתשרי, התשנה?".match(HE_DATE_RE);
  check("wa_bot_log:926 'בטו בתשרי, התשנה' now matches structurally", !!m, JSON.stringify(m));
  if (m) check("day resolves to 15 (טו), not the wrong value from folding in the ב-prefix", heNumeral(m[1]) === 15, `got ${heNumeral(m[1])}`);

  const bare = "טו תשרי תשנה".match(HE_DATE_RE);
  check("previously-working bare form (no prefix) unchanged", !!bare && heNumeral(bare[1]) === 15);

  const bareGeresh = "נולד ה' תשרי תשעח".match(HE_DATE_RE);
  check("previously-working single-letter+geresh day form unchanged (day=5, not folded)", !!bareGeresh && heNumeral(bareGeresh[1]) === 5);

  const control = "מה המסר מהמספר 19:19".match(HE_DATE_RE);
  check("no false-positive date match on a plain number question (19:19 preserved)", control === null);

  const control2 = "מה המסר מהמספר 2323".match(HE_DATE_RE);
  check("no false-positive date match on a plain number question (2323 preserved)", control2 === null);

  const greg = "השם שלי קטי ברדה \nתאריך לידה 30/1/1985\nהייתי רוצה לבדוק עם הקרירה".match(GREG_DATE_RE);
  check("Gregorian DD/MM/YYYY still matches (unchanged, kept from v48)", !!greg && greg[1] === "30" && greg[2] === "1" && greg[3] === "1985");
}

console.log("\n=== 2. Shared pipeline itself (independent of wa-raziel wiring, which v49 removed) ===");
{
  const symbolic1 = extractCompoundClaims("שם ע״ב 72×3=216");
  check("symbolic expression (wa_bot_log:298, 72×3=216) still verified by the shared pipeline itself",
    symbolic1.some((c) => c.status === "ENGINE_VERIFIED_COMPOSITE" && c.result === 216), JSON.stringify(symbolic1));

  const symbolic2 = extractCompoundClaims("543 × 4 גילויים.. = 2172");
  check("symbolic expression (wa_bot_log:346, 543×4=2172) still verified by the shared pipeline itself",
    symbolic2.some((c) => c.status === "ENGINE_VERIFIED_COMPOSITE" && c.result === 2172), JSON.stringify(symbolic2));

  // REQUIRED (VERIFICATION): prose 2172 is either handled by shared infrastructure or explicitly OPEN.
  // v49 removed the WA-local arithmetic cross-check (One-System Law) with no shared home found for it —
  // so this MUST be empty here, and is reported OPEN, not silently patched.
  const prose2172 = extractCompoundClaims(`2172 הוא גימטריה של פסוקית מנבואת בלעם ופסוקית מפרשת ה"מלך":
2172 הוא כפולה של 12 ב-181. גם סכום הספרות 2.1.7.2. הוא 12.`);
  check("STATUS=OPEN: prose 2172 arithmetic claim is NOT caught by shared infra (honest, not silently faked)", prose2172.length === 0, JSON.stringify(prose2172));
}

console.log(`\n${pass} passed, ${fail} failed`);
console.log("\nRegression summary (see PR report for the full crosswalk):");
console.log("  SOLVED   — symbolic arithmetic (298/346), Gregorian dates, Hebrew date structural recognition (926)");
console.log("  OPEN     — prose arithmetic (924, 2172) — needs Contract Change Law §9 shared-registry extension");
console.log("  UNCHANGED/PRESERVED — 19:19 (914), 2323 (917) produce no false positives");
console.log("  NOT RE-VERIFIED HERE (needs a live LLM call, out of scope for an offline test) — sensitive spouse/gambling (916) no-authority guardrail: unchanged prompt rules 2/11 in SYSTEM_BASE, not exercised by this file");
if (fail > 0) process.exit(1);
