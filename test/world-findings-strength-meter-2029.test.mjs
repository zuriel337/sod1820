import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWorldAllResearchProjection,
  compareWorldResearchStrength,
  filterWorldAllResearchRows,
} from "../src/lib/research/worldAllResearchProjection.js";

function researchRow(id, {
  statement = id,
  verification = null,
  treeMatches = [],
  privacy = "private",
  status = "candidate",
  value = 1820,
} = {}) {
  return {
    id,
    created_at: "2026-10-22T00:00:00Z",
    kind: "observation",
    statement,
    terms: [String(value)],
    value,
    relates: [],
    source: "wa_channel_research",
    source_ref: `channel_updates:${id}`,
    contributor: "צבי",
    confidence: null,
    engine_verified: verification === "match",
    engine_detail: verification ? { verification_state: verification } : {},
    status,
    privacy_scope: privacy,
    parent_id: null,
    meta: {
      ext: {
        wa_channel_intake: {
          tree_matches: treeMatches,
          tree_match_state: treeMatches.length ? "matched_existing_tree" : "candidate_unmatched",
        },
      },
    },
  };
}

const linkedTopic = {
  id: "topic-1",
  created_at: "2026-10-21T00:00:00Z",
  approved_at: null,
  slug: "private-target",
  title: "יעד שעדיין לא פורסם",
  subtitle: null,
  search_terms: ["1820"],
  image_ids: [],
  numbers: [1820],
  highlight_numbers: [1820],
  status: "candidate",
  quality: 8,
  meter_score: 93,
  created_by: "ZURIEL",
  node_id: null,
};

test("candidate topic navigation and its meter remain visible without claiming a graph connection", () => {
  const projection = buildWorldAllResearchProjection({
    researchObjects: [
      researchRow("strong-linked", {
        verification: "match",
        treeMatches: [{ type: "topic", key: "private-target", label: linkedTopic.title, match: "number" }],
      }),
      researchRow("match-unlinked", { verification: "match" }),
      researchRow("review-linked", {
        treeMatches: [{ type: "topic", key: "private-target", label: linkedTopic.title, match: "number" }],
      }),
    ],
    contributions: [],
    sourceMessages: [],
    topics: [linkedTopic],
  });

  const findings = filterWorldAllResearchRows(projection.rows, { family: "research_object" });
  assert.deepEqual(findings.map((row) => row.sourceId), ["strong-linked", "match-unlinked", "review-linked"]);
  assert.equal(compareWorldResearchStrength(findings[0], findings[1]) < 0, true);

  const strongest = findings[0];
  assert.equal(strongest.access, "private", "review display must not publish or widen the finding");
  assert.equal(strongest.status, "candidate", "review display must not approve the finding");
  assert.equal(strongest.verification, "match");
  assert.equal(strongest.linkedTopicRating.meterScore, 93);
  assert.equal(strongest.linkedTopicRating.quality, 8);
  assert.equal(strongest.linkedTopicRating.status, "candidate", "an unpublished Topic can be reviewed without publication");
  assert.equal(strongest.linkedTopicRating.connectionState, "candidate");
  assert.equal(strongest.researchStrength.label, "מאומת · קשר לעץ לא אומת");
  assert.match(strongest.researchStrength.reasons.join(" "), /יעדים לבחינה/);
  assert.equal(projection.treeMatchedResearch, 0);
  assert.equal(projection.meteredResearch, 2);
  assert.equal(projection.treeMatchedResearchOccurrences, 0);
  assert.equal(projection.meteredResearchOccurrences, 2);
  assert.deepEqual(
    filterWorldAllResearchRows(projection.rows, { family: "research_object", tree: "matched", meter: "metered" })
      .map((row) => row.sourceId),
    [],
  );
});

test("missing meter stays unknown and never becomes zero or a reason to hide a finding", () => {
  const projection = buildWorldAllResearchProjection({
    researchObjects: [researchRow("unrated")],
    contributions: [],
    sourceMessages: [],
    topics: [],
  });
  const finding = projection.rows.find((row) => row.family === "research_object");
  assert.ok(finding);
  assert.equal(finding.linkedTopicRating, null);
  assert.equal(finding.researchStrength.hasLinkedMeter, false);
  assert.match(finding.researchStrength.reasons.join(" "), /אין עדיין מד/);
});

test("an exact duplicate cluster preserves a tree match carried by a non-canonical occurrence", () => {
  const withoutTree = researchRow("a-longer", { verification: "match", statement: "אות 1820" });
  const withTree = researchRow("z-linked", {
    verification: "match",
    statement: "אות 1820",
    treeMatches: [{ type: "topic", key: "private-target", label: linkedTopic.title, match: "number" }],
  });
  const projection = buildWorldAllResearchProjection({
    researchObjects: [withoutTree, withTree],
    contributions: [],
    sourceMessages: [],
    topics: [linkedTopic],
  });
  const findings = projection.rows.filter((row) => row.family === "research_object");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].occurrenceCount, 2);
  assert.equal(findings[0].treeMatches.length, 1);
  assert.equal(findings[0].linkedTopicRating.meterScore, 93);
  assert.equal(projection.treeMatchedResearchOccurrences, 0);
  assert.equal(projection.meteredResearchOccurrences, 1);
});
