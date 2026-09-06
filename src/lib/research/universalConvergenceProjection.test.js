// Tests for the Universal Convergence Projection reshape — run with:
//   node --test src/lib/research/universalConvergenceProjection.test.js
// Node's built-in runner, pure function only (no supabase/network). The async fetch wrapper just
// delegates to fetchEntityHubProjection (already covered elsewhere) and is not re-tested here.
// UNIVERSAL_CONVERGENCE_PROJECTION_1111_V1 (work_log dispatch 91662527-ce5e-4dbf-bc46-0e3dc8612588).

import { test } from "node:test";
import assert from "node:assert/strict";
import { projectUniversalConvergence } from "./universalConvergenceProjection.js";

test("returns null when there is no projection to reshape (number has no node — Foundation gap, not an error)", () => {
  assert.equal(projectUniversalConvergence(null, 1111), null);
});

test("reshapes the three facets (topics/equality/graph) without inventing or dropping data", () => {
  const fakeEntityHubProjection = {
    identity: { nodeId: "node-1111", type: "number", label: "1111" },
    topics: { rows: [{ id: "t1", slug: "tzvi-conv-1111" }], findings: [{ id: "uf1", kind: "convergence" }] },
    gematria: {
      families: [{ method: "רגיל", count: 3, phrases: [{ phrase: "אבג" }] }],
      registry: [{ method_key: "רגיל", db_column: "ragil" }],
      phraseEntities: { "אבג": { nodeId: "n-1", href: "/entity-hub-preview/entity/אבג" } },
      note: "registry note",
    },
    graph: { entity: { id: "uf-entity" }, relations: [{ id: "uf-rel-1" }] },
    surface: { galleriesCount: 2 },
  };

  const out = projectUniversalConvergence(fakeEntityHubProjection, 1111);
  assert.equal(out.v, 1);
  assert.equal(out.number, 1111);
  assert.deepEqual(out.identity, fakeEntityHubProjection.identity);
  assert.deepEqual(out.topics, fakeEntityHubProjection.topics, "authored Topic content passes through unchanged");
  assert.deepEqual(out.equality.families, fakeEntityHubProjection.gematria.families, "registry-driven equality families pass through unchanged");
  assert.deepEqual(out.equality.registry, fakeEntityHubProjection.gematria.registry);
  assert.deepEqual(out.equality.phraseEntities, fakeEntityHubProjection.gematria.phraseEntities);
  assert.deepEqual(out.graph, fakeEntityHubProjection.graph, "graph connections pass through unchanged");
  assert.equal(out.surface, fakeEntityHubProjection.surface);
  assert.equal(out.source, "fetchEntityHubProjection");
  assert.equal(typeof out.generatedAt, "string");
});

test("missing gematria/topics/graph facets fall back to empty shapes, never throw", () => {
  const out = projectUniversalConvergence({ identity: { nodeId: "n", type: "number", label: "7" } }, 7);
  assert.deepEqual(out.topics, { rows: [], findings: [] });
  assert.deepEqual(out.equality, { families: [], registry: [], phraseEntities: {}, note: null });
  assert.deepEqual(out.graph, { entity: null, relations: [] });
});

test("non-finite number input falls back to identity.label rather than fabricating a number", () => {
  const out = projectUniversalConvergence({ identity: { label: "1111" } }, "not-a-number");
  assert.equal(out.number, "1111");
});
