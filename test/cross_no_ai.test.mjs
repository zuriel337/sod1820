// GAP-2 · behavioral contract: opening «🔗 הצלבות — חינם · בלי AI» uses getWordCrossFacts ONLY
// and triggers NO AI call. Verified against the SHIPPED source (deepAnalysis.js + EntityPage.jsx)
// so it stays true as the code changes — not just the object shape. Run: node test/cross_no_ai.test.mjs
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.error("✗ " + m); } };

const deep = readFileSync(new URL("../src/lib/deepAnalysis.js", import.meta.url), "utf8");
const entity = readFileSync(new URL("../src/pages/EntityPage.jsx", import.meta.url), "utf8");

// extract a function body by brace-matching from `export ... function NAME`
function bodyOf(src, header) {
  const start = src.indexOf(header);
  if (start < 0) return "";
  let i = src.indexOf("{", start), depth = 0, end = -1;
  for (; i < src.length; i++) { if (src[i] === "{") depth++; else if (src[i] === "}") { depth--; if (depth === 0) { end = i; break; } } }
  return src.slice(start, end + 1);
}

// 1 · getWordCrossFacts is deterministic — no AI in its body
const gwf = bodyOf(deep, "export async function getWordCrossFacts");
ok(gwf.length > 0, "getWordCrossFacts located");
ok(!/getAiAnalysis|analyzeWordDeep/.test(gwf), "getWordCrossFacts calls NO AI (no getAiAnalysis/analyzeWordDeep)");
ok(/getNumberCrossResonance|number_cross_resonance/.test(gwf), "getWordCrossFacts uses deterministic bidim resonance (number_cross_resonance)");

// 2 · the cross-open effect loads via getWordCrossFacts, gated by crossOpen (not requiring AI)
ok(/crossOpen \|\| aiText/.test(entity), "cross gate is (crossOpen || aiText) — AI no longer required");
const eff = entity.slice(entity.indexOf("crossOpen || aiText"), entity.indexOf("crossOpen || aiText") + 160);
ok(/getWordCrossFacts/.test(eff), "the crossOpen branch calls getWordCrossFacts (deterministic)");
ok(!/getAiAnalysis|analyzeWordDeep|runAiNumber/.test(eff), "the crossOpen branch makes NO AI call");

// 3 · the free toggle opens cross deterministically (setCrossOpen(true)), no AI invoked
ok(/setCrossOpen\(true\)/.test(entity), "free toggle sets crossOpen=true (no AI)");
ok(/הצלבות בין-שיטתיות \(חינם · בלי AI\)/.test(entity), "the free (no-AI) toggle label is present");

// 4 · the cross toggle's onClick is EXACTLY setCrossOpen(true) — no AI entrypoint chained in
ok(/onClick=\{\(\) => setCrossOpen\(true\)\}/.test(entity), "cross toggle onClick is exactly setCrossOpen(true) — no runAiNumber/AI");

console.log(`\n${fail === 0 ? "✅ PASS" : "❌ FAIL"} — ${pass} passed, ${fail} failed (cross is AI-free / GAP-2 behavior)`);
process.exit(fail === 0 ? 0 : 1);
