import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  BEIT_MIDRASH_LEARNING_SECTION,
  beitMidrashLearningHref,
} from "../src/lib/research/beitMidrashLearningProjection.js";

const page = readFileSync(new URL("../src/pages/Kingdom2029Page.jsx", import.meta.url), "utf8");
const vercel = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));

test("kingdom discoveries continue to the one canonical method lesson", () => {
  assert.equal(
    beitMidrashLearningHref(BEIT_MIDRASH_LEARNING_SECTION.METHODS, { methodKey: "רגיל" }),
    "/beit-midrash/%D7%A8%D7%92%D7%99%D7%9C",
  );
  assert.equal(
    beitMidrashLearningHref(BEIT_MIDRASH_LEARNING_SECTION.METHODS, { methodKey: "סידורי" }),
    "/beit-midrash/%D7%A1%D7%99%D7%93%D7%95%D7%A8%D7%99",
  );
  assert.match(page, /beitMidrashLearningHref\(BEIT_MIDRASH_LEARNING_SECTION\.METHODS/);
  assert.match(page, /ללמוד את שיטת \{challenge\.method\}/);
});

test("kingdom never sends learners to the locked Number surface", () => {
  assert.doesNotMatch(page, /numberExpressionFocusHref|\/2029\/number\//);
  assert.doesNotMatch(page, /פתיחה במחקר|לחקור את/);
  assert.match(page, /בבית המדרש אפשר ללמוד את דרך החישוב ואת גבולותיה/);
});

test("direct Preview entry serves Kingdom from the 2029 document", () => {
  const rewrite = vercel.rewrites.find((row) => row.source === "/2029/kingdom");
  assert.deepEqual(rewrite, { source: "/2029/kingdom", destination: "/2029.html" });
});
