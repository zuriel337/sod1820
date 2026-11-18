// ELS search measurement: the client action family and the database proposal admit exactly the same "els" entry,
// and the projection of the code tool's real emit never carries the search term or a client account id.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { readingActionSpec, readingActionProps } from "../src/lib/publicReadingTelemetry2029.js";

const proposal = fs.readFileSync(new URL("../supabase/proposed/20261118210000_analytics_followups_PROPOSAL.sql", import.meta.url), "utf8");
const baseline = fs.readFileSync(new URL("../tests/analytics-followups-20261118/baseline-ingest-event.sql", import.meta.url), "utf8");

function proposedDbSpec() {
  const live = JSON.parse(baseline.match(/v_spec jsonb := '(\{.*\})'::jsonb;/)[1]);
  const added = proposal.match(/v_new text := '"content":\{[^}]*\{[^}]*\}\},("els":.*?)\}''::jsonb';/)[1];
  return { ...live, ...JSON.parse("{" + added + "}") };
}

test("client and proposed ingest_event spec are identical, family by family", () => {
  const client = readingActionSpec(), db = proposedDbSpec();
  assert.deepEqual(Object.keys(client).sort(), Object.keys(db).sort());
  for (const [family, spec] of Object.entries(client)) assert.deepEqual(spec, db[family], family);
  assert.deepEqual(db.els, { events: ["search", "cross_search"], fields: { kind: "token", scope: "token", skip: "int" } });
});

test("the code tool's emit is projected without the term or the account id", () => {
  // TzofenEmbed: track("els", term, kind === "cross" ? "cross_search" : "search", { kind, skip, scope, uid })
  const props = readingActionProps("els", "cross_search", { kind: "cross", skip: 12, scope: "torah", uid: "11111111-1111-4111-8111-111111111111", term: "משה" });
  assert.deepEqual(props, { action_version: 1, kind: "cross", scope: "torah", skip: 12 });
  assert.equal(readingActionProps("els", "save", { kind: "x" }), null);
});
