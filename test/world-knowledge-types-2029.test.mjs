import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const world = fs.readFileSync("src/pages/World2029Page.jsx", "utf8");
const types = fs.readFileSync("src/components/research/WorldKnowledgeTypes2029.jsx", "utf8");
const entityHub = fs.readFileSync("src/lib/research/entityHubProjection.js", "utf8");
const matrices = fs.readFileSync("src/lib/elsMatrices.js", "utf8");

test("World loads the type browser lazily and only in its selected view", () => {
  assert.match(world, /React\.lazy\(\(\) => import\("\.\.\/components\/research\/WorldKnowledgeTypes2029\.jsx"\)\)/);
  assert.match(world, /activeView === WORLD_LANDING_VIEW\.EXPLORE \? <React\.Suspense/);
  assert.match(types, /useEffect\(\(\) => \{[\s\S]*loadKind\(kind\)/);
});

test("language and entity shelves reuse the canonical Explorer reader", () => {
  assert.match(types, /fetchExplorerFacetPage/);
  assert.match(types, /language_bridge/);
  assert.match(types, /foreign_word/);
  assert.doesNotMatch(types, /from\(["']nodes["']\)|from\(["']language_links["']\)/);
});

test("cipher shelf is public-only and never imports drafts or research-folder rows", () => {
  assert.match(types, /getMatrixLibraryPage\(\{ view: "public", pageSize: 12 \}\)/);
  assert.doesNotMatch(types, /getDraftMatrices|getResearchMatrices|getMyMatrices/);
  const reader = matrices.slice(matrices.indexOf("export async function getMatrixLibraryPage"), matrices.indexOf("export async function getMatrixById"));
  assert.match(reader, /eq\("status", "published"\)\.eq\("visibility", "public"\)/);
  assert.match(reader, /source\.is\.null,source\.neq\.research/);
});

test("media shelf uses one bounded public World projection and preserves source identity", () => {
  assert.match(types, /fetchPublicWorldMediaPage\(\{ limit: 12 \}\)/);
  assert.match(types, /CanonicalMediaFigure2029/);
  assert.match(types, /item\.sourceRef/);
  assert.doesNotMatch(types, /from\(["']gallery_images["']\)|supabase/);
  const reader = entityHub.slice(entityHub.indexOf("export async function fetchPublicWorldMediaPage"), entityHub.indexOf("export async function fetchEntityTypeDefinition"));
  assert.match(reader, /eq\("published", 1\)/);
  assert.match(reader, /eq\("min_tier", 0\)/);
  assert.match(reader, /curator_hidden\.is\.null,curator_hidden\.eq\.false/);
  assert.match(reader, /MEDIA_RELATION_KIND\.PUBLIC_CATALOG/);
  assert.doesNotMatch(reader, /\.(insert|update|upsert|delete)\(/);
});

test("the type browser does not turn quality, OCR or publication into one truth score", () => {
  assert.match(types, /איכות: אין נתון בתצוגה/);
  assert.match(types, /אינה הופכת OCR או כיתוב לממצא מאומת/);
  assert.doesNotMatch(types, /truthScore|truth_score|אמת:\s*\d/);
});
