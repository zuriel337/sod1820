import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  BEIT_MIDRASH_WORLD_AUDIENCE,
  buildBeitMidrashWorldSections,
  beitMidrashWorldSectionHref,
} from "../src/lib/research/beitMidrashWorldSections.js";
import { normalizeWorldAllResearchRow, worldPublicResearchDto } from "../src/lib/research/worldAllResearchProjection.js";

// The atlas lens is a filter over `documentedTreeConnected`, which the World projection derives ONLY from the governed attachment
// (`meta.governance.tree_attachment` on a canonical row). A raw `treeMatches` entry is a search hint, not graph evidence, so the
// default fixture below is a row the projection would really mark as connected; rows that only carry hints say so explicitly.
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
    documentedTreeAttachment: { targetNodeId: "node-1820", targetType: "number" },
    documentedTreeConnected: true,
    linkedTopicRating: { title: "1820", meterScore: 91, quality: 8 },
    occurrenceCount: 2,
    occurrences: [
      { sourceId: "f-1", sourceRef: "channel_updates:source-1#a2" },
      { sourceId: "f-2", sourceRef: "channel_updates:source-1#a7" },
    ],
    canonicalFindingHref: "/world?finding=f-1#finding-f-1",
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
  assert.equal(result.sections.crosses[0].canonicalFindingHref, "/world?finding=f-1#finding-f-1");
  assert.equal(result.sections.crosses[0].occurrenceCount, 2);
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
    canonicalFindingHref: "/world?admin=1&finding=private-candidate#finding-private-candidate",
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
    finding({
      id: "research:unmatched",
      sourceId: "unmatched",
      treeMatches: [],
      documentedTreeAttachment: null,
      documentedTreeConnected: false,
      linkedTopicRating: null,
    }),
    finding({ id: "research:unmetered", sourceId: "unmetered", linkedTopicRating: { title: "יעד", meterScore: null, quality: null } }),
  ];
  const result = buildBeitMidrashWorldSections({ rows });
  assert.deepEqual(result.sections.crosses.map((row) => row.sourceId), ["f-1", "unmatched", "unmetered"]);
  assert.deepEqual(result.sections.atlas.map((row) => row.sourceId), ["f-1", "unmetered"]);
  assert.deepEqual(result.sections.convergence.map((row) => row.sourceId), ["f-1"]);
});

test("a raw tree match is a search hint: it never puts a finding in the atlas", () => {
  const hintOnly = finding({
    id: "research:hint",
    sourceId: "hint",
    treeMatches: [{ type: "topic", key: "topic-1820", label: "1820", match: "candidate" }],
    documentedTreeAttachment: null,
    documentedTreeConnected: false,
  });
  const result = buildBeitMidrashWorldSections({ rows: [finding(), hintOnly] });
  assert.deepEqual(result.sections.crosses.map((row) => row.sourceId), ["f-1", "hint"], "the hint is still a public cross");
  assert.deepEqual(result.sections.atlas.map((row) => row.sourceId), ["f-1"], "only the governed attachment reaches the atlas");
  assert.deepEqual(result.sections.convergence.map((row) => row.sourceId), ["f-1", "hint"], "the convergence lens depends on the topic meter, not on the attachment");
});

test("the atlas admits exactly what the real World projection marks as governed-connected", () => {
  // Raw research_objects rows, normalized by the real projection and served through the real public DTO.
  const raw = (id, overrides = {}) => ({
    id,
    created_at: "2026-10-22T10:00:00Z",
    kind: "relation",
    statement: `נוסח ${id}`,
    source: "channel_updates",
    source_ref: `channel_updates:s-${id}`,
    contributor: "חוקר",
    confidence: 88,
    status: "canonical",
    privacy_scope: "public",
    value: 1820,
    promoted_node_id: "node-1820",
    meta: { governance: { tree_attachment: { mode: "existing_graph_identity_pointer", target_node_type: "number", target_node_id: "node-1820" } } },
    engine_verified: true,
    ...overrides,
  });
  const rows = [
    raw("governed"),
    // Hints and look-alikes that must NOT count as graph evidence:
    raw("hint-only", { promoted_node_id: null, meta: { ext: { wa_channel_intake: { tree_matches: [{ type: "topic", key: "t-1820", label: "1820" }] } } } }),
    raw("bare-promoted-id", { meta: {} }),
    raw("other-node", { promoted_node_id: "node-other" }),
    raw("only-approved", { status: "approved" }),
    raw("topic-target", { meta: { governance: { tree_attachment: { mode: "existing_graph_identity_pointer", target_node_type: "topic", target_node_id: "node-1820" } } } }),
    raw("wrong-mode", { meta: { governance: { tree_attachment: { mode: "free_text", target_node_type: "number", target_node_id: "node-1820" } } } }),
    raw("no-value", { value: null }),
  ].map((row) => normalizeWorldAllResearchRow(row));
  const result = buildBeitMidrashWorldSections(worldPublicResearchDto({ rows }));

  assert.deepEqual(result.sections.crosses.map((row) => row.sourceId).sort(), rows.map((row) => row.sourceId).sort(), "every public finding is a cross");
  assert.deepEqual(result.sections.atlas.map((row) => row.sourceId), ["governed"], "one governed attachment, nothing else");
  // The public lenses keep the yes/no (the row is in the atlas), never the governance attachment record itself.
  assert.equal(JSON.stringify(result).includes("existing_graph_identity_pointer"), false);
  for (const lens of Object.values(result.sections)) {
    for (const row of lens) assert.equal(Object.hasOwn(row, "documentedTreeAttachment"), false, "no attachment record in a public lens row");
  }
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
  const row = buildBeitMidrashWorldSections({ rows: [finding({
    id: "research:abc/12",
    sourceId: "abc/12",
    canonicalFindingHref: "/world?finding=abc%2F12#finding-abc%2F12",
  })] }).sections.crosses[0];
  assert.equal(row.canonicalFindingHref, "/world?finding=abc%2F12#finding-abc%2F12");
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
  assert.doesNotMatch(source, /admin=1/);
  assert.doesNotMatch(source, /search[_ ]?terms/i);
});

test("public lens rejects an admin or mismatched canonical route instead of inventing one", () => {
  const result = buildBeitMidrashWorldSections({ rows: [
    finding({ canonicalFindingHref: "/world?admin=1&finding=f-1#finding-f-1" }),
    finding({
      id: "research:f-2",
      sourceId: "f-2",
      canonicalFindingHref: "/world?finding=another#finding-another",
    }),
  ] });
  assert.deepEqual(result.sections.crosses.map((row) => row.canonicalFindingHref), [null, null]);
});

test("Beit Midrash consumes the canonical public World DTO without widening it", () => {
  const publicProjection = worldPublicResearchDto({
    rows: [
      finding({ triage: { recommendation: "manager-only" }, terms: ["private search term"] }),
      finding({ id: "research:private", sourceId: "private", access: "private" }),
      finding({ id: "research:candidate", sourceId: "candidate", status: "candidate" }),
    ],
  });
  const result = buildBeitMidrashWorldSections(publicProjection);
  assert.deepEqual(result.sections.crosses.map((row) => row.sourceId), ["f-1"]);
  assert.equal(result.sections.crosses[0].canonicalFindingHref, "/world?finding=f-1#finding-f-1");
  assert.equal(Object.hasOwn(result.sections.crosses[0], "triage"), false);
  assert.equal(JSON.stringify(result).includes("private search term"), false);
});
