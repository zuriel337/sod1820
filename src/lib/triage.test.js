// Tests for triage.js — run with: node --test src/lib/triage.test.js
// Zero external dependencies (Node's built-in test runner), mirrors middleware.test.js convention.
//
// RABBATI_METHOD_CLIENT_WIRING (27.8.2026) — verifies matchAnyMethod() can resolve א=1000 via the
// newly-wired RABBATI_METHOD, and that the real ZVI research object's original claim text
// ("א+יב\"ק=1000+112=1112", research_objects.id=9b04c3e2, source_ref=channel_updates:...#batch3 —
// read live before writing this fixture) now parses to ENGINE_VERIFIED_COMPOSITE end-to-end through
// the existing phrase-sum-chain extractor, with zero changes to that extractor itself.
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractCompoundClaims, matchAnyMethod } from "./triage.js";

test("matchAnyMethod('א', 1000) resolves via אות רבתי", () => {
  const matches = matchAnyMethod("א", 1000);
  const rabbatiMatch = matches.find((m) => m.method === "אות רבתי");
  assert.ok(rabbatiMatch, "אות רבתי must appear among the matches for א=1000");
  assert.equal(rabbatiMatch.computed, 1000);
});

test("matchAnyMethod('א', 1) still resolves via רגיל (ordinary case unaffected)", () => {
  const matches = matchAnyMethod("א", 1);
  assert.ok(matches.some((m) => m.method === "רגיל"));
});

test("ZVI 1112 golden — «א+יב\"ק=1000+112=1112» is ENGINE_VERIFIED_COMPOSITE via the existing phrase-sum-chain extractor", () => {
  const claims = extractCompoundClaims('א+יב"ק=1000+112=1112');
  const psc = claims.find((c) => c.kind === "phrase-sum-chain");
  assert.ok(psc, "phrase-sum-chain claim extracted (same extractor as before — no new parser)");
  assert.equal(psc.sum, 1112);
  assert.equal(psc.result, 1112);
  assert.equal(psc.status, "ENGINE_VERIFIED_COMPOSITE");
  const [opA, opB] = psc.operands;
  assert.equal(opA.phrase, "א");
  assert.equal(opA.value, 1000);
  assert.equal(opA.method, "אות רבתי");
  assert.equal(opB.phrase, "יבק");
  assert.equal(opB.value, 112);
  assert.equal(opB.method, "רגיל");
});

test("regression: quantity-product still works unchanged — «5 פעמים \"ברית\"(612)=3060»", () => {
  const claims = extractCompoundClaims('5 פעמים "ברית"(612)=3060');
  const qp = claims.find((c) => c.kind === "quantity-product");
  assert.ok(qp);
  assert.equal(qp.computedTotal, 3060);
  assert.equal(qp.status, "ENGINE_VERIFIED_COMPOSITE");
});

test("regression: ordinary phrase-sum-chain without Rabbati is unaffected — «ז+זי+זית=7+17+417=441»", () => {
  const claims = extractCompoundClaims("ז+זי+זית=7+17+417=441");
  const psc = claims.find((c) => c.kind === "phrase-sum-chain");
  assert.ok(psc);
  assert.equal(psc.sum, 441);
  assert.equal(psc.status, "ENGINE_VERIFIED_COMPOSITE");
  assert.ok(psc.operands.every((o) => o.method !== "אות רבתי"), "Rabbati must not be silently invoked when the explicit value already matches רגיל");
});
