import fs from "node:fs";
import assert from "node:assert/strict";
import { projectRevealSteps, traceIdentityMatches } from "../src/lib/research/gematriaRevealProjection.js";

const comp = fs.readFileSync("src/components/gematria2029/GematriaReveal2029.jsx", "utf8");
const proj = fs.readFileSync("src/lib/research/gematriaRevealProjection.js", "utf8");
const page = fs.readFileSync("src/pages/Calculator2029Page.jsx", "utf8");

const sel = { expression: "אב", methodKey: "m1", resultValue: 3 };
const mk = (steps, over = {}) => ({ projection: { dimensions: { trace: { input: "אב", methodKey: "m1", result: 3, steps, ...over } } } });
const good = [
  { scope: "letter", token: "א", contribution: 1, base_value: 1, running_subtotal: 1 },
  { scope: "letter", token: "ב", contribution: 2, base_value: 2, running_subtotal: 3 },
];

// projection: verbatim copy, identity enforced
assert.deepEqual(projectRevealSteps(mk(good), sel).map((s) => [s.token, s.contribution, s.subtotal]), [["א", 1, 1], ["ב", 2, 3]]);
assert.equal(traceIdentityMatches(mk(good), { ...sel, methodKey: "m2" }), false);
assert.equal(projectRevealSteps(mk(good), { ...sel, expression: "בא" }), null);
assert.equal(projectRevealSteps(mk(good), { ...sel, resultValue: 4 }), null);
// unsupported shapes fail closed, never fabricate
assert.equal(projectRevealSteps(mk(null), sel), null);
assert.equal(projectRevealSteps(mk(["א", "ב"]), sel), null);
assert.equal(projectRevealSteps(mk([{ scope: "letter", token: "א", contribution: 1 }, good[1]]), sel), null);
assert.equal(projectRevealSteps(mk([{ ...good[0], running_subtotal: null }, good[1]]), sel), null);
assert.equal(projectRevealSteps(mk([good[0], { ...good[1], running_subtotal: 99 }]), sel), null);

// source contracts
assert.doesNotMatch(comp + proj, /gematria\.js|fn_method_value|fn_ragil|METHODS|supabase|\.rpc\(/);
assert.doesNotMatch(comp, /(sum|total|subtotal)\w*\s*\+=|reduce\(/);
assert.match(comp, /prefers-reduced-motion/);
assert.match(comp, /requestAnimationFrame/);
assert.match(comp, /cancelAnimationFrame/);
assert.match(comp, /הצג מיד/);
assert.match(comp, /הצג חישוב/);
assert.match(comp, /aria-live="polite"/);
assert.match(comp, /aria-hidden="true"/);
assert.doesNotMatch(comp, /מחקרי/);
assert.match(page, /GematriaReveal2029/);
assert.match(page, /fetchGematriaMethodTrace\(selection\.methodKey, selection\.expression\)/);
// trace is only fetched inside the user-triggered loadTrace
assert.equal((page.match(/fetchGematriaMethodTrace\(/g) || []).length, 1);
assert.match(page, /onToggleTrace=\{loadTrace\}/);
const callIdx = page.indexOf("fetchGematriaMethodTrace(selection.methodKey");
assert.ok(page.lastIndexOf("const loadTrace = async", callIdx) > page.lastIndexOf("useEffect(", callIdx));

console.log("PASS GematriaReveal2029 contract");
