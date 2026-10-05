// PUBLIC_2029_LANGUAGE_CUTOVER_V1 — static acceptance: public 2029 surfaces must not carry
// internal/research/developer labels in reader-visible copy; Heichal stays untouched.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const PUBLIC_FILES = [
  "src/components/experience2029/SystemFrame2029.jsx",
  "src/components/layout/BottomBar.jsx",
  "src/pages/Home2029Page.jsx",
  "src/pages/World2029Page.jsx",
  "src/pages/Posts2029Page.jsx",
  "src/pages/Post2029Page.jsx",
  "src/pages/Number2029Page.jsx",
  "src/pages/Topic2029Page.jsx",
  "src/components/experience2029/ConvergenceGolden2029.jsx",
  "src/components/experience2029/MistaterTensionGolden2029.jsx",
  "src/components/experience2029/RegularVerseGolden2029.jsx",
  "src/components/experience2029/TriangleMethodGolden2029.jsx",
];
const FORBIDDEN = [
  "Research Path · ", "Context Inspector", "Contextual Sidecar", "Golden Journey", "Golden Preview",
  "GOLDEN 2029", "DISCOVERY WORLD", "DISCOVER · NOW", "PUBLIC PROJECTION", "WIREFRAME",
  "fallback ל־Legacy", "2029 projection", "trace קנוני", "הקשר Research Context", "אותו Research Context",
  "חיפוש / פקודה",
];

test("public 2029 copy has no forbidden internal labels", () => {
  for (const file of PUBLIC_FILES) {
    const src = fs.readFileSync(file, "utf8");
    for (const bad of FORBIDDEN) assert.ok(!src.includes(bad), `${file} still contains "${bad}"`);
  }
});

test("command label is gated: public says חיפוש, Heichal keeps פקודה", () => {
  const src = fs.readFileSync("src/components/experience2029/SystemFrame2029.jsx", "utf8");
  assert.ok(src.includes('surface === "heichal" ? "פקודה" : "חיפוש"'));
  assert.ok(!src.includes("<small>פקודה</small>"));
});

test("Heichal page copy is untouched", () => {
  const src = fs.readFileSync("src/pages/Heichal2029Page.jsx", "utf8");
  assert.ok(src.includes("Context-Compiled Research Environment"));
});
