import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(new URL("../src/pages/BeitMidrash2029Page.jsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../src/pages/beitMidrash2029.css", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../src/App2029.jsx", import.meta.url), "utf8");

test("World findings are three learning lenses, not three readers or stores", () => {
  assert.match(page, /BEIT_MIDRASH_WORLD_SECTION\.CROSSES/);
  assert.match(page, /BEIT_MIDRASH_WORLD_SECTION\.ATLAS/);
  assert.match(page, /BEIT_MIDRASH_WORLD_SECTION\.CONVERGENCE/);
  assert.equal((page.match(/fetchWorldAllResearchProjection\(\)/g) || []).length, 1);
  assert.equal((page.match(/fetchWorldFindingReviewPage\(/g) || []).length, 1);
  assert.match(page, /const reader = admin\s*\? fetchWorldFindingReviewPage[\s\S]*: fetchWorldAllResearchProjection\(\)/);
  assert.doesNotMatch(page, /\.from\s*\(|\.rpc\s*\(|WorldAllResearchTable|createContext|createStore/);
});

test("public and admin presentation keep truth axes and private review separate", () => {
  assert.match(page, /BEIT_MIDRASH_WORLD_AUDIENCE\.ADMIN/);
  assert.match(page, /BEIT_MIDRASH_WORLD_AUDIENCE\.PUBLIC/);
  assert.match(page, /admin && finding\.triage/);
  assert.match(page, /איכות ראיות/);
  assert.match(page, /מקורות עצמאיים/);
  assert.match(page, /מצב אימות/);
  assert.match(page, /לא ציון של הממצא ולא ציון אמת/);
  assert.match(page, /ערך חסר נשאר ללא נתון ואינו מוצג כאפס/);
  assert.doesNotMatch(page, /searchTerms|search_terms|מונחי חיפוש/);
});

test("source fidelity, occurrences and exact return are visible without inventing links", () => {
  assert.match(page, /finding\.sourceRef \|\| "אין source locator"/);
  assert.match(page, /finding\.occurrences\.length > 1/);
  assert.match(page, /finding\.canonicalFindingHref/);
  assert.match(page, /finding\.sourceHref \?/);
  assert.match(page, /beitMidrashWorldSectionHref\(section, finding\.sourceId\)/);
  assert.match(page, /target="_blank"/);
});

test("shared App2029 owns both canonical Beit Midrash routes without redirecting them to World", () => {
  assert.match(
    app,
    /const BeitMidrash2029Page = lazy\(\s*\(\) => import\("\.\/pages\/BeitMidrash2029Page\.jsx"\)\s*\);/,
  );
  const routeElements = new Map(
    [...app.matchAll(
      /<Route\s+path="(\/beit-midrash(?:\/:method)?)"\s+element=\{([^}]+)\}\s*\/>/g,
    )].map((match) => [match[1], match[2].trim()]),
  );

  assert.equal(routeElements.get("/beit-midrash"), "<BeitMidrash2029Page />");
  assert.equal(routeElements.get("/beit-midrash/:method"), "<BeitMidrash2029Page />");
  assert.equal(routeElements.size, 2);
  for (const element of routeElements.values()) {
    assert.doesNotMatch(element, /Navigate|World2029Page|\/world/);
  }
});

test("responsive and theme-safe CSS has explicit phone and desktop layouts", () => {
  assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:900px\)/);
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(css, /\.sod29-midrash-finding-tabs\{grid-template-columns:1fr\}/);
  assert.match(css, /\.sod29-midrash-finding-measures\{grid-template-columns:1fr\}/);
  assert.match(css, /var\(--s29-page\)|var\(--s29-panel\)|var\(--s29-ink\)/);
  assert.doesNotMatch(css, /\.sod29-midrash-(?:discoveries|finding|target-meter)[^}]*#[0-9a-f]{3,8}/i);
});
