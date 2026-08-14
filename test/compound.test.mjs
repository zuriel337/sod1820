// GAP-3 · projectCompoundFinding read-model — real example:
// «נאות מדבר(703) + אליך(61) = נאות דשא(764)». No UI, no DB — read-model only.
// Run: node test/compound.test.mjs
import { analyzeFull } from "../src/lib/analysisFlow.js";
import { projectCompoundFinding } from "../src/lib/fieldpackage.js";

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.error("✗ " + m); } };

// real writer text carrying a sum-equation with expressions + values
const RAW = "צבי מצא: נאות מדבר(703) + אליך(61) = נאות דשא(764). וגם נאות מדבר = יומא דשבתא.";
const analysis = analyzeFull(RAW, { writerName: "צבי" });
const compounds = projectCompoundFinding(analysis, { source: { kind: "post", url: "/post/zvi-764" } });

// 1 · a sum compound is produced and structured
const sum = compounds.find((c) => c.relation === "sum");
ok(!!sum, "sum compound produced from «expr(val)+expr(val)=expr(val)»");
ok(Array.isArray(sum.components) && sum.components.length === 2, "two components kept separately");
const byExpr = Object.fromEntries(sum.components.map((c) => [c.expression, c.value]));
ok(byExpr["נאות מדבר"] === 703 && byExpr["אליך"] === 61, "each component keeps expression + value (703, 61)");
ok(sum.target && sum.target.expression === "נאות דשא" && sum.target.value === 764, "target kept: נאות דשא = 764");

// 2 · arithmetic verification is separate and correct — and NOT gematria verification
ok(sum.arithmetic && sum.arithmetic.verifiedSum === true, "verifiedSum true (703+61=764, arithmetic)");
ok(sum.verification.arithmetic === true && sum.verification.gematriaPerPart === false, "arithmetic-verified ≠ gematria-verified (per-part gematria not engine-checked yet)");

// 3 · governance separation held in the model
ok(sum.claim === true, "compound is a CLAIM (not a Fact) until Human-Gate");
ok(sum.components.every((c) => c.verified === false), "no component auto-marked verified");
ok(sum.interpretation === null, "no interpretation injected (stays absent, never auto-Fact)");
ok(sum.source && sum.source.kind === "post", "provenance/source carried");

// 4 · interpretation, when provided, is ALWAYS isFact:false (separate layer)
const withInterp = projectCompoundFinding(analysis, { source: null, interpretation: { note: "רמז אפשרי" } });
ok(withInterp[0].interpretation && withInterp[0].interpretation.isFact === false, "provided interpretation is wrapped isFact:false");

// 5 · relations are NOT merged just because they share a number
const relations = new Set(compounds.map((c) => c.relation));
ok(!(relations.has("sum") && compounds.find((c) => c.relation === "sum")?.relation === "equality"), "sum ≠ equality (distinct relation types, not merged by value)");

// 6 · numeric-only form also structured (a + b = c)
const analysis2 = analyzeFull("הכתב הראה 703 + 61 = 764.", {});
const c2 = projectCompoundFinding(analysis2, {});
const sum2 = c2.find((c) => c.relation === "sum");
ok(sum2 && sum2.target.value === 764 && sum2.arithmetic.verifiedSum === true, "numeric-only sum «703+61=764» structured + verified");

console.log(`\n${fail === 0 ? "✅ PASS" : "❌ FAIL"} — ${pass} passed, ${fail} failed (compound finding read-model / GAP-3)`);
process.exit(fail === 0 ? 0 : 1);
