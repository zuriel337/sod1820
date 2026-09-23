import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { synthesis1820PreviewProjection } from "../src/lib/research/synthesis1820Preview.js";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const page = read("src/pages/SynthesisPreview2029Page.jsx");
const css = read("src/pages/synthesisPreview2029.css");
const frame = read("src/components/experience2029/SystemFrame2029.jsx");
const app = read("src/App2029.jsx");
const vercel = JSON.parse(read("vercel.json"));
const fixtureSource = read("src/lib/research/synthesis1820Preview.js");

const preview = synthesis1820PreviewProjection();

assert.equal(preview.number, 1820);
assert.equal(preview.legacy.authority, false);
assert.equal(preview.synthesis.status, "composed");
assert.equal(preview.synthesis.contract_version, 1);
assert.equal(preview.synthesis.provenance.fixture, true);
assert.equal(preview.synthesis.provenance.live_runtime_synthesis, false);
assert.equal(preview.synthesis.provenance.public_cutover_authorized, false);
assert.equal(preview.synthesis.invariants.synthesis_is_not_truth, true);
assert.equal(preview.synthesis.invariants.no_universal_truth_score, true);
assert.equal("truth_score" in preview.synthesis, false);
assert.equal("accuracy_score" in preview.synthesis, false);
assert.equal(preview.synthesis.calibration.state, "unvalidated");
assert.equal(preview.synthesis.motifs.length >= 3, true);
assert.equal(preview.synthesis.claims.length >= 3, true);

assert.equal(preview.synthesis.message.includes("בקדמי"), false, "public Synthesis copy must say משולש, never קדמי");
assert.equal(preview.synthesis.message.includes("במשולש"), true, "public Synthesis copy should expose משולש");
assert.equal(preview.display.anchors.some((item) => String(item).startsWith("קדמי")), false, "public proof anchors must not expose internal קדמי key");
assert.equal(preview.display.anchors.some((item) => String(item).startsWith("משולש")), true, "public proof anchors should use משולש");
assert.equal(preview.raziel_route.action, "raziel_route");
assert.equal(preview.raziel_route.route_action, "connect");
assert.equal(preview.raziel_route.label, "לחבר");
assert.equal(preview.raziel_route.preferred_home, "world");
assert.equal(preview.raziel_route.synthesis.message_authority, "bundle.synthesis");
assert.equal(preview.raziel_route.synthesis.local_message, null);
assert.equal(preview.raziel_route.guards.no_local_message_generation, true);
assert.equal(preview.raziel_route.provenance.fixture, true);
assert.equal(preview.raziel_route.provenance.live_runtime_action, false);

assert.match(page, /synthesis1820PreviewProjection/);
assert.match(page, /TODAY · LEGACY SNAPSHOT/);
assert.match(page, /SYNTHESIS 2029 · GOLDEN PREVIEW/);
assert.match(page, /synthesisPreview: preview\.synthesis/);
assert.match(page, /razielRouteAction: preview\.raziel_route/);
assert.match(page, /razielMicroIntent: "synthesis_preview"/);
assert.equal(page.includes("numberCoreFocus:"), false, "Synthesis preview must not trigger a second Raziel quickInsight message");
assert.match(page, /noindex: true/);
assert.match(page, /SYNTHESIS 2029 · GOLDEN PREVIEW/);

for (const forbidden of [
  "numberMessage.js",
  "buildMessages(",
  "getAiAnalysis(",
  "calcGem(",
  "METHODS",
]) {
  assert.equal(page.includes(forbidden), false, `Synthesis preview must not import local/legacy semantic authority: ${forbidden}`);
}

assert.match(frame, /synthesisPreview = null/);
assert.match(frame, /microIntent === "synthesis_preview"/);
assert.match(frame, /data-raziel-synthesis-preview="true"/);
assert.match(frame, /המסר שרזיאל קיבל · אותו Synthesis/);
assert.match(frame, /synthesisPreview=\{transient\?\.payload\?\.synthesisPreview \|\| null\}/);
assert.match(frame, /razielRouteAction=\{transient\?\.payload\?\.razielRouteAction \|\| null\}/);
assert.match(frame, /data-raziel-route-action=\{razielRouteAction\.route_action\}/);
assert.match(frame, /data-raziel-route-home=\{razielRouteAction\.preferred_home\}/);
assert.match(frame, /Golden Preview בלבד · F12 יחבר את הפעולה לניווט החי/);
assert.match(frame, /razielRouteAction\.guards\?\.no_local_message_generation === true/);
assert.match(frame, /razielRouteAction\.synthesis\?\.message_authority === "bundle\.synthesis"/);
assert.match(frame, /razielRouteAction\.synthesis\?\.local_message == null/);
assert.equal(frame.includes("onRazielRouteAction"), false, "F11 is visual consumer only; it must not add a live route executor");
assert.equal(frame.includes("routeActionHref"), false, "F11 must not mint a local route mapper");

assert.match(app, /SynthesisPreview2029Page/);
assert.match(app, /path="\/2029\/preview\/synthesis\/1820"/);

const previewRewrite = (vercel.rewrites || []).find((row) => row.source === "/2029/preview/synthesis/1820");
assert.ok(previewRewrite, "missing isolated Synthesis preview rewrite");
assert.equal(previewRewrite.destination, "/2029.html");

assert.match(css, /var\(--s29-/);
assert.equal(/#[0-9a-f]{3,8}/i.test(css), false, "preview CSS must use canonical semantic theme variables, not a local hex palette");
assert.match(css, /prefers-reduced-motion/);

assert.match(fixtureSource, /Visual Golden only/);
assert.match(fixtureSource, /live_runtime_synthesis: false/);
assert.match(fixtureSource, /live_runtime_action: false/);
assert.match(fixtureSource, /source_contract: "PR #631 · razielActionContract v1"/);
assert.equal(fixtureSource.includes("truth_score"), false);
assert.equal(fixtureSource.includes("accuracy_score"), false);

console.log("2029 Synthesis 1820 Golden preview contract: PASS");
