import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { HOSTED_HYBRID_BRANCH } from "../scripts/hybrid-preview-source-boundary.mjs";
import { HEICHAL_DOMAIN_GATES } from "../src/lib/research/heichalEntryExamples.js";
import * as heichalDirections from "../src/lib/research/heichalEntryDirections.js";
import * as freeQuestion from "../src/lib/research/freeQuestionContext.js";

// UNIFIED_2029_REVIEW_5107_HEICHAL_20261021: invariants of the controlled integration of the four approved lines
// (frame fixes, Heichal stage 2, Posts D, mobile island V1). Source-level assertions only; no behavior is changed here.
const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");
const frame = read("src/components/experience2029/SystemFrame2029.jsx");
const app = read("src/App2029.jsx");
const heichalPage = read("src/pages/Heichal2029Page.jsx");
const vercel = JSON.parse(read("vercel.json"));

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out); else if (/\.(js|jsx|mjs)$/.test(name) && !/\.test\./.test(name)) out.push(path);
  }
  return out;
};

test("one canonical free-question definition shared by Heichal and the System Frame", () => {
  assert.equal(heichalDirections.isFreeQuestionContext, freeQuestion.isFreeQuestionContext);
  assert.equal(heichalDirections.ENTRY_INTENT_FREE_QUESTION, freeQuestion.ENTRY_INTENT_FREE_QUESTION);
  const definitions = walk(new URL("../src", import.meta.url).pathname)
    .filter((file) => /export (const|function) (isFreeQuestionContext|ENTRY_INTENT_FREE_QUESTION)\b/.test(readFileSync(file, "utf8")));
  assert.equal(definitions.length, 1, `free_question must be defined once, found: ${definitions.join(", ")}`);
  assert.match(definitions[0], /freeQuestionContext\.js$/);
  assert.match(frame, /from "\.\.\/\.\.\/lib\/research\/freeQuestionContext\.js"/);
  // strict: an ordinary calculator phrase is never a free question
  assert.equal(freeQuestion.isFreeQuestionContext({ subject: { type: "phrase", id: "פה אל פה", label: "פה אל פה" }, dimensions: {} }), false);
  assert.equal(freeQuestion.isFreeQuestionContext({ subject: { type: "phrase", id: "פה אל פה" }, dimensions: { entryIntent: "exact_expression", entryQuestion: "פה אל פה" } }), false);
});

test("Heichal doors point only at routes that exist in the unified App2029 (mapped once, no new routes)", () => {
  const expected = { gematria: "/calculator", els: "/code", books: "/books", world: "/world", journey: "/journey", kingdom: "/kingdom" };
  for (const gate of HEICHAL_DOMAIN_GATES) {
    assert.equal(gate.href, expected[gate.key], `gate ${gate.key}`);
    assert.ok(app.includes(`path="${gate.href}"`), `route missing in App2029: ${gate.href}`);
  }
  assert.equal(HEICHAL_DOMAIN_GATES.find((gate) => gate.key === "kingdom").requiresKingdomBuild, true); // only when the build really includes it
  assert.equal(HEICHAL_DOMAIN_GATES.find((gate) => gate.key === "journey").personal, true); // personal data stays with the destination
  assert.equal(/"\/2029\/(calculator|journey|kingdom)"/.test(read("src/lib/research/heichalEntryExamples.js")), false);
});

