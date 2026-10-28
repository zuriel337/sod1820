import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWorldAllResearchProjection,
  worldPublicResearchDto,
} from "../src/lib/research/worldAllResearchProjection.js";

function approvedFinding(id, treeMatches = []) {
  return {
    id,
    created_at: "2026-10-26T00:00:00Z",
    kind: "observation",
    statement: `ממצא ${id}`,
    terms: [],
    value: null,
    relates: [],
    source_ref: `channel_updates:${id}`,
    status: "approved",
    privacy_scope: "public",
    meta: { ext: { wa_channel_intake: { tree_matches: treeMatches } } },
  };
}

test("World exposes only an explicitly documented tree match", () => {
  const projection = buildWorldAllResearchProjection({
    researchObjects: [
      approvedFinding("374-without-documentation"),
      approvedFinding("802-documented", [{ type: "number", key: "802", label: "802", match: "value" }]),
    ],
    topics: [],
    contributions: [],
    sourceMessages: [],
  });
  const dto = worldPublicResearchDto(projection);
  const byId = Object.fromEntries(dto.rows.map((row) => [row.sourceId, row]));

  assert.deepEqual(byId["374-without-documentation"].treeMatches, []);
  assert.deepEqual(byId["802-documented"].treeMatches, [
    { type: "number", key: "802", label: "802", match: "value" },
  ]);
  assert.equal(projection.treeMatchedResearch, 1);
});
