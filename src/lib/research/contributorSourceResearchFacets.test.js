import test from "node:test";
import assert from "node:assert/strict";
import {
  CONTRIBUTOR_RESEARCH_FACET,
  CONTRIBUTOR_TREE_CONNECTION_STATE,
  buildContributorSourceResearchFacets,
} from "./contributorSourceResearchFacets.js";

test("deferred research is never represented as zero or absent", () => {
  const facets = buildContributorSourceResearchFacets([], { deferred: true });
  assert.equal(facets.availability, "deferred");
  assert.equal(facets.rowCount, null);
  assert.equal(facets.tree.state, CONTRIBUTOR_TREE_CONNECTION_STATE.DEFERRED);
  assert.deepEqual(facets.categories, []);
});

test("exact occurrence facets use structured evidence without exposing match labels", () => {
  const facets = buildContributorSourceResearchFacets([
    {
      id: "research-1",
      value: 358,
      status: "verified",
      engine_verified: true,
      promoted_node_id: "node-1",
      meta: {
        ext: {
          gematria: { method_key: "standard", source_expression: "must-not-leak" },
          spatial_research: { classification: "spatial_gematria", cluster: "cluster-a" },
          wa_channel_intake: {
            tree_match_state: "matched_existing_tree",
            tree_matches: [{ type: "word", label: "must-not-leak" }, { type: "topic", label: "also-private" }],
            analysis_state: "extracted",
            media_ocr_pending: false,
            media_transcription_pending: false,
          },
        },
      },
    },
    {
      id: "research-2",
      status: "candidate",
      engine_verified: false,
      meta: {
        ext: {
          exact_duplicate_lineage: { occurrence_count: 2 },
          wa_channel_intake: {
            tree_match_state: "candidate_unmatched",
            analysis_state: "source_preserved_needs_deeper_media_analysis",
            media_ocr_pending: true,
            media_transcription_pending: false,
          },
        },
      },
    },
  ]);

  assert.equal(facets.availability, "loaded");
  assert.deepEqual(facets.categories, [
    CONTRIBUTOR_RESEARCH_FACET.NUMBER,
    CONTRIBUTOR_RESEARCH_FACET.GEMATRIA,
    CONTRIBUTOR_RESEARCH_FACET.SPATIAL,
    CONTRIBUTOR_RESEARCH_FACET.WORD_OR_PHRASE,
    CONTRIBUTOR_RESEARCH_FACET.TREE_CONNECTED,
    CONTRIBUTOR_RESEARCH_FACET.REVIEW_REQUIRED,
    CONTRIBUTOR_RESEARCH_FACET.DUPLICATE_LINEAGE,
  ]);
  assert.equal(facets.tree.state, CONTRIBUTOR_TREE_CONNECTION_STATE.CONNECTED);
  assert.equal(facets.tree.waitingRowCount, 1);
  assert.equal(facets.review.requiresOcr, true);
  assert.equal(facets.review.requiresTranscription, false);
  assert.deepEqual(facets.gematria.methodKeys, ["standard"]);
  assert.deepEqual(facets.wordOrPhrase.matchTypes, ["word"]);
  assert.equal(JSON.stringify(facets).includes("must-not-leak"), false);
  assert.equal(JSON.stringify(facets).includes("also-private"), false);
});

test("waiting tree state remains distinct from no structured connection", () => {
  const waiting = buildContributorSourceResearchFacets([{
    meta: { ext: { wa_channel_intake: { tree_match_state: "candidate_unmatched" } } },
  }]);
  const none = buildContributorSourceResearchFacets([{ meta: { ext: {} } }]);

  assert.equal(waiting.tree.state, CONTRIBUTOR_TREE_CONNECTION_STATE.WAITING_FOR_ASSIGNMENT);
  assert.ok(waiting.categories.includes(CONTRIBUTOR_RESEARCH_FACET.TREE_WAITING));
  assert.equal(none.tree.state, CONTRIBUTOR_TREE_CONNECTION_STATE.NO_STRUCTURED_CONNECTION);
  assert.equal(none.categories.includes(CONTRIBUTOR_RESEARCH_FACET.TREE_WAITING), false);
});
