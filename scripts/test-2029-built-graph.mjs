import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const root = process.cwd();
const manifestPath = path.join(root, "dist/.vite/manifest.json");
assert.ok(fs.existsSync(manifestPath), "Vite manifest missing; cannot prove built 2029 dependency graph");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const entries = Object.entries(manifest);
const entryPair = entries.find(([key, value]) => key === "2029.html" || value?.src === "2029.html" || (value?.isEntry && value?.name === "2029"));
assert.ok(entryPair, "2029 entry missing from Vite manifest");

const seen = new Set();
const visit = (key) => {
  if (!key || seen.has(key)) return;
  const record = manifest[key];
  assert.ok(record, `manifest dependency missing: ${key}`);
  seen.add(key);
  for (const dep of record.imports || []) visit(dep);
  for (const dep of record.dynamicImports || []) visit(dep);
};
visit(entryPair[0]);

const eagerSeen = new Set();
const visitEager = (key) => {
  if (!key || eagerSeen.has(key)) return;
  const record = manifest[key];
  assert.ok(record, `manifest eager dependency missing: ${key}`);
  eagerSeen.add(key);
  for (const dep of record.imports || []) visitEager(dep);
};
visitEager(entryPair[0]);

const forbiddenSources = [
  "src/App.jsx",
  "src/main.jsx",
  "src/lib/appHeal.js",
  "src/components/layout/Layout.jsx",
  "src/components/layout/SpaceBackground.jsx",
  "src/components/AskRaziel.jsx",
  "src/components/userCenter/UserCenter.jsx",
  "src/components/AiQuotaToast.jsx",
  "src/components/ProfileNudge.jsx",
  "src/components/InstallPrompt.jsx",
  "src/components/UpdateBanner.jsx",
  "src/components/SitePromoPopup.jsx",
  "src/components/RoyalShareWidget.jsx",
  "src/lib/gematria.js",
  "src/components/CanonicalGematriaCalculator.jsx",
  "src/components/GematriaCalculatorLegacy.jsx",
  "src/lib/research/gematriaCalculationContract.js",
  "src/lib/research/coreEngine.js",
  "src/components/MethodAnalyze.jsx",
];

const reachable = [...seen].map((key) => ({ key, ...manifest[key] }));
for (const item of reachable) {
  const identity = `${item.key} ${item.src || ""} ${item.name || ""}`;
  for (const forbidden of forbiddenSources) {
    assert.equal(identity.includes(forbidden), false, `legacy presentation module reachable from 2029 build: ${forbidden} via ${identity}`);
  }
}

const eagerRecords = [...eagerSeen].map((key) => ({ key, ...manifest[key] }));
const lazySubmission = entries.find(([key, value]) =>
  `${key} ${value?.src || ""}`.includes("src/lib/research/razielSessionRequest2029.js"));
assert.ok(lazySubmission, "Raziel submit adapter must be emitted as a lazy chunk");
assert.equal(eagerSeen.has(lazySubmission[0]), false, "Raziel submit adapter/resolver/plan/gate must stay outside the eager 2029 graph");
const lazyPlan = entries.find(([key, value]) =>
  `${key} ${value?.src || ""}`.includes("researchPlanV2"));
assert.ok(lazyPlan, "Raziel Research Plan must be emitted outside the eager entry");
assert.equal(eagerSeen.has(lazyPlan[0]), false, "Raziel Research Plan must stay outside the eager 2029 graph");

const eagerPayload = eagerRecords
  .filter((item) => item.file?.endsWith(".js"))
  .map((item) => fs.readFileSync(path.join(root, "dist", item.file), "utf8"))
  .join("\n");
for (const marker of [
  "raziel-conversation-resolver-v1",
  "raziel-semantic-intent-v1",
]) {
  assert.equal(eagerPayload.includes(marker), false, `${marker} leaked into the eager 2029 payload`);
}

const lazySubmissionFile = path.join(root, "dist", lazySubmission[1].file);
assert.ok(fs.existsSync(lazySubmissionFile), "Raziel lazy submit chunk missing");
assert.match(fs.readFileSync(lazySubmissionFile, "utf8"), /raziel-conversation-resolver-v1/);

const eagerGzipBytes = eagerRecords
  .filter((item) => item.file?.endsWith(".js"))
  .reduce((total, item) => total + zlib.gzipSync(fs.readFileSync(path.join(root, "dist", item.file))).length, 0);
const baselineGzipBytes = 458742;
const requiredRecoveryBytes = 12 * 1024;
assert.ok(
  baselineGzipBytes - eagerGzipBytes >= requiredRecoveryBytes,
  `2029 eager graph recovered only ${baselineGzipBytes - eagerGzipBytes} gzip bytes; requires ${requiredRecoveryBytes}`,
);

// Detect bundled legacy presentation payload even if Rollup folds it into a shared chunk.
const forbiddenPayloadMarkers = [
  "royal-bg.jpg",
  "972557049261",
  "sod_install_prompt_dismissed",
  ".sod-post-content",
];
for (const item of reachable) {
  if (!item.file?.endsWith(".js")) continue;
  const filePath = path.join(root, "dist", item.file);
  assert.ok(fs.existsSync(filePath), `reachable chunk missing: ${item.file}`);
  const body = fs.readFileSync(filePath, "utf8");
  for (const marker of forbiddenPayloadMarkers) {
    assert.equal(body.includes(marker), false, `legacy presentation payload marker ${marker} found in eager/route-reachable 2029 chunk ${item.file}`);
  }
}

console.log("2029 built dependency graph: PASS");
console.log(`reachable manifest records: ${reachable.length}`);
console.log(`eager manifest records: ${eagerRecords.length}`);
console.log(`eager JS gzip: ${eagerGzipBytes} bytes (${baselineGzipBytes - eagerGzipBytes} recovered)`);
console.log(`Raziel submit adapter/resolver: lazy (${lazySubmission[1].file})`);
console.log(`Raziel Research Plan: lazy (${lazyPlan[1].file})`);
