// Parity test — Normalization v1 (2026-08-21 GO).
// Compares JS gematria.js output against SQL fn_normalize_for_calc + *_calc, captured live
// from the DB in test/fixtures/normalize-parity.json. Any mismatch = failure (exit 1).
// This does NOT touch the DB — it is a pure offline comparison against a frozen snapshot.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { METHODS, DEPTH_METHODS, normalizeForCalc } from "../src/lib/gematria.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(join(__dirname, "fixtures/normalize-parity.json"), "utf-8"));

const ALL = [...METHODS, ...DEPTH_METHODS];
const byKey = Object.fromEntries(ALL.map(m => [m.key, m]));

// exact 14-method mapping used by gw_enforce_engine (SQL calc-function name -> gematria.js METHODS key)
const SQL_TO_JS_KEY = {
  ragil: "רגיל", misratar: "מסתתר", miluy: "מילוי", kadmi: "קדמי", gadol: "גדול",
  siduri: "סידורי", atbash: "אתבש", albam: "אלבם", miluy_demiluy: "מילוי דמילוי",
  kadmi_gadol: "משולש גדול", ribua: "ריבוע", ribua_gadol: "ריבוע גדול",
  hakpala: "הכפלה", hakpala_gadol: "הכפלה גדולה",
};

let total = 0, pass = 0, fail = 0;
const failures = [];

for (const row of fixture) {
  const jsNormalized = normalizeForCalc(row.phrase);
  if (jsNormalized !== row.v_calc) {
    fail++; total++;
    failures.push({ phrase: row.phrase, field: "normalizeForCalc", sql: row.v_calc, js: jsNormalized });
    continue;
  }
  for (const [sqlKey, jsKey] of Object.entries(SQL_TO_JS_KEY)) {
    total++;
    const method = byKey[jsKey];
    if (!method) { fail++; failures.push({ phrase: row.phrase, field: sqlKey, error: `no JS method for key "${jsKey}"` }); continue; }
    const jsVal = method.fn(row.phrase); // JS methods take the ORIGINAL phrase; normalizeForCalc is applied inside mistater/ribua/ribuaGadol, and is a no-op for additive methods (onlyHeb already strips non-letters)
    const sqlVal = row[sqlKey];
    if (jsVal === sqlVal) pass++;
    else { fail++; failures.push({ phrase: row.phrase, field: sqlKey, sql: sqlVal, js: jsVal }); }
  }
}

console.log(`Normalization v1 parity test — ${fixture.length} phrases, ${total} value-checks`);
console.log(`PASS: ${pass}  FAIL: ${fail}`);
if (failures.length) {
  console.log("\nFAILURES:");
  for (const f of failures) console.log(JSON.stringify(f));
  process.exitCode = 1;
} else {
  console.log("\nAll checks passed — JS and SQL agree on every method for every fixture phrase.");
}
