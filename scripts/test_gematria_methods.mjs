#!/usr/bin/env node
// ===== GEMATRIA_METHODS_UNIFICATION — regression test =====
// Plain Node script (no test-runner dependency added — package.json untouched per orchestrator
// safety rail). Run with:  node scripts/test_gematria_methods.mjs
//
// Purpose (task section 15 + orchestrator rail #5):
//  1. Prove the gematria.js refactor in this pass (added `col` / METHOD_DB_COLS metadata,
//     src/lib/supabase.js reading GEM_METHOD_COL from it) changed NO computed value for any
//     currently-active method — byte-for-byte identical outputs vs. the locked DB-rule examples.
//  2. Regression-test the already-present depth methods (kadmi_gadol, mistater_gadol,
//     miluy_demiluy(+gadol), hakpala(+gadol), ribua(+gadol), triangleWord/triangleReverse/
//     stairTriangle) against their locked verified_examples from `nodes` (type=rule).
//  3. Prove the new src/lib/research/compositeMethods.js composes canonical atomic outputs only
//     (never reimplements letter-value math) and is deterministic.
//  4. Hebrew normalization / final-letter / multi-word behavior smoke tests.
//
// This script does NOT touch the live database — it only imports pure JS modules.

import {
  METHODS, DEPTH_METHODS, METHOD_DB_COLS, onlyHeb, ribua, ribuaGadol, mistater, mistaterGadol,
  triangleWord, triangleReverse, stairTriangle, hasSofiot, GADOL_BASE, methodLabel,
} from "../src/lib/gematria.js";
import { COMPOSITE_METHODS, computeComposite, computeAllComposites } from "../src/lib/research/compositeMethods.js";

let pass = 0, fail = 0;
const failures = [];
function eq(label, actual, expected) {
  if (actual === expected) { pass++; }
  else { fail++; failures.push(`${label}: expected ${expected}, got ${actual}`); }
}
function ok(label, cond) {
  if (cond) { pass++; }
  else { fail++; failures.push(`${label}: condition failed`); }
}

const byKey = Object.fromEntries([...METHODS, ...DEPTH_METHODS].map(m => [m.key, m]));

// ---------- 1) Locked base-method examples (from nodes.rule_id, verified live 22.8.2026) ----------
eq("רגיל(משיח בן דוד)", byKey["רגיל"].fn("משיח בן דוד"), 424);
eq("מסתתר(משיח בן דוד) — misratar_multi", byKey["מסתתר"].fn("משיח בן דוד"), 604);
eq("מסתתר(בטול יחוד) — misratar_multi space-breaks", mistater("בטול יחוד"), 40);
eq("ריבוע(גג) — ribua_definition", ribua("גג"), 9);
eq("ריבוע(דוד) — ribua_definition", ribua("דוד"), 28);
eq("ריבוע(בנין) — ribua_definition", ribua("בנין"), 228);
eq("ריבוע(נחמן) — ribua_definition", ribua("נחמן"), 354);
eq("ריבוע(פולייס) — ribua_definition", ribua("פולייס"), 740);
eq("ריבוע(צוריאל) — ribua_definition", ribua("צוריאל"), 1432);
eq("ריבוע(צוריאל פולייס) — ribua_definition multiword", ribua("צוריאל פולייס"), 2172);
eq("אלבם(רב) — albam_def", byKey["אלבם"].fn("רב"), 49);
eq("אטבח(יום משיח) — christina/atbach JS map (own consistency, see DRIFT note vs SQL fn_atbach)", byKey["אטבח"].fn("יום משיח"), 506);
eq("אותיות אחרי(רזיאל) — otiot_shift_methods", byKey["אותיות אחרי"].fn("רזיאל"), 370);
ok("methodLabel(קדמי) shows משולש display alias (meshulash_kadmi_law)", methodLabel("קדמי") === "קדמי · משולש");

