// Tests for gematria.js — run with: node --test src/lib/gematria.test.js
// Zero external dependencies (Node's built-in test runner), mirrors middleware.test.js convention.
//
// RABBATI_METHOD_CLIENT_WIRING (27.8.2026) — rabbati_letter_method_law v1, DB-live rule_version=1,
// method_key="אות רבתי", engine_function=fn_rabbati. JS↔DB parity values below (א=1000, ב=2000,
// אב=3000) were confirmed live against the canonical Supabase fn_rabbati() before writing this file.
import { test } from "node:test";
import assert from "node:assert/strict";
import { METHODS, DEPTH_METHODS, rabbati, RABBATI_METHOD, methodLetters } from "./gematria.js";

test("rabbati('א') = 1000 (JS↔DB parity: fn_rabbati('א')=1000 confirmed live)", () => {
  assert.equal(rabbati("א"), 1000);
});

test("rabbati('ב') = 2000 (JS↔DB parity: fn_rabbati('ב')=2000 confirmed live)", () => {
  assert.equal(rabbati("ב"), 2000);
});

test("rabbati('אב') = 3000 (JS↔DB parity: fn_rabbati('אב')=3000 confirmed live)", () => {
  assert.equal(rabbati("אב"), 3000);
});

test("ordinary רגיל('א') stays 1 — Rabbati never contaminates plain ragil", () => {
  const ragil = METHODS.find((m) => m.key === "רגיל");
  assert.ok(ragil);
  assert.equal(ragil.fn("א"), 1);
});

test("RABBATI_METHOD.fn === rabbati and is a proper method descriptor", () => {
  assert.equal(RABBATI_METHOD.key, "אות רבתי");
  assert.equal(RABBATI_METHOD.fn("א"), 1000);
  assert.equal(RABBATI_METHOD.explicitContextOnly, true);
});

test("DO NOT: RABBATI_METHOD is never spread into METHODS or DEPTH_METHODS", () => {
  // Guard against future regression: METHODS/DEPTH_METHODS are iterated unconditionally by ~15
  // calculator/display components (GematriaCalculator3D, CommunityCalculatorPage, MethodAnalyze,
  // NumberDrawer, placeholders.jsx, …). If "אות רבתי" ever lands in either array, every plain
  // word typed anywhere would silently show a ×1000 row — exactly what rabbati_letter_method_law's
  // activation="explicit_rabbati_context_only" truth boundary forbids.
  assert.ok(!METHODS.some((m) => m.key === "אות רבתי"), "must not be in METHODS");
  assert.ok(!DEPTH_METHODS.some((m) => m.key === "אות רבתי"), "must not be in DEPTH_METHODS");
});

test("methodLetters('אות רבתי', 'אב') shows ×1000 per-letter values", () => {
  const letters = methodLetters("אות רבתי", "אב");
  assert.ok(letters);
  assert.equal(letters.type, "value");
  assert.deepEqual(letters.segs, [{ ch: "א", val: 1000 }, { ch: "ב", val: 2000 }]);
});

test("gadol (fn_gadol client mirror) is untouched — final-letter logic unchanged, not multiplied by 1000", () => {
  const gadolMethod = METHODS.find((m) => m.key === "גדול");
  assert.ok(gadolMethod);
  // א has no sofit form — gadol_equals_ragil_when_no_sofiot: גדול('א') must equal רגיל('א')=1, not 1000.
  assert.equal(gadolMethod.fn("א"), 1);
});
