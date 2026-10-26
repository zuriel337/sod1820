import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lock = readFileSync(new URL("../src/components/MaintenanceLock.jsx", import.meta.url), "utf8");
const previewBuilder = readFileSync(new URL("../scripts/build-integrated-preview.mjs", import.meta.url), "utf8");

test("the unlocked capability projection requires one explicit build-time Preview flag", () => {
  assert.match(lock, /import\.meta\.env\.VITE_UNLOCKED_2029_PREVIEW === "true"/);
  assert.match(lock, /previewBypass: unlockedPreview/);
  assert.match(lock, /publicState: "preview_only"/);
  assert.match(lock, /viewerState: "preview_bypass"/);
  assert.doesNotMatch(lock, /location\.|URLSearchParams|localStorage|sessionStorage/);
});

test("ordinary callers keep preview bypass off and the isolated integrated Preview opts in", () => {
  assert.match(lock, /previewBypass = false/);
  assert.match(previewBuilder, /"import\.meta\.env\.VITE_UNLOCKED_2029_PREVIEW": '\"true\"'/);
  assert.match(previewBuilder, /Disposable static Preview output/);
  assert.doesNotMatch(previewBuilder, /--prod|target:\s*["']production/);
});
