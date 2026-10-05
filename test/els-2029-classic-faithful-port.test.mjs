import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../src/pages/Els2029Page.jsx", import.meta.url), "utf8");
const provider = readFileSync(new URL("../src/lib/research/ResearchProvider.jsx", import.meta.url), "utf8");

test("Classic 2029 mounts the canonical full tzofen workspace inside /els", () => {
  assert.match(page, /import TzofenEmbed from "\.\.\/components\/TzofenEmbed\.jsx"/);
  assert.match(page, /data-els-classic-2029="faithful-port-v1"/);
  assert.match(page, /data-els-classic-tool="canonical-tzofen"/);
  assert.match(page, /<TzofenEmbed seed=\{classicSeed \|\| undefined\} full \/>/);
  assert.match(page, /המשך הפסוק/);
  assert.match(page, /סימוני הצבע בצד/);
  assert.match(page, /חיפוש מוצלב/);
  assert.match(page, /שמירות/);
  assert.doesNotMatch(page, /href="\/lab\/els"/);
});

test("Classic tool stays mounted across profile switches so working state is preserved", () => {
  assert.match(page, /const \[classicSeed\] = useState\(\(\) => clean\(selection\?\.term \|\| subject\?\.label \|\| ""\)\)/);
  assert.match(page, /display: researchProfile \? "none" : "block"/);
  assert.match(page, /aria-hidden=\{researchProfile\}/);
  assert.match(page, /ONE ENGINE/);
  assert.match(page, /SAME STATE/);
});

test("canonical tzofen state already feeds the shared Research Context replay selection", () => {
  assert.match(provider, /d\.source !== "tzofen" \|\| d\.type !== "state" \|\| d\.status !== "ok"/);
  assert.match(provider, /const elsSelection = \{/);
  assert.match(provider, /entityType: "els", locator, term, corpus: scope/);
  assert.match(provider, /actions\.setResearchContext\(next\)/);
});

console.log("ELS Classic 2029 faithful port: PASS");
