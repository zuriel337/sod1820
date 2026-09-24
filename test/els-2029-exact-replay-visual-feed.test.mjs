import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildEls2029ReplayRequest,
  els2029ReplaySelectionKey,
  verifyEls2029Selection,
} from "../src/lib/research/els2029ReplayClient.js";
import { normalizeResearchContext } from "../src/lib/research/researchContext.js";

const selection = {
  entityType: "els",
  locator: "els:torah:משיח:regular:1:17",
  term: "משיח",
  corpus: "torah",
  start: 100,
  skip: 17,
  dir: 1,
};

test("Research Context preserves bounded ELS replay intent without creating truth state", () => {
  const out = normalizeResearchContext({
    subject: { id: "משיח", type: "phrase", label: "משיח" },
    selection,
    lens: "els",
  });
  assert.equal(out.selection.term, "משיח");
  assert.equal(out.selection.corpus, "torah");
  assert.equal(out.selection.start, 100);
  assert.equal(out.selection.skip, 17);
  assert.equal(out.selection.dir, 1);
  assert.equal("verified" in out.selection, false);
  assert.equal("truth" in out.selection, false);
  assert.equal("canonical" in out.selection, false);
});

test("exact replay request fails closed until full locus is present", () => {
  assert.equal(buildEls2029ReplayRequest({ entityType: "els", term: "משיח", corpus: "torah", skip: 17 }), null);
  assert.equal(buildEls2029ReplayRequest({ ...selection, dir: 0 }), null);
  assert.deepEqual(buildEls2029ReplayRequest(selection), {
    op: "verify",
    term: "משיח",
    scope: "torah",
    skip: 17,
    dir: 1,
    start: 100,
  });
  assert.equal(els2029ReplaySelectionKey(selection), "torah|משיח|17|1|100");
});

test("only canonical MATCH becomes a successful replay envelope", async () => {
  const match = await verifyEls2029Selection(selection, async (body) => ({
    data: {
      trace_id: "trace-1",
      result: {
        contract: "els_occurrence_replay_v1",
        status: "OK",
        verification_state: "MATCH",
        corpus_id: "torah-v1",
        input: { normalized: body.term },
        occurrence: {
          occurrence_id: "els:torah-v1:משיח:17:1:100",
          skip: 17,
          dir: 1,
          start: 100,
          end: 151,
          positions: [100,117,134,151],
          coordinate_convention: "zero_based_character_index",
        },
      },
    },
  }));
  assert.equal(match.ok, true);
  assert.equal(match.state, "MATCH");
  assert.equal(match.traceId, "trace-1");

  const mismatch = await verifyEls2029Selection(selection, async () => ({
    data: {
      result: {
        contract: "els_occurrence_replay_v1",
        status: "REPLAY_MISMATCH",
        verification_state: "MISMATCH",
        occurrence: null,
      },
    },
  }));
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.state, "REPLAY_MISMATCH");
  assert.equal(mismatch.result.occurrence, null);

  const missing = await verifyEls2029Selection({ ...selection, corpus: "tanakh" }, async () => ({
    data: {
      result: {
        contract: "els_occurrence_replay_v1",
        status: "MISSING_ADAPTER",
        verification_state: "NOT_TESTED",
        occurrence: null,
      },
    },
  }));
  assert.equal(missing.ok, false);
  assert.equal(missing.state, "MISSING_ADAPTER");
  assert.equal(missing.verificationState, "NOT_TESTED");
});

test("replay client never opens free-search/page behavior", () => {
  const src = readFileSync(new URL("../src/lib/research/els2029ReplayClient.js", import.meta.url), "utf8");
  assert.match(src, /op: "verify"/);
  assert.doesNotMatch(src, /op:\s*"search"|op:\s*"page"|findAllAdaptive|els_search_core_v1/);
});

test("legacy ELS state is stored only as replay intent before server verification", () => {
  const src = readFileSync(new URL("../src/lib/research/ResearchProvider.jsx", import.meta.url), "utf8");
  assert.match(src, /term,\s*corpus: scope,/);
  assert.match(src, /start,\s*skip:/);
  assert.match(src, /dir,/);
  assert.match(src, /must replay them through the canonical server verify boundary before rendering/);
});

console.log("ELS 2029 exact replay visual feed contract: PASS");