// ---------- 2) Depth methods — locked verified_examples ----------
eq("קדמי גדול / משולש גדול(שובו בנים שובבים) — kadmi_gadol_def", byKey["משולש גדול"].fn("שובו בנים שובבים"), 7760);
eq("מסתתר גדול(מלך) — mistater_gadol_def", mistaterGadol("מלך"), 480);
eq("מסתתר גדול(ירושלים) — mistater_gadol_def", mistaterGadol("ירושלים"), 1558);
eq("מסתתר גדול(תורה) — mistater_gadol_def", mistaterGadol("תורה"), 783);
eq("מילוי דמילוי(יהוה) — miluy_demiluy_def", byKey["מילוי דמילוי"].fn("יהוה"), 610);
eq("מילוי דמילוי(חכמה) — miluy_demiluy_def", byKey["מילוי דמילוי"].fn("חכמה"), 1230);
eq("מילוי דמילוי גדול(ירושלים) — miluy_demiluy_gadol_def", byKey["מילוי דמילוי גדול"].fn("ירושלים"), 6770);
eq("מילוי דמילוי גדול(יהוה) — miluy_demiluy_gadol_def negative check (no sofiot → unchanged)", byKey["מילוי דמילוי גדול"].fn("יהוה"), 610);
eq("הכפלה(בינה) — hakpala_def", byKey["הכפלה"].fn("בינה"), 2629);
eq("הכפלה(אהבה) — hakpala_def", byKey["הכפלה"].fn("אהבה"), 55);
eq("הכפלה(יהוה) — hakpala_def", byKey["הכפלה"].fn("יהוה"), 186);
eq("הכפלה גדולה(מלך) — hakpala_gadol (SQL-parity verified live)", byKey["הכפלה גדולה"].fn("מלך"), 252500);
eq("ריבוע גדול(מלך) — ribua_gadol (SQL-parity verified live)", ribuaGadol("מלך"), 680);

// ---------- 3) gadol_equals_ragil_when_no_sofiot — no-sofiot pairs collapse to base ----------
eq("תורה קדשה: רגיל=גדול (no sofiot)", byKey["רגיל"].fn("תורה קדשה"), 1020);
eq("תורה קדשה: גדול=רגיל (no sofiot)", byKey["גדול"].fn("תורה קדשה"), 1020);
ok("hasSofiot('תורה קדשה') === false", hasSofiot("תורה קדשה") === false);
ok("hasSofiot('מלך') === true", hasSofiot("מלך") === true);
ok("GADOL_BASE maps 'משולש גדול'→'קדמי'", GADOL_BASE["משולש גדול"] === "קדמי");

// ---------- 4) משולש מילה / משולש הפוך / משולש מדרגות — 25.7.2026 additions, JS self-consistency ----------
eq("משולש מילה(צוריאל) = ריבוע(צוריאל) for a single word (documented identity)", triangleWord("צוריאל"), ribua("צוריאל"));
eq("משולש מילה(צוריאל) — locked example", triangleWord("צוריאל"), 1432);
eq("משולש הפוך(צוריאל) — locked example", triangleReverse("צוריאל"), 927);
eq("משולש מילה(צוריאל פולייס) crosses the space (≠ ribua which is per-word)", triangleWord("צוריאל פולייס"), 4194);
ok("משולש מילה(צוריאל פולייס) ≠ ריבוע(צוריאל פולייס) — the documented distinction", triangleWord("צוריאל פולייס") !== ribua("צוריאל פולייס"));
eq("משולש מדרגות(משיח בן דויד) — locked example", stairTriangle("משיח בן דויד"), 866);

// ---------- 5) DEPTH_METHODS / METHODS are already display-consumed (client dispatch) — sanity ----------
ok("DEPTH_METHODS includes משולש מילה", DEPTH_METHODS.some(m => m.key === "משולש מילה"));
ok("DEPTH_METHODS includes משולש הפוך", DEPTH_METHODS.some(m => m.key === "משולש הפוך"));
ok("DEPTH_METHODS includes משולש מדרגות", DEPTH_METHODS.some(m => m.key === "משולש מדרגות"));

