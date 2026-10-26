import test from "node:test";
import assert from "node:assert/strict";

import {
  ZVI_MULTI_VALUE_SPECS,
  buildZviMultiValueWorldProjection,
  fetchZviMultiValueWorldProjection,
} from "./zviMultiValueWorldProjection.js";

const rows = ZVI_MULTI_VALUE_SPECS.map((spec) => ({
  id: spec.id,
  statement: `statement:${spec.id}`,
  terms: spec.values.map(String),
  value: spec.values.length === 1 ? spec.values[0] : null,
  source_ref: `channel_updates:${spec.id}#finding`,
  contributor: "צבי (OPOC)",
  engine_verified: true,
  status: "approved",
  privacy_scope: "public",
}));

test("public Zvi multi-value findings remain separate strong review groups", () => {
  const projection = buildZviMultiValueWorldProjection(rows);
  assert.equal(projection.cards.length, 5);
  assert.deepEqual(projection.cards.map((card) => card.rank), [9, 45, 74, 146, 160]);
  assert.ok(projection.cards.every((card) => card.review.connectionStrength === "חזק"));
  assert.ok(projection.cards.every((card) => card.review.recommendation === "דורש בדיקה"));
  assert.ok(projection.cards.every((card) => card.review.independentSourceCount === null));
  assert.equal(projection.rules.occurrencesAreNotIndependentSources, true);
});

test("multi-value rows link each existing number separately and never invent target 1563", () => {
  const projection = buildZviMultiValueWorldProjection(rows);
  const missing = projection.cards.find((card) => card.values.includes(1563));
  const threeValues = projection.cards.find((card) => card.values.length === 3);
  assert.deepEqual(missing.targets, []);
  assert.deepEqual(threeValues.targets.map((target) => target.value), [86, 18, 68]);
  assert.ok(threeValues.targets.every((target) => target.href.startsWith("/2029/number/")));
});

test("private or unavailable rows never become public placeholder findings", async () => {
  const projection = buildZviMultiValueWorldProjection([{ ...rows[0], privacy_scope: "private" }]);
  assert.equal(projection.cards.length, 0);

  const client = {
    from() {
      const builder = {
        select() { return builder; },
        in() { return Promise.resolve({ data: null, error: { message: "denied" } }); },
      };
      return builder;
    },
  };
  const unavailable = await fetchZviMultiValueWorldProjection({ publicClient: () => client });
  assert.equal(unavailable.access.available, false);
  assert.equal(unavailable.counts.findings, null);
  assert.deepEqual(unavailable.cards, []);
});

test("the public projection performs one bounded RLS read", async () => {
  const calls = [];
  const client = {
    from(table) {
      const call = { table, fields: null, ids: null };
      calls.push(call);
      const builder = {
        select(fields) { call.fields = fields; return builder; },
        in(column, ids) { call.column = column; call.ids = ids; return Promise.resolve({ data: rows, error: null }); },
      };
      return builder;
    },
  };
  const projection = await fetchZviMultiValueWorldProjection({ publicClient: () => client });
  assert.equal(projection.cards.length, 5);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].table, "world_contributor_research_v1");
  assert.equal(calls[0].ids.length, 5);
});
