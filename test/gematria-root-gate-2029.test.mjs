import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { extractPostGematriaClaims, claimsFromUnitItems, rootGateFindings } from "../scripts/lib/gematriaRootGate2029.mjs";

// gematria_auto_registry_law v2 (GEMATRIA ROOT GATE): a gematria that lives only inside a Post body is a finding.
const METHODS = [
  { method_key: "רגיל", db_column: "ragil", active: true, in_engine: true }, { method_key: "מילוי", db_column: "miluy", active: true, in_engine: true },
  { method_key: "ריבוע", db_column: "ribua", active: true, in_engine: true }, { method_key: "גדול", db_column: "gadol", active: false, in_engine: true },
];
const BODY = `<h3>חיבור שני — 5787</h3>
<p style="text-align:center"><b>הביטוי:</b> תפרצי בתשפז</p>
<p style="text-align:center"><b>השיטה:</b> ריבוע</p>
<p style="text-align:center"><b>התוצאה:</b> <span data-gem="5787">5787</span></p>
<h3>חיבור שלישי — 2026</h3>
<p><b>הביטוי:</b> ימין ושמאול תפרצי</p>
<p><b>השיטה:</b> מילוי</p>
<p><b>התוצאה:</b> <span data-gem="2026">2026</span></p>`;
const ROOTS = [
  { phrase: "תפרצי בתשפז", is_verified: true, is_published: true, is_encrypted: false, ragil: 1569, miluy: 2467, ribua: 5787 },
  { phrase: "ימין ושמאול תפרצי", is_verified: true, is_published: true, is_encrypted: false, ragil: 1273, miluy: 2026, ribua: 5081 },
];

test("claims are read from the Post body blocks and from unit items; an item that states nothing is ignored", () => {
  const claims = extractPostGematriaClaims(BODY, "post:5107");
  assert.deepEqual(claims.map((c) => [c.phrase, c.methodKey, c.stated]), [["תפרצי בתשפז", "ריבוע", 5787], ["ימין ושמאול תפרצי", "מילוי", 2026]]);
  assert.equal(claimsFromUnitItems([{ phrase: "שר הדין", methodKey: "רגיל", stated: 569 }, { phrase: "", methodKey: "רגיל" }, null]).length, 1);
});
test("every claim that has a public root with the engine's value passes: the law holds", () => {
  assert.deepEqual(rootGateFindings(extractPostGematriaClaims(BODY), ROOTS, METHODS), []);
});
test("a gematria that exists only inside the Post body is a finding (no root)", () => {
  const findings = rootGateFindings(extractPostGematriaClaims(BODY), ROOTS.slice(0, 1), METHODS);
  assert.deepEqual(findings.map((f) => [f.kind, f.claim.phrase]), [["no_root", "ימין ושמאול תפרצי"]]);
});
test("a root that is not public, a method outside the registry, and a value the engine does not give are all findings", () => {
  const draft = [{ ...ROOTS[0], is_published: false }, ROOTS[1]];
  assert.equal(rootGateFindings(extractPostGematriaClaims(BODY), draft, METHODS)[0].kind, "root_not_public");
  assert.equal(rootGateFindings([{ phrase: "תפרצי בתשפז", methodKey: "גדול", stated: 1569 }], ROOTS, METHODS)[0].kind, "unknown_method", "an inactive method has no engine column");
  assert.equal(rootGateFindings([{ phrase: "תפרצי בתשפז", methodKey: "ריבוע", stated: 5788 }], ROOTS, METHODS)[0].kind, "value_mismatch");
});
test("a non-regular method is judged by its own engine column, not by ragil", () => {
  assert.deepEqual(rootGateFindings([{ phrase: "תפרצי בתשפז", methodKey: "ריבוע", stated: 5787 }], ROOTS, METHODS), []);
  assert.equal(rootGateFindings([{ phrase: "תפרצי בתשפז", methodKey: "רגיל", stated: 5787 }], ROOTS, METHODS)[0].kind, "value_mismatch");
});
test("ENGINE FIRST: the client never writes gematria_words (values come only from the canonical engine and the Corpus Admission path)", () => {
  const offenders = [];
  const walk = (dir) => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|jsx|mjs)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
      const text = fs.readFileSync(full, "utf8");
      for (const m of text.matchAll(/from\(\s*["']gematria_words["']\s*\)([\s\S]{0,160})/g)) if (/\.(insert|update|upsert|delete)\s*\(/.test(m[1])) offenders.push(full);
    }
  } };
  walk("src");
  assert.deepEqual(offenders, []);
});