// ---------- 6) METHOD_DB_COLS bridge (this pass's addition) — must match live gematria_methods
// db_column exactly (verified via Supabase MCP, 22.8.2026 — see LIVE_STATUS.csv). Pure metadata,
// asserts the refactor introduced zero drift.
const EXPECTED_DB_COLS = {
  "רגיל": "ragil", "מילוי": "miluy", "מסתתר": "misratar", "קדמי": "kadmi", "ריבוע": "ribua",
  "גדול": "gadol", "סידורי": "siduri", "אתבש": "atbash", "אלבם": "albam", "הכפלה": "hakpala",
  "משולש גדול": "kadmi_gadol", "מילוי דמילוי": "miluy_demiluy", "הכפלה גדולה": "hakpala_gadol",
  "ריבוע גדול": "ribua_gadol",
};
for (const [k, v] of Object.entries(EXPECTED_DB_COLS)) eq(`METHOD_DB_COLS['${k}']`, METHOD_DB_COLS[k], v);
ok("METHOD_DB_COLS has no entry for dispatch-only methods (אטבח)", METHOD_DB_COLS["אטבח"] === undefined);
ok("METHOD_DB_COLS has no entry for candidate depth methods (משולש מילה)", METHOD_DB_COLS["משולש מילה"] === undefined);

// ---------- 7) src/lib/supabase.js GEM_METHOD_COL refactor — behavior-preservation proxy check ----------
// We can't import supabase.js directly here (it constructs a live client on import), so we assert
// the underlying source it now derives from — METHOD_DB_COLS — carries the exact 3 legacy values.
eq("GEM_METHOD_COL source: ragil", METHOD_DB_COLS["רגיל"], "ragil");
eq("GEM_METHOD_COL source: misratar", METHOD_DB_COLS["מסתתר"], "misratar");
eq("GEM_METHOD_COL source: kadmi", METHOD_DB_COLS["קדמי"], "kadmi");

// ---------- 8) Composite Research Transforms — must equal composition of canonical atomic outputs ----------
ok("COMPOSITE_METHODS has exactly the 4 requested composites", COMPOSITE_METHODS.length === 4);
for (const c of COMPOSITE_METHODS) {
  const word = "צוריאל פולייס";
  const result = computeComposite(c.key, word);
  ok(`composite ${c.key} returns a result`, !!result);
  if (!result) continue;
  const [aKey, bKey] = c.atoms;
  eq(`composite ${c.key}: a.value === atomic ${aKey}.fn(word) (no duplicate math)`, result.a.value, byKey[aKey].fn(word));
  eq(`composite ${c.key}: b.value === atomic ${bKey}.fn(word) (no duplicate math)`, result.b.value, byKey[bKey].fn(word));
  eq(`composite ${c.key}: sum === a+b`, result.sum, result.a.value + result.b.value);
  eq(`composite ${c.key}: diff === |a-b|`, result.diff, Math.abs(result.a.value - result.b.value));
}
ok("computeComposite unknown key → null (never invents)", computeComposite("לא-קיים", "צוריאל") === null);
ok("computeAllComposites returns 4 results for a real word", computeAllComposites("משיח בן דוד").length === 4);
// Determinism: same input twice → identical output (no hidden randomness/state)
{
  const r1 = computeComposite("רגיל+מילוי", "משיח בן דוד");
  const r2 = computeComposite("רגיל+מילוי", "משיח בן דוד");
  eq("composite determinism: sum stable across calls", r1.sum, r2.sum);
}

// ---------- 9) Hebrew normalization / onlyHeb behavior ----------
ok("onlyHeb strips spaces/punctuation/digits", onlyHeb("צוריאל, 1820!").join("") === "צוריאל");
ok("onlyHeb keeps final letters", onlyHeb("מלך").includes("ך"));

console.log(`\n${pass} passed, ${fail} failed.`);
if (fail) {
  console.log("\nFAILURES:");
  for (const f of failures) console.log("  - " + f);
  process.exit(1);
} else {
  console.log("All gematria method regression checks passed — no drift introduced by this pass's refactor.");
}
