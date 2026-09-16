import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

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
];

const reachable = [...seen].map((key) => ({ key, ...manifest[key] }));
for (const item of reachable) {
  const identity = `${item.key} ${item.src || ""} ${item.name || ""}`;
  for (const forbidden of forbiddenSources) {
    assert.equal(identity.includes(forbidden), false, `legacy presentation module reachable from 2029 build: ${forbidden} via ${identity}`);
  }
}

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