test("exact return uses the one canonical handler everywhere it is offered, never as a dead or doubled control", () => {
  // original Action panel and the pilot's merged Actions tab both pass the same handler
  assert.equal((frame.match(/onReturnExact=\{returnExact\}/g) || []).length, 2);
  assert.match(frame, /const returnBlock = onReturnExact && context\?\.returnTo\?\.href/);
  // mobile navigation sheet keeps its own (canonical) control, disabled without a target
  assert.match(frame, /disabled=\{!context\?\.returnTo\?\.href\} onClick=\{\(\) => \{ closeMobileNav\(false\); returnExact\(\); \}\}/);
  // Heichal page: the page-level control exists only with a stored target and is hidden where the header control exists
  assert.match(heichalPage, /\{context\?\.returnTo\?\.href \? <button className="sod29-action primary sod29-heichal-return" data-exact-return="page" onClick=\{\(\) => shell\.returnExact\(\)\}>/);
  assert.match(read("src/components/heichal/heichalEntry.css"), /@media\(min-width:981px\)\{\.sod29-heichal-return\{display:none\}\}/);
  // the only handler behind all of them is the frame's returnExact (no second return mechanism)
  assert.equal((frame.match(/const returnExact = useCallback/g) || []).length, 1);
});

test("free question never reaches number / save / share in the frame (guards present in the integrated tree)", () => {
  for (const guard of [
    'if (normalizeTarget(subject)?.type === "question") return; // never run a capability on a free question',
    'if (normalized?.type === "question") return; // a question is not a number/expression',
    "if (!normalized || normalized.type === \"question\") return null; // a free question is never an item to save or research",
  ]) assert.ok(frame.includes(guard), guard.slice(0, 70));
  assert.match(frame, /\{isQuestion \? null : <div className="sod29-canonical-share" data-share-owner="ShareActions">/);
  assert.equal(frame.includes("shareOrCopy"), false);
});

test("hosted read-only review preview: one exact new branch approved, earlier approved branches and guards untouched", () => {
  // #1142: the admin research preview, stacked on this review line, is now the one exact approved branch (same
  // pattern); the unified review branch itself stays approved and keeps its own source and URL.
  assert.equal(HOSTED_HYBRID_BRANCH, "codex/issue-1142-raziel-grounded-continuity-v1-20261022");
  const enabled = vercel.git.deploymentEnabled;
  assert.equal(enabled[HOSTED_HYBRID_BRANCH], true);
  assert.equal(enabled["claude/2029-unified-review-5107-heichal-20261021"], true, "the unified review preview stays approved");
  assert.equal(enabled["gpt/2029-hybrid-stage-preview-20261018"], true, "the earlier guarded preview stays approved");
  assert.equal(enabled["codex/issue-1142-crossing-integration-20261022"], true, "the earlier #1142 integration preview stays approved");
  assert.equal(enabled["gpt/*"], false);
  assert.equal(enabled["claude/*"], false);
  assert.equal(enabled["codex/*"], false);
  assert.equal(vercel.buildCommand, "git checkout -- vercel.json && SOD_BUILD_TARGET=hybrid node scripts/build-hosted-hybrid-preview.mjs");
  // the only build env of this review branch is the preview-only Elections 5107 gate (fail-closed, path-scoped, public reads only)
  assert.deepEqual(vercel.build, { env: { VITE_ELECTIONS_631_PREVIEW: "true" } });
  const boundary = read("scripts/hybrid-preview-source-boundary.mjs");
  for (const gate of ["env.VERCEL === \"1\"", "env.SOD_HYBRID_HOSTED_SHALLOW === \"1\"", "env.VERCEL_ENV === \"preview\"", "env.VERCEL_GIT_COMMIT_REF === HOSTED_HYBRID_BRANCH", "env.VERCEL_GIT_COMMIT_SHA === head", "approvedHybridPreviewHost(env.VERCEL_URL || \"\") !== \"\""]) assert.ok(boundary.includes(gate), gate);
});

test("display unlock is the existing attested read-only Hybrid projection, not a lock or flag change", () => {
  const lock = read("src/components/MaintenanceLock.jsx");
  assert.match(lock, /hybridPreviewVisualAccess2029/);
  const access = read("src/lib/hybridPreviewVisualAccess2029.js");
  assert.match(access, /SHA256\.test\(hostedGuard\)/);
  assert.match(access, /localGuard === "local-read-only"/);
  assert.match(access, /Never modify the canonical lock row/);
  assert.equal(/site_flags|supabase|insert|update\(|rpc\(/i.test(access.replace(/\/\/.*$/gm, "")), false);
});

test("pilot scope and v9: shell V1 still gated to 5107 and no persistent share control in the island", () => {
  assert.match(frame, /const shellReviewActive = import\.meta\.env\.VITE_ELECTIONS_631_PREVIEW === "true"\s*&& surface === "post"/);
  const island = frame.slice(frame.indexOf("className={`sod29-command-island is-unified-bar"), frame.indexOf("{renderTransient()}"));
  assert.equal(/ShareActions|שתף/.test(island), false);
});
