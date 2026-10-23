import test from "node:test";
import assert from "node:assert/strict";

import {
  ZVI_SPATIAL_WORLD,
  buildSpatialAdminQueue,
  buildZviSpatialWorldProjection,
  fetchZviSpatialWorldProjection,
  verifySpatialModel,
} from "./zviSpatialWorldProjection.js";
import { SPATIAL_MODELS } from "../spatialModels.js";

test("the World projection contains twelve curated cases ordered by strength with stable ties", () => {
  assert.equal(ZVI_SPATIAL_WORLD.cards.length, 12);
  assert.equal(ZVI_SPATIAL_WORLD.counts.strong, 10);
  assert.equal(ZVI_SPATIAL_WORLD.counts.medium, 2);
  assert.equal(new Set(ZVI_SPATIAL_WORLD.cards.map((card) => card.slug)).size, 12);
  const strengths = ZVI_SPATIAL_WORLD.cards.map((card) => card.review.connectionStrength);
  assert.deepEqual(strengths.slice(0, 10), Array(10).fill("חזק"));
  assert.deepEqual(strengths.slice(10), ["בינוני", "בינוני"]);
});

test("canonical engine and deterministic arithmetic verify every displayed calculation", () => {
  for (const model of SPATIAL_MODELS) {
    const result = verifySpatialModel(model);
    assert.equal(result.exact, true, model.slug);
    assert.ok(result.gematria.every((item) => item.actual === item.expected), model.slug);
    assert.ok(result.operations.every((item) => item.actual === item.result), model.slug);
  }
});

test("strength, evidence, publication and source independence remain separate axes", () => {
  for (const card of ZVI_SPATIAL_WORLD.cards) {
    assert.notEqual(card.review.connectionStrength, card.review.evidenceQuality);
    assert.equal(card.review.publicationState, "אין נתון");
    assert.equal(card.source.independentSourceCount, null);
    assert.notEqual(card.review.connectionStrength, card.review.calculationState);
  }
  assert.equal(ZVI_SPATIAL_WORLD.rules.independentSourcesAreNotInferredFromOccurrences, true);
});

test("dedup is display-only: duplicate occurrence IDs remain inspectable", () => {
  const card = ZVI_SPATIAL_WORLD.cards.find((item) => item.slug === "emunah-brit-cube-612");
  assert.equal(card.source.occurrenceCount, 3);
  assert.equal(card.source.duplicateOccurrenceCount, 1);
  assert.ok(card.source.refs.includes(card.source.duplicateRefs[0]));
});

test("exact source locators return to the public Zvi library", () => {
  const card = ZVI_SPATIAL_WORLD.cards.find((item) => item.slug === "keter-icosahedron-620");
  assert.ok(card.source.locators.every((item) => item.exact));
  assert.ok(card.source.locators.every((item) => /source=tzvi-opoc/.test(item.href)));
  assert.ok(card.source.locators.every((item) => /#source-occurrence-/.test(item.href)));
});

test("known 681/861 contradiction stays in the admin queue", () => {
  const rows = [{
    id: "r1",
    statement: "ראש השנה: המבנה המשולש",
    source_ref: "channel_updates:07432406-3b24-4c44-8ed8-ca980dced60b",
    status: "approved",
    privacy_scope: "public",
    engine_verified: false,
    meta: {},
  }];
  const queue = buildSpatialAdminQueue(rows);
  assert.equal(queue.length, 1);
  assert.match(queue[0].needs, /681.*861/);
});

test("public fetch uses bounded live readers, pairs media and omits unavailable curated cards", async () => {
  const calls = [];
  const sourceId = "2eb781a4-1389-42b9-b19e-a1ff27ed861f";
  const sourceRef = `channel_updates:${sourceId}`;
  const client = {
    from(table) {
      const call = { table, fields: null, ids: null };
      calls.push(call);
      const builder = {
        select(fields) { call.fields = fields; return builder; },
        in(column, ids) {
          call.column = column;
          call.ids = ids;
          if (table === "world_contributor_research_v1") return Promise.resolve({ data: [{ id: "r1", source_ref: sourceRef, status: "approved", privacy_scope: "public", engine_verified: true }], error: null });
          return Promise.resolve({ data: [{ id: sourceId, text: "המקור המלא", image_url: "https://example.com/source.jpg", thumb_url: null, status: "live", created_at: "2026-08-04T15:13:20Z" }], error: null });
        },
      };
      return builder;
    },
  };
  const projection = await fetchZviSpatialWorldProjection({ publicClient: () => client });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map((call) => call.table).sort(), ["channel_updates", "world_contributor_research_v1"]);
  assert.equal(projection.cards.length, 1);
  assert.equal(projection.cards[0].slug, "hashgacha-pratit-1020");
  assert.equal(projection.cards[0].image, "https://example.com/source.jpg");
  assert.equal(projection.cards[0].live.representativeStatement, "המקור המלא");
});

test("a denied public read fails closed and never serves the static curation as public data", async () => {
  const client = {
    from() {
      const builder = { select() { return builder; }, in() { return Promise.resolve({ data: null, error: { message: "denied" } }); } };
      return builder;
    },
  };
  const projection = await fetchZviSpatialWorldProjection({ publicClient: () => client });
  assert.equal(projection.cards.length, 0);
  assert.equal(projection.access.available, false);
});

test("guest makes no admin read while an authorized manager receives the separate review queue", async () => {
  const sourceId = "2eb781a4-1389-42b9-b19e-a1ff27ed861f";
  const sourceRef = `channel_updates:${sourceId}`;
  const publicClient = {
    from(table) {
      const builder = {
        select() { return builder; },
        in() {
          return Promise.resolve(table === "channel_updates"
            ? { data: [{ id: sourceId, text: "מקור", status: "live", created_at: "2026-08-04T15:13:20Z" }], error: null }
            : { data: [{ id: "r1", source_ref: sourceRef, status: "approved", privacy_scope: "public" }], error: null });
        },
      };
      return builder;
    },
  };
  let adminReads = 0;
  const adminClient = {
    from(table) {
      adminReads += 1;
      const builder = {
        select() { return builder; }, eq() { return builder; }, or() { return builder; }, order() { return builder; },
        maybeSingle() { return Promise.resolve({ data: { id: "contributor-1", display_name: "צבי", wa_names: ["OPOC1 OPOC1"] }, error: null }); },
        limit() { return Promise.resolve({ data: [{ id: "q1", statement: "קוביה חדשה לבדיקה", source_ref: "channel_updates:07432406-3b24-4c44-8ed8-ca980dced60b", status: "candidate", privacy_scope: "public", meta: {} }], error: null }); },
      };
      return builder;
    },
  };
  const guest = await fetchZviSpatialWorldProjection({ publicClient: () => publicClient, adminClient, includeAdmin: false });
  assert.equal(adminReads, 0);
  assert.equal(guest.adminQueue.length, 0);
  const manager = await fetchZviSpatialWorldProjection({ publicClient: () => publicClient, adminClient, includeAdmin: true });
  assert.equal(adminReads, 2);
  assert.equal(manager.adminQueue.length, 1);
  assert.equal(manager.access.adminQueue, "authorized");
});

test("custom projection input does not invent a zero strength score", () => {
  const result = buildZviSpatialWorldProjection(SPATIAL_MODELS.slice(0, 1));
  assert.equal(result.cards[0].review.connectionStrength, "חזק");
  assert.notEqual(result.cards[0].review.connectionStrength, 0);
});
