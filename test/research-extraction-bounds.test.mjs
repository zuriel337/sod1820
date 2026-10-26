import test from "node:test";
import assert from "node:assert/strict";
import {
  confidenceIntegerOrNull,
  postgresIntegerOrNull,
  researchOutputTokenLimit,
} from "../supabase/functions/_shared/researchExtractionBounds.js";

test("model numbers are persisted only when they fit PostgreSQL integer", () => {
  assert.equal(postgresIntegerOrNull(958), 958);
  assert.equal(postgresIntegerOrNull("-2147483648"), -2147483648);
  assert.equal(postgresIntegerOrNull("2147483647.9"), 2147483647);
  assert.equal(postgresIntegerOrNull("2147483648"), null);
  assert.equal(postgresIntegerOrNull(Number.MAX_SAFE_INTEGER), null);
  assert.equal(postgresIntegerOrNull("not-a-number"), null);
});

test("confidence is bounded without inventing a clamped value", () => {
  assert.equal(confidenceIntegerOrNull("87.9"), 87);
  assert.equal(confidenceIntegerOrNull(-1), null);
  assert.equal(confidenceIntegerOrNull(101), null);
});

test("larger model output cap is limited to the explicit repair profile", () => {
  assert.equal(researchOutputTokenLimit(null), 4096);
  assert.equal(researchOutputTokenLimit("unknown"), 4096);
  assert.equal(researchOutputTokenLimit("engine_output_v2"), 8192);
});
