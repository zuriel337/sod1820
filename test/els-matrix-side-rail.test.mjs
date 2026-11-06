import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { foldOptions, foldOptionsFor, foldSuggestion, hitBoxAt, hitPositionsOf } from "../src/lib/elsSplitMatrix.js";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("fold k puts about k-1 rows between axis letters; exact when k divides the skip, otherwise the axis leans", () => {
  const byK = options => Object.fromEntries(options.map(o => [o.k, o]));
  const fifty = byK(foldOptions(50));
  assert.deepEqual([fifty[2].width, fifty[2].exact, fifty[2].drift], [25, true, 0]);
  assert.deepEqual([fifty[5].width, fifty[5].between, fifty[5].exact], [10, 4, true]);
  assert.deepEqual([fifty[3].width, fifty[3].exact, fifty[3].drift], [17, false, -1], "50 is not divisible by 3: nearest width, slight lean");
  // A prime skip still gets folds (this used to be "no fold available").
  const prime = foldOptionsFor(97, 5);
  assert.ok(prime.length > 3 && prime.every(o => o.k === 1 || !o.exact));
  assert.ok(prime.every(o => o.k === 1 || Math.abs(o.drift) * 4 <= 20), "a leaning axis never sweeps across more than 20 columns");
  // Exact divisors stay exact and straight.
  const big = byK(foldOptionsFor(16965, 5));
  assert.deepEqual([big[3].width, big[3].exact, big[5].width, big[5].exact], [5655, true, 3393, true]);
  // Folds whose axis would no longer fit one window (61 rows) are not offered.
  assert.ok(foldOptionsFor(175, 5).every(o => (5 - 1) * o.k + 1 <= 61));
  assert.ok(foldOptions(2).length === 1, "a skip too small to fold has only the normal layout");
});

test("positions and boxes are rebuilt from the lens facts only", () => {
  const axis = { skip: 175, direction: "fwd", start: 1000, length: 5 };
  assert.deepEqual(hitPositionsOf(axis), [1000, 1175, 1350, 1525, 1700]);
  assert.deepEqual(hitPositionsOf({ ...axis, direction: "back" }), [1000, 825, 650, 475, 300]);
  const normal = hitBoxAt(axis, 175), folded = hitBoxAt(axis, 35);
  assert.equal(normal.rowMax - normal.rowMin, 4, "consecutive rows in the normal matrix");
  assert.equal(folded.rowMax - folded.rowMin, 20, "4 rows between letters after folding by 5");
  assert.equal(folded.colMin, folded.colMax, "still one straight column");
});

test("a fold is recommended only when it brings a verified occurrence next to the axis and keeps the axis in one window", () => {
  const a = { hitId: "a", term: "x", skip: 50, direction: "fwd", start: 1000, length: 6 };
  const b = { hitId: "b", term: "y", skip: 50, direction: "fwd", start: 1000 + 25 * 7 + 9, length: 5 };
  assert.deepEqual(foldSuggestion([a, b], "a", 50, { reach: 3 }), { k: 5, width: 10, between: 4, hitId: "b", term: "y", gap: 3 });
  assert.equal(foldSuggestion([a], "a", 50), null);
  assert.equal(foldSuggestion([a, b], "a", 97), null, "a skip unrelated to the occurrences gives no recommendation");
});

test("engine lens re-flows the same text by width and never changes what it reads", async () => {
  const template = await read("tools/els/els-code.template.html");
  const lens = template.slice(template.indexOf("function matrixWindowLens"), template.indexOf("const isAnon=()=>"));
  assert.match(lens, /const W=clampInt\(t\.width,2,S,S\),totalRows=Math\.ceil\(total\/W\);/);
  assert.match(lens, /const i=r\*W\+c;/);
  assert.match(lens, /reply\(\{ok:true,S,width:W,/);
  assert.doesNotMatch(lens, /st\.(words|res|occ)\s*=[^=]|promoteVerified/);
  assert.ok((await read("public/tzofen.html")).includes("const W=clampInt(t.width,2,S,S)"), "public/tzofen.html is generated from the template");
});

test("fold control is research-only: the classic and Guided matrices keep their layout", async () => {
  const native = await read("src/components/experience2029/ElsNativeClassic2029.jsx");
  assert.match(native, /const sideRail = researchProfile && !guidedProfile;/);
  assert.match(native, /const foldActive = sideRail && foldOption && foldOption\.k > 1;/);
  assert.equal((native.match(/<MatrixSideRail /g) || []).length, 1);
  assert.equal((native.match(/<ElsFoldedMatrix2029 /g) || []).length, 1);
  assert.match(native, /setFoldK\(1\); setFoldResponse\(null\);/, "a new search or axis leaves the folded layout");
  assert.match(native, /result\.target\?\.foldSeq != null\) setFoldResponse\(result\); else setSplitResponse\(result\)/);
  const rail = native.slice(native.indexOf("function MatrixSideRail"), native.indexOf("function LineExplorer"));
  assert.doesNotMatch(rail, /zoom|requestControl|requestLens|postMessage|fetch\(/);
  assert.match(rail, /aria-label="עוד שורות בין אותיות הציר"/);
  const component = await read("src/components/experience2029/ElsFoldedMatrix2029.jsx");
  assert.match(component, /<CanonicalProgress compact title="מקפל את המטריצה"/, "operation visibility law");
  assert.doesNotMatch(component, /supabase|fetch\(|rpc\(/, "the view reads only from the engine lens");
});
