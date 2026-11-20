// ELS search measurement: the client action family and the database proposal admit exactly the same "els" entry,
// and the projection of the code tool's real emit never carries the search term or a client account id.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { readingActionSpec, readingActionProps } from "../src/lib/publicReadingTelemetry2029.js";

const proposal = fs.readFileSync(new URL("../supabase/proposed/20261118210000_analytics_followups_PROPOSAL.sql", import.meta.url), "utf8");
const baseline = fs.readFileSync(new URL("../tests/analytics-followups-20261118/baseline-ingest-event.sql", import.meta.url), "utf8");
const elsProposal = fs.readFileSync(new URL("../supabase/proposed/20261119190000_els_action_telemetry_PROPOSAL.sql", import.meta.url), "utf8");

function proposedDbSpec() {
  const live = JSON.parse(baseline.match(/v_spec jsonb := '(\{.*\})'::jsonb;/)[1]);
  const added = proposal.match(/v_new text := '"content":\{[^}]*\{[^}]*\}\},("els":.*?)\}''::jsonb';/)[1];
  const previous = { ...live, ...JSON.parse("{" + added + "}") };
  // The 18 November proposal remains historical. Apply the separately reviewed
  // ELS-only extension in order, and continue comparing every family exactly.
  const oldEls = JSON.parse("{" + elsProposal.match(/v_old text := '([^']+)';/)[1] + "}");
  const nextEls = JSON.parse("{" + elsProposal.match(/v_new text := '([^']+)';/)[1] + "}");
  assert.deepEqual(oldEls.els, { events: ["search", "cross_search"], fields: { kind: "token", scope: "token", skip: "int" } });
  assert.deepEqual(previous.els, oldEls.els);
  assert.deepEqual(Object.keys(nextEls), ["els"], "the extension changes only the ELS family");
  const prior = { ...previous, ...nextEls };
  const siteProposal = fs.readFileSync(new URL("../supabase/proposed/sitewide-statistics-20261120/ingest_event.after.sql", import.meta.url), "utf8");
  const siteSpec = JSON.parse(siteProposal.match(/v_spec jsonb := '(\{.*\})'::jsonb;/)[1]);
  const { activity_2029, ...unchanged } = siteSpec;
  assert.deepEqual(unchanged, prior, "site activity must preserve every pre-existing family exactly");
  assert.ok(activity_2029, "site activity is an explicit extension of the existing ingest owner");
  return siteSpec;
}

test("client and proposed ingest_event spec are identical, family by family", () => {
  const client = readingActionSpec(), db = proposedDbSpec();
  assert.deepEqual(Object.keys(client).sort(), Object.keys(db).sort());
  for (const [family, spec] of Object.entries(client)) assert.deepEqual(spec, db[family], family);
  assert.deepEqual(db.els.events, ["search", "cross_search", "ui_action", "operation_started", "operation_phase", "operation_finished", "cancel_requested"]);
});

test("the code tool's emit is projected without the term or the account id", () => {
  // TzofenEmbed: track("els", term, kind === "cross" ? "cross_search" : "search", { kind, skip, scope, uid })
  const props = readingActionProps("els", "cross_search", { kind: "cross", skip: 12, scope: "torah", uid: "11111111-1111-4111-8111-111111111111", term: "משה" });
  assert.deepEqual(props, { action_version: 1, kind: "cross", scope: "torah", skip: 12 });
  assert.equal(readingActionProps("els", "save", { kind: "x" }), null);
});
