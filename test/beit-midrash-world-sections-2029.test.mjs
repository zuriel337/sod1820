import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  BEIT_MIDRASH_WORLD_AUDIENCE,
  buildBeitMidrashWorldSections,
  canonicalWorldFindingHref,
  beitMidrashWorldSectionHref,
} from "../src/lib/research/beitMidrashWorldSections.js";

function finding(overrides = {}) {
  return {
    id: "research:f-1",
    sourceId: "f-1",
    family: "research_object",
    statement: "נוסח מלא של הממצא",
    secondary: "הסבר",
    kind: "relation",
    values: [1820],
    sourceLabel: "מקור מחקר",
    sourceRef: "channel_updates:source-1#a2",
    sourceRefs: ["channel_updates:source-1#a2"],
    contributor: "חוקר",
    createdAt: "2026-10-22T10:00:00.000Z",
    verification: "match",
    status: "approved",
    access: "public",
    confidence: 88,
    treeMatches: [{ type: "topic", key: "topic-1820", label: "1820" }],
    linkedTopicRating: { title: "1820", meterScore: 91, quality: 8 },
    occurrenceCount: 2,
    occurrences: [
      { sourceId: "f-1", sourceRef: "channel_updates:source-1#a2" },
      { sourceId: "f-2", sourceRef: "channel_updates:source-1#a7" },
    ],
    canonicalFindingHref: "/world?admin=1&finding=f-1#finding-f-1",
    ...overrides,
  };
}

test("public Beit Midrash lenses fail closed for private and candidate findings", () => {
  const projection = {
    rows: [
      finding(),
      finding({ id: "research:private", sourceId: "private", access: "private" }),
      finding({ id: "research:candidate", sourceId: "candidate", status: "candidate" }),
    ],
    duplicateProjection: { nonDestructive: true },
  };

  const result = buildBeitMidrashWorldSections(projection);
  assert.deepEqual(result.sections.crosses.map((row) => row.sourceId), ["f-1"]);
  assert.deepEqual(result.sections.atlas.map((row) => row.sourceId), ["f-1"]);
  assert.deepEqual(result.sections.convergence.map((row) => row.sourceId), ["f-1"]);
  assert.equal(result.sections.crosses[0].triage, undefined);
  assert.equal(result.sections.crosses[0].canonicalFindingHref, null, "public DTO must not expose the admin review route");
  assert.equal(result.nonDestructiveDedup, true);
});

test("admin consumes the authorized review DTO without exposing triage to public", () => {
  const privateCandidate = finding({
    id: "research:private-candidate",
    sourceId: "private-candidate",
    status: "candidate",
    access: "private",
    evidenceQuality: { score: null, band: "unrated", label: "אין נתון" },
    independentSourceCount: 1,
    triage: {
      rank: 7,
      strength: "בינוני",
      recommendation: "לבדיקה",
      evidenceReason: "נדרש מקור נוסף",
      proposedTreeTarget: "topic:1820",
      recommendedKeepId: null,
      duplicateIds: [],
    },
  });
  const admin = buildBeitMidrashWorldSections(
    { projection: { rows: [privateCandidate], duplicateProjection: { nonDestructive: true } } },
    { audience: BEIT_MIDRASH_WORLD_AUDIENCE.ADMIN },
  );
  assert.equal(admin.sections.crosses.length, 1);
  assert.equal(admin.sections.crosses[0].triage.rank, 7);
  assert.equal(admin.sections.crosses[0].evidenceQuality.label, "אין נתון");
  assert.equal(admin.sections.crosses[0].canonicalFindingHref, "/world?admin=1&finding=private-candidate#finding-private-candidate");
});

test("atlas and convergence are canonical filters over the same rows", () => {
  const rows = [
    finding(),
    finding({ id: "research:unmatched", sourceId: "unmatched", treeMatches: [], linkedTopicRating: null }),
    finding({ id: "research:unmetered", sourceId: "unmetered", linkedTopicRating: { title: "יעד", meterScore: null, quality: null } }),
  ];
  const result = buildBeitMidrashWorldSections({ rows });
  assert.deepEqual(result.sections.crosses.map((row) => row.sourceId), ["f-1", "unmatched", "unmetered"]);
  assert.deepEqual(result.sections.atlas.map((row) => row.sourceId), ["f-1", "unmetered"]);
  assert.deepEqual(result.sections.convergence.map((row) => row.sourceId), ["f-1"]);
});

test("non-destructive occurrences and exact source locators survive the projection", () => {
  const row = buildBeitMidrashWorldSections({ rows: [finding()] }).sections.crosses[0];
  assert.equal(row.sourceRef, "channel_updates:source-1#a2");
  assert.equal(row.occurrences.length, 2);
  assert.equal(row.occurrences[1].sourceRef, "channel_updates:source-1#a7");
  assert.equal(row.sourceHref, null, "an internal locator must never become an invented URL");
});

test("only an upstream verified Web URL is carried as sourceHref", () => {
  const valid = buildBeitMidrashWorldSections({ rows: [finding({ sourceHref: "https://example.org/source" })] })
    .sections.crosses[0];
  const invalid = buildBeitMidrashWorldSections({ rows: [finding({ sourceHref: "channel_updates:source-1" })] })
    .sections.crosses[0];
  assert.equal(valid.sourceHref, "https://example.org/source");
  assert.equal(invalid.sourceHref, null);
});

test("canonical World deep-link and exact Beit Midrash return remain separate", () => {
  assert.equal(canonicalWorldFindingHref("abc/12"), "/world?admin=1&finding=abc%2F12#finding-abc%2F12");
  assert.equal(
    beitMidrashWorldSectionHref("atlas", "abc/12"),
    "/beit-midrash?tab=atlas&finding=abc%2F12#finding-abc%2F12",
  );
});

test("adapter owns no fetch, store, Supabase reader, ranking or dedup implementation", () => {
  const source = fs.readFileSync(new URL("../src/lib/research/beitMidrashWorldSections.js", import.meta.url), "utf8");
  assert.match(source, /filterWorldAllResearchRows/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\.from\s*\(|\.rpc\s*\(|createClient\s*\(/);
  assert.doesNotMatch(source, /clusterWorldResearchRows|compareWorldResearchStrength|admin_convergence_candidates/);
  assert.doesNotMatch(source, /search[_ ]?terms/i);
});
