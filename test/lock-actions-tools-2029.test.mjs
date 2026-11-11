// "פעולות" and "כלים" closed · בבנייה (ZURIEL 11.11.2026), under site_flags_lock_law v3 and canonical_ui_components_law v4/v5: the ONE source is
// site_flags (lock_context_actions, lock_context_tools) through useFeatureState; no local live/locked state; a closed panel renders the notice only.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { publicReadingFeatureLock } from "../src/lib/publicReadingRelease2029.js";

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("the frame reads both flags through the canonical hook and renders only the notice while closed", () => {
  const frame = read("src/components/experience2029/SystemFrame2029.jsx");
  assert.match(frame, /const actionsFeature = useFeatureState\("lock_context_actions", \{ requireFlag: true \}\);/);
  assert.match(frame, /const toolsFeature = useFeatureState\("lock_context_tools", \{ requireFlag: true \}\);/);
  const actionsClosed = frame.match(/if \(transientKind === TRANSIENT\.ACTION && actionsFeature\.blocked\) return (.*);/)?.[1] || "";
  const toolsClosed = frame.match(/if \(transientKind === TRANSIENT\.TOOLS && toolsFeature\.blocked\) return (.*);/)?.[1] || "";
  for (const branch of [actionsClosed, toolsClosed]) {
    assert.match(branch, /<FeatureClosedNotice2029 state=\{(actionsFeature|toolsFeature)\}/);
    assert.doesNotMatch(branch, /ActionProjection|ToolsProjection/, "nothing is projected or read while closed");
  }
  assert.ok(frame.indexOf("TRANSIENT.ACTION && actionsFeature.blocked") < frame.indexOf("if (transientKind === TRANSIENT.ACTION) return"), "the closed branch wins");
  assert.ok(frame.indexOf("TRANSIENT.TOOLS && toolsFeature.blocked") < frame.indexOf("if (transientKind === TRANSIENT.TOOLS) return"));
  assert.match(frame, /actionsBuilding=\{actionsFeature\.blocked\} toolsBuilding=\{toolsFeature\.blocked\}/);
  const more = read("src/components/experience2029/MorePanel2029.jsx");
  assert.match(more, /hint=\{actionsBuilding \? "סגור · בבנייה"/); assert.match(more, /hint=\{toolsBuilding \? "סגור · בבנייה"/);
  assert.doesNotMatch(more, /isAdmin|useAuth/, "the panel holds no local access state");
});

test("public build: both are closed to a visitor (not in the public open list); the administrator keeps the existing bypass; a missing row fails closed", () => {
  for (const flag of ["lock_context_actions", "lock_context_tools"]) assert.equal(publicReadingFeatureLock(flag).enabled, true, `${flag} closed for the public ceiling`);
  const lock = read("src/components/MaintenanceLock.jsx");
  assert.match(lock, /if \(!lock && requireFlag\) \{[\s\S]{0,120}blocked: true/, "a missing row fails closed (requireFlag)");
  assert.match(lock, /const adminBypass = !!isAdmin;/, "the administrator bypass is the existing canonical one");
});
