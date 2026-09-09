// W1 Slice 2 — SHARE/ANALYTICS boundary guard (Scope C + DO-NOT-TOUCH).
// The SHARE workstream produces telemetry; the ANALYTICS workstream owns interpretation.
// This test fails if a future change crosses that line.
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
// Semantic checks run against CODE ONLY. These files deliberately document the existing
// analytics contract in prose (the arrival join, the platform="image" conflation), and a
// naive text scan would flag that documentation as a violation of the very rule it states.
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const telemetry = read("src/lib/share/shareTelemetry.js");
const object = read("src/lib/share/shareObject.js");
const actions = read("src/components/ShareActions.jsx");
const telemetryCode = strip(telemetry);
const objectCode = strip(object);
const actionsCode = strip(actions);

// --- attribution flows through the EXISTING owners, not a new one ---
assert.match(telemetry, /from "\.\.\/propagation\.js"/, "attributed URLs must come from propagation.js");
assert.match(telemetry, /taggedShareUrl/, "rid+src tagging stays the existing owner's job");
assert.match(telemetry, /landingKey/, "the landing key must be the shared normalizer, not a local copy");
assert.match(telemetry, /track\("share", slug, "share"/, "canonical share family/section preserved");

// --- no parallel store / no new analytics system ---
for (const [name, src] of [["shareTelemetry", telemetryCode], ["shareObject", objectCode]]) {
  assert.doesNotMatch(src, /createContext|useState|localStorage|sessionStorage/,
    `${name} must not become a store`);
  assert.doesNotMatch(src, /from\(["'](visitor_events|events|traffic_history|post_share_counts)["']\)/,
    `${name} must not read/write analytics tables directly`);
}
// the Share Object stays pure and importable without a DOM
assert.doesNotMatch(objectCode, /^\s*import\s/m, "shareObject must stay dependency-free");

// --- DO-NOT-TOUCH: analytics interpretation, bot classification, reporting ---
for (const [name, src] of [["shareTelemetry", telemetryCode], ["shareObject", objectCode], ["ShareActions", actionsCode]]) {
  assert.doesNotMatch(src, /traffic_intelligence|bot_|is_bot|classifier|confidence/i,
    `${name} must not touch Traffic Intelligence semantics`);
  assert.doesNotMatch(src, /arrival|conversion|engagement_score|read_model/i,
    `${name} must not define downstream analytics semantics`);
}

// --- DO-NOT-TOUCH: Premium / rewards business rules (Scope D is seams only) ---
for (const [name, src] of [["shareTelemetry", telemetryCode], ["shareObject", objectCode], ["ShareActions", actionsCode]]) {
  assert.doesNotMatch(src, /award_share_credit|credit_ledger|reward_amount|subscription|entitlement_grant/i,
    `${name} must add no reward/credit/tier business rule`);
}
// the credit call deliberately NOT introduced here (trackShare carries it; we use track)
assert.doesNotMatch(actionsCode, /trackShare/, "must not switch to trackShare — that would add a credit call");

// --- the legacy payload is built in ONE place, so it cannot drift per surface ---
assert.match(telemetry, /buildShareMeta/, "meta must come from the single builder");
assert.doesNotMatch(actionsCode, /platform:\s*channel/, "ShareActions must not hand-build the meta payload any more");
assert.match(actions, /emitShare\(/, "ShareActions emits through the shared telemetry layer");

// --- the historical channel/modality conflation is preserved, not silently 'fixed' ---
assert.match(actions, /logShare\("image"/,
  "meta.platform='image' is existing analytics-visible semantics and must not be changed here");
assert.match(telemetry, /platform="image"/,
  "the conflation must stay documented so nobody 'fixes' it without the Analytics owner");

// --- additive evidence is namespaced and declared non-canonical ---
assert.match(object, /share_object/, "evidence must live under one namespaced key");
assert.match(telemetry, /NON-CANONICAL/, "the additive key must be declared non-canonical pending sync");
assert.match(telemetry, /BYTE-IDENTICAL/, "the frozen-legacy-fields contract must be stated at the boundary");

// --- backward compatibility of the component's public API ---
for (const prop of ["type", "url", "title", "image", "channels", "compact", "extra", "force", "style"]) {
  assert.match(actions, new RegExp(`\\b${prop}\\b`), `existing prop ${prop} must still be accepted`);
}
// every new prop must be optional (have a default) so existing call sites are untouched
for (const prop of ["entityId", "sourceSurface", "subtype", "locale", "exactState", "context", "video", "poster"]) {
  assert.match(actions, new RegExp(`${prop}\\s*=`), `new prop ${prop} must have a default`);
}
// placement law untouched
assert.match(actions, /floatingShareShown\(pathname\)/, "share_placement_law behavior must be preserved");

// --- QuickActions also produces through the shared layer, not its own meta ---
const quickCode = strip(read("src/components/QuickActions.jsx"));
assert.match(quickCode, /emitShare\(/, "QuickActions must emit through the shared telemetry layer");
assert.doesNotMatch(quickCode, /track\("share"/, "QuickActions must not hand-build a share event any more");
assert.doesNotMatch(quickCode, /trackShare/, "and must not gain a credit call");
assert.match(quickCode, /landingKey\(window\.location\.pathname\)/,
  "its slug computation must stay exactly what it was");
assert.match(quickCode, /contentId: entity\.id/, "content_id must still be emitted");

console.log("share-attribution-boundary: ok");
