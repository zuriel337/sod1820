import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "dist/.vite/manifest.json");
const skip = !fs.existsSync(manifestPath) ? "run npm run build:2029 first" : false;

test("built entry and primary route closures exclude network analytics emitters", { skip }, () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const closure = (start) => {
    const seen = new Set();
    const queue = [start];
    while (queue.length) {
      const key = queue.shift();
      if (!key || seen.has(key)) continue;
      assert.ok(manifest[key], `missing manifest key ${key}`);
      seen.add(key);
      queue.push(...(manifest[key].imports || []));
    }
    return seen;
  };
  const forbidden = /(?:analyticsEmitter2029|webVitalsEmitter2029|tracking|marketing|visits|engagement)/i;
  for (const key of [
    "2029.html",
    "src/pages/Home2029Page.jsx",
    "src/pages/World2029Page.jsx",
    "src/pages/Post2029Page.jsx",
    "src/pages/Number2029Page.jsx",
  ]) {
    const hit = [...closure(key)].find((item) => forbidden.test(`${item} ${manifest[item].name || ""} ${manifest[item].file || ""}`));
    assert.equal(hit, undefined, `${key} statically reaches ${hit}`);
  }
  assert.ok(manifest["2029.html"].dynamicImports?.includes("src/lib/analyticsEmitter2029.js"));
  assert.equal(manifest["src/lib/analyticsEmitter2029.js"].isDynamicEntry, true);
});
