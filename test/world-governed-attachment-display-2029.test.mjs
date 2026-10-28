import test from "node:test";
import assert from "node:assert/strict";
import { buildWorldAllResearchProjection } from "../src/lib/research/worldAllResearchProjection.js";

function row(id, overrides = {}) {
  return {
    id,
    created_at: "2026-10-28T00:00:00Z",
    kind: "observation",
    statement: id,
    terms: [],
    value: 374,
    relates: [],
    source_ref: `channel_updates:${id}`,
    status: "canonical",
    privacy_scope: "public",
    engine_verified: true,
    engine_detail: { verification_state: "match" },
    meta: {},
    ...overrides,
  };
}

test("an exact governed number attachment appears as a documented World tree connection", () => {
  const targetId = "b84f4fbe-86aa-4c32-adbd-5a7dcf17450c";
  const projection = buildWorldAllResearchProjection({
    researchObjects: [row("attached", {
      promoted_node_id: targetId,
      meta: { governance: { tree_attachment: {
        mode: "existing_graph_identity_pointer",
        target_node_id: targetId,
        target_node_type: "number",
      } } },
    })],
  });
  const finding = projection.rows.find((item) => item.sourceId === "attached");
  assert.deepEqual(finding.treeMatches, [{
    type: "number", key: targetId, label: "374", match: "governed_attachment",
  }]);
  assert.equal(finding.researchStrength.label, "מאומת · מחובר לעץ");
});

test("an ordinary value or mismatched provenance never manufactures a tree connection", () => {
  const projection = buildWorldAllResearchProjection({
    researchObjects: [
      row("plain-value"),
      row("mismatched-attachment", {
        promoted_node_id: "b84f4fbe-86aa-4c32-adbd-5a7dcf17450c",
        meta: { governance: { tree_attachment: {
          mode: "existing_graph_identity_pointer",
          target_node_id: "1afaa6db-c996-4ea1-889a-b3a6057c475a",
          target_node_type: "number",
        } } },
      }),
      row("book-attachment", {
        promoted_node_id: "b84f4fbe-86aa-4c32-adbd-5a7dcf17450c",
        meta: { governance: { tree_attachment: {
          mode: "existing_graph_identity_pointer",
          target_node_id: "b84f4fbe-86aa-4c32-adbd-5a7dcf17450c",
          target_node_type: "book",
        } } },
      }),
    ],
  });
  for (const finding of projection.rows.filter((item) => item.family === "research_object")) {
    assert.deepEqual(finding.treeMatches, []);
    assert.equal(finding.researchStrength.label, "מאומת · טרם חובר לעץ");
  }
});
