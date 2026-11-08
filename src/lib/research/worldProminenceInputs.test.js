// node --test src/lib/research/worldProminenceInputs.test.js
// PF4: the research supplement read no longer repeats `meta` for rows whose Hub read already carried it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { supabase } from "../supabase.js";
import { fetchWorldProminenceInputs } from "./worldProminenceInputs.js";
import { buildWorldContextualProminence } from "./worldContextualProminence.js";

const HUB_FIELDS = ["id", "created_at", "kind", "statement", "terms", "value", "relates", "source", "source_ref", "contributor", "confidence",
  "engine_verified", "engine_detail", "status", "privacy_scope", "promoted_node_id", "meta"];

const heavyMeta = (i) => ({ source_refs: [`posts:${i}`], ext: { presentation: { summary: "ש".repeat(900) }, notes: "נ".repeat(1500) } });
const dbRow = (i) => ({
  id: `r${i}`, created_at: `2026-10-0${1 + (i % 8)}T10:00:00Z`, kind: "observation", statement: `קריאה ${i}`, terms: ["1820"], value: 1820, relates: [],
  source: "agent", source_ref: `posts:${4000 + i}`, contributor: "SOD1820", confidence: 0.8, engine_verified: true,
  engine_detail: { verification_state: "verified" }, status: "approved", privacy_scope: "public", promoted_node_id: null,
  parent_id: i % 3 === 0 ? `r${i + 1}` : null, evidence: `עדות ${i}`, owner_person_id: null, meta: heavyMeta(i),
});
const project = (row, columns) => Object.fromEntries(columns.map((c) => [c, row[c]]));

// What the Hub read returns for the page: HUB_FIELDS only (no parent_id / evidence / owner_person_id).
const hubRows = (n) => Array.from({ length: n }, (_, i) => project(dbRow(i), HUB_FIELDS));
const hubData = (rows) => ({
  identity: { nodeId: "n1820", type: "number", label: "1820" }, graph: { relations: [] },
  research: { rows, findings: [] }, topics: { rows: [], findings: [] }, sources: [],
});

function fakeBackend(table, log) {
  return (name) => {
    const state = { name, select: null, ids: null };
    const builder = {
      select(columns) { state.select = columns; return builder; },
      in(_, ids) { state.ids = ids; return builder; },
      eq() { return builder; },
      maybeSingle() { log.push(state); return Promise.resolve({ data: null, error: null }); },
      then(resolve, reject) {
        log.push(state);
        const columns = state.select.split(",");
        const rows = name === "research_objects" ? (state.ids || []).map((id) => table.find((r) => r.id === id)).filter(Boolean).map((r) => project(r, columns)) : [];
        return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
      },
    };
    return builder;
  };
}

async function readInputs(data) {
  const table = Array.from({ length: 40 }, (_, i) => dbRow(i));
  const log = [], original = supabase.from;
  supabase.from = fakeBackend(table, log);
  try { return { inputs: await fetchWorldProminenceInputs(data), log }; } finally { supabase.from = original; }
}

test("supplement read omits meta when every Hub row already carries it, and still returns the three missing columns", async () => {
  const { inputs, log } = await readInputs(hubData(hubRows(15)));
  const read = log.find((q) => q.name === "research_objects");
  assert.equal(read.select, "id,parent_id,evidence,owner_person_id");
  assert.equal(read.ids.length, 15);
  assert.equal(inputs.researchSupplements.length, 15);
  for (const row of inputs.researchSupplements) {
    assert.deepEqual(Object.keys(row).sort(), ["evidence", "id", "owner_person_id", "parent_id"]);
  }
  assert.equal(inputs.access.researchSupplements, true);
});

test("supplement read still asks for meta when a Hub row arrived without the key", async () => {
  const rows = hubRows(4);
  delete rows[2].meta;
  const { log } = await readInputs(hubData(rows));
  assert.equal(log.find((q) => q.name === "research_objects").select, "id,parent_id,evidence,owner_person_id,meta");
});

test("prominence composed from the slim supplements is identical to the one composed from the full supplements", async () => {
  const data = hubData(hubRows(20));
  const { inputs: slim } = await readInputs(data);
  const table = Array.from({ length: 40 }, (_, i) => dbRow(i));
  const full = {
    ...slim,
    researchSupplements: slim.researchSupplements.map((row) => ({ ...row, meta: table.find((r) => r.id === row.id).meta })),
  };
  const fromSlim = buildWorldContextualProminence(data, slim, { limit: 12 });
  const fromFull = buildWorldContextualProminence(data, full, { limit: 12 });
  assert.ok(fromSlim.items.length > 0, "fixture must reach the composer");
  assert.deepEqual(fromSlim, fromFull);
});

test("no research rows: no supplement request at all", async () => {
  const { log } = await readInputs(hubData([]));
  assert.equal(log.some((q) => q.name === "research_objects"), false);
});
