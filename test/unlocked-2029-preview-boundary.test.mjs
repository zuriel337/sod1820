import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lock = readFileSync(new URL("../src/components/MaintenanceLock.jsx", import.meta.url), "utf8");
const previewBuilder = readFileSync(new URL("../scripts/build-integrated-preview.mjs", import.meta.url), "utf8");

test("the unlocked capability projection requires one explicit build-time Preview flag", () => {
  assert.match(lock, /import\.meta\.env\.VITE_UNLOCKED_2029_PREVIEW === "true"/);
  // The bypass still comes only from the explicit build-time flag. The public reading release narrows it further (it is always off in that build);
  // a narrowing condition can never grant access, so the boundary this test pins is unchanged.
  assert.match(lock, /previewBypass: !PUBLIC_READING_RELEASE && unlockedPreview/);
  assert.match(lock, /publicState: "preview_only"/);
  assert.match(lock, /viewerState: "preview_bypass"/);
  // No capability decision reads the URL or browser storage. The one place the hook looks at the location is the flag-read scope (pendingScope):
  // a cache key that makes every navigation read the flag again; it decides nothing and grants nothing, so it is the only statement allowed to.
  const withoutReadScope = lock.replace(/const pendingScope = [\s\S]*?: null;/, "");
  assert.notEqual(withoutReadScope, lock, "the flag-read scope statement is still where this test expects it");
  assert.doesNotMatch(withoutReadScope, /location\.|URLSearchParams|localStorage|sessionStorage/);
});

test("ordinary callers keep preview bypass off and the isolated integrated Preview opts in", () => {
  assert.match(lock, /previewBypass = false/);
  assert.match(previewBuilder, /"import\.meta\.env\.VITE_UNLOCKED_2029_PREVIEW": '\"true\"'/);
  assert.match(previewBuilder, /Disposable static Preview output/);
  assert.doesNotMatch(previewBuilder, /--prod|target:\s*["']production/);
});
