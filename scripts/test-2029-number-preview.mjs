import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const page = read("src/pages/Number2029Page.jsx");
const css = read("src/pages/number2029.css");
const app = read("src/App2029.jsx");
const vercel = JSON.parse(read("vercel.json"));

for (const required of [
  "Sod2029Shell",
  "fetchEntityHubProjection",
  "fetchGematriaMethodTrace",
  "useResearch",
  "sod29-number-core",
  "מפגשים סביב",
  "צא למסע 878",
]) {
  assert.equal(page.includes(required), true, `Number 2029 preview must preserve native capability: ${required}`);
}

for (const forbidden of [
  "entity-hub-preview",
  "/research?",
  "/topic/",
  "AskRaziel",
  "QuickActions",
  "WatchButton",
  "conditionalFamily",
  "noFinalMap",
  "gematria_methods",
  "v_method_states",
]) {
  assert.equal(page.includes(forbidden), false, `Number 2029 preview must not inherit legacy/local authority: ${forbidden}`);
}

assert.equal(page.includes("התכנסות"), false, "public 2029 Number vocabulary must use מפגש");
assert.match(page, /families\.slice\(0, 6\)/, "method preview must preserve canonical projection order instead of a local priority list");
assert.match(page, /GOLDEN_878_JOURNEY_ID\s*=\s*"golden:878:v1"/);
assert.match(page, /navigate\("\/world"\)/);
assert.match(app, /path="\/2029\/number\/:value"/);
assert.match(app, /Number2029Page/);

const rewrite = (vercel.rewrites || []).find((row) => row.source === "/2029/number/(.*)");
assert.ok(rewrite, "missing isolated Number 2029 preview rewrite");
assert.equal(rewrite.destination, "/2029.html");

for (const visual of [
  ".sod29-number-core",
  ".sod29-number-pulse",
  ".sod29-number-method-rail",
  ".sod29-number-card-grid",
]) {
  assert.equal(css.includes(visual), true, `Number preview CSS missing: ${visual}`);
}
assert.match(css, /prefers-reduced-motion/);

console.log("2029 Number preview acceptance: PASS");
