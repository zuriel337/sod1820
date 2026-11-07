// First-load graph guard for the 2029 build (run after `npm run build`, next to test-2029-built-graph.mjs).
//
// Some modules belong to one view only (the Golden Post owner chain, the elections seed, the public finding reader,
// the World research projection). They used to ride along in the always-loaded shell and page chunks because of
// single-symbol static imports. This guard keeps them out of the STATIC (first-load) closure of those chunks while
// proving they are still emitted and reachable lazily, so the capability itself is never dropped.
//
// Markers are string literals owned by exactly one module; literals survive minification.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "dist/.vite/manifest.json");
assert.ok(fs.existsSync(manifestPath), "Vite manifest missing; run `npm run build` first");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const records = Object.entries(manifest).map(([key, record]) => ({ key, ...record }));

const MODULE = Object.freeze({
  worldResearchProjection: { marker: "exact-safe-projection", owner: "src/lib/research/worldAllResearchProjection.js" },
  goldenOwnerChain: { marker: "event-golden-composition-v1", owner: "src/lib/research/nasrallahPost92Golden.js" },
  momentClock: { marker: "moment-clock-temporal-observation-v1", owner: "src/lib/research/momentClockSystemMethod.js" },
  electionsSeed: { marker: "knesset-26-lists", owner: "src/lib/research/electionsIsrael21_26Seed2029.js" },
  publicFindingReader: { marker: "existing-public-finding-view", owner: "src/lib/research/worldPublicFindingReader.js" },
});

const staticClosure = (startKey) => {
  const seen = new Set();
  const visit = (key) => {
    if (!key || seen.has(key)) return;
    const record = manifest[key];
    assert.ok(record, `manifest dependency missing: ${key}`);
    seen.add(key);
    for (const dep of record.imports || []) visit(dep);
  };
  visit(startKey);
  return [...seen].map((key) => manifest[key]).filter((record) => record.file?.endsWith(".js"));
};
const text = (record) => fs.readFileSync(path.join(root, "dist", record.file), "utf8");

const byName = (name) => {
  const found = records.filter((record) => record.name === name && !record.isEntry);
  assert.equal(found.length, 1, `expected exactly one manifest record named ${name}, found ${found.length}`);
  return found[0].key;
};
const bySrc = (src) => {
  const found = records.filter((record) => record.src === src);
  assert.equal(found.length, 1, `expected exactly one manifest record for ${src}, found ${found.length}`);
  return found[0].key;
};

const entry = records.find((record) => record.src === "2029.html" || record.isEntry);
assert.ok(entry, "2029 entry missing from Vite manifest");

const CASES = [
  { label: "2029 entry (eager)", start: entry.key, forbid: ["worldResearchProjection", "goldenOwnerChain", "momentClock", "electionsSeed", "publicFindingReader"] },
  { label: "Sod2029Shell (every page)", start: byName("Sod2029Shell"), forbid: ["worldResearchProjection", "goldenOwnerChain", "momentClock", "electionsSeed", "publicFindingReader"] },
  { label: "Post2029Page", start: bySrc("src/pages/Post2029Page.jsx"), forbid: ["goldenOwnerChain", "momentClock"] },
  { label: "Number2029Page", start: bySrc("src/pages/Number2029Page.jsx"), forbid: ["publicFindingReader"] },
  { label: "World2029Page", start: bySrc("src/pages/World2029Page.jsx"), forbid: ["electionsSeed", "publicFindingReader"] },
];

for (const { label, start, forbid } of CASES) {
  const payload = staticClosure(start).map(text).join("\n");
  for (const name of forbid) {
    const { marker, owner } = MODULE[name];
    assert.equal(payload.includes(marker), false,
      `${owner} leaked into the first-load (static) graph of ${label}; import it on demand`);
  }
}

// Every watched module must still ship and be reachable (statically or lazily) from the entry.
const reachable = new Set();
const walk = (key) => {
  if (!key || reachable.has(key)) return;
  const record = manifest[key];
  assert.ok(record, `manifest dependency missing: ${key}`);
  reachable.add(key);
  for (const dep of [...(record.imports || []), ...(record.dynamicImports || [])]) walk(dep);
};
walk(entry.key);
const reachablePayload = [...reachable].map((key) => manifest[key]).filter((record) => record.file?.endsWith(".js")).map(text).join("\n");
for (const [name, { marker, owner }] of Object.entries(MODULE)) {
  assert.equal(reachablePayload.includes(marker), true, `${owner} (${name}) is no longer reachable from the 2029 entry; the capability would be lost`);
}

console.log("2029 first-load graph: PASS");
for (const { label, start } of CASES) {
  const closure = staticClosure(start);
  console.log(`${label}: ${closure.length} static chunks, ${closure.reduce((sum, record) => sum + fs.statSync(path.join(root, "dist", record.file)).size, 0)} bytes raw`);
}
