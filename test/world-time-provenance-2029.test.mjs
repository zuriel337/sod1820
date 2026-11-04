import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const surface = readFileSync(new URL("../src/components/research/WorldKnowledgeTypes2029.jsx", import.meta.url), "utf8");

test("World time distinguishes tree identities from documented public sources", () => {
  assert.match(surface, /אירועים וזמן בעץ/);
  assert.match(surface, /לא מקורות חדשים ולא ממצאים חדשים/);
  assert.match(surface, /מקור → הופעה → תאריך/);
  assert.match(surface, /לא מקבל מספר מקורות מומצא/);
  assert.match(surface, /\/world\?view=sources#world-source-selection/);
});
