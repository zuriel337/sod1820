// Every page frame (Sod2029Shell) names a surface the experience context knows. An unknown surface throws in render and the page
// falls into the error boundary (/stats on 21.11.2026: surface="stats" -> "משהו השתבש בטעינת הדף" on the live site).
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { EXPERIENCE_SURFACE } from "../src/lib/experienceContext.js";

// "control" is a frame alias: SystemFrame2029 maps it to "heichal" before the experience context (and keeps it for its own guards).
const frame = readFileSync("src/components/experience2029/SystemFrame2029.jsx", "utf8");
const aliases = [...frame.matchAll(/surface === "([a-z_-]+)" \? "([a-z_-]+)" : surface/g)].filter(m => Object.values(EXPERIENCE_SURFACE).includes(m[2])).map(m => m[1]);
const known = new Set([...Object.values(EXPERIENCE_SURFACE), ...aliases]);
const files = [];
(function walk(dir) { for (const name of readdirSync(dir)) { const p = join(dir, name); if (statSync(p).isDirectory()) walk(p); else if (/\.jsx?$/.test(name) && !/\.test\./.test(name)) files.push(p); } })("src");

test("every <Sod2029Shell surface=...> literal is a known experience surface", () => {
  const bad = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(/<Sod2029Shell\b([^>]*?)>/gs)) {
      const surface = /\bsurface="([^"]+)"/.exec(match[1])?.[1];
      if (surface && !known.has(surface)) bad.push(`${file}: surface="${surface}"`);
    }
  }
  assert.deepEqual(bad, [], "unknown surfaces throw in render");
});
