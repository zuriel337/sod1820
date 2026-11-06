// DEF-007 regression: a workflow step must never pass a test/script path that does not exist in the repository.
// 623b8d38a ("Remove the Legacy runtime") deleted scripts/test-beit-midrash-methods-registry.mjs while
// live-contracts-2029.yml still handed it to `node --test`, which would have failed the gate on its next run.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const dir = path.join(root, ".github/workflows");
const PATH_RE = /(?<![\w./-])((?:scripts|test|tests)\/[\w./@-]+?\.(?:mjs|cjs|jsx|js|sh|sql|json))(?![\w])/g;

test("every scripts/ test/ tests/ path named by a workflow exists", () => {
  const missing = [];
  for (const file of fs.readdirSync(dir).filter((f) => /\.ya?ml$/.test(f))) {
    const text = fs.readFileSync(path.join(dir, file), "utf8");
    for (const [, ref] of text.matchAll(PATH_RE)) {
      if (ref.includes("*")) continue;
      if (!fs.existsSync(path.join(root, ref))) missing.push(`${file}: ${ref}`);
    }
  }
  assert.deepEqual([...new Set(missing)], []);
});

test("the Beit Midrash step keeps its 2029 coverage after the dead path was removed", () => {
  const text = fs.readFileSync(path.join(dir, "live-contracts-2029.yml"), "utf8");
  for (const kept of ["test/beit-midrash-world-sections-2029.test.mjs", "test/beit-midrash-methods-study-2029.test.mjs",
    "test/beit-midrash-learning-projection-2029.test.mjs", "scripts/test-beit-midrash-all-method-definitions.mjs"]) {
    assert.ok(text.includes(kept), `${kept} must stay in the gate`);
  }
});
