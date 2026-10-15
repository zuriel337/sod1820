import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { EXPERIENCE_SURFACE, getExperienceSurfaceProfile } from "../src/lib/experienceContext.js";

// Regression: /control crashed with "Unknown SOD1820 experience surface: admin".
async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.jsx$/.test(e.name)) yield p;
  }
}

test("every literal Sod2029Shell surface resolves in the experience registry", async () => {
  const known = new Set(Object.values(EXPERIENCE_SURFACE));
  const bad = [];
  for await (const file of walk("src")) {
    const src = await readFile(file, "utf8");
    for (const m of src.matchAll(/<Sod2029Shell[^>]*?\ssurface="([^"]+)"/gs)) {
      if (!known.has(m[1].toLowerCase())) bad.push(`${file}: ${m[1]}`);
    }
  }
  assert.deepEqual(bad, []);
});

test("control plane uses a registered surface", async () => {
  const src = await readFile("src/pages/ControlPlane2029Page.jsx", "utf8");
  const m = src.match(/<Sod2029Shell[^>]*?\ssurface="([^"]+)"/s);
  assert.ok(m);
  assert.doesNotThrow(() => getExperienceSurfaceProfile(m[1]));
});
