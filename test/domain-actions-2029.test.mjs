import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const lib = await import("../src/lib/domainActions2029.js");
const payload = { version: 1, state: "measured", window: "week", from: "2026-11-20", to: "2026-11-26", registrations: 4, signed_in_users: 9, community_messages: 30, messages_with_reactions: 12,
  contributions: 2, subscribers: 3, subscribe_events: null, push_subscriptions: 0, issue_reports: 1, visitor_load: { visitors: 40, sessions: 70, identified_persons: 5, views: 300, top1_share_pct: 30.5, top3_share_pct: 45 } };

test("forbidden, unavailable or malformed payloads draw nothing", () => {
  assert.equal(lib.domainActionsModel(null), null);
  assert.equal(lib.domainActionsModel({ version: 1, state: "forbidden" }), null);
  assert.equal(lib.domainActionsModel({ ...payload, version: 2 }), null);
});
test("a missing measurement is not drawn as zero; a real zero is", () => {
  const m = lib.domainActionsModel(payload);
  assert.equal(m.rows.find(r => r.key === "subscribe_events").value, null);
  assert.equal(m.rows.find(r => r.key === "push_subscriptions").value, 0);
  assert.equal(m.rows.length, 9);
});
test("session, visitor, identified person and activity stay four separate numbers", () => {
  const m = lib.domainActionsModel(payload);
  assert.deepEqual([m.load.visitors, m.load.sessions, m.load.identified, m.load.views], [40, 70, 5, 300]);
});
test("the panel never calls a heavy visitor a bot and carries no identifier", () => {
  const comp = readFileSync(new URL("../src/components/experience2029/DomainActions2029.jsx", import.meta.url), "utf8");
  const lb = readFileSync(new URL("../src/lib/domainActions2029.js", import.meta.url), "utf8");
  assert.match(comp, /אינה סיווג ואינה חשד/);
  for (const text of [comp, lb]) assert.doesNotMatch(text, /session_id|sod_id|person_id|\.from\(|emit\(|localStorage/);
  assert.match(lb, /rpc\("research_domain_actions_2029"/);
  const host = readFileSync(new URL("../src/components/experience2029/OperationalMetrics2029.jsx", import.meta.url), "utf8");
  assert.match(host, /<DomainActions2029 \/>/);
});

test("expected-but-not-arriving: grouped by status, day-level dates only, malformed rows dropped", () => {
  const m = lib.domainActionsModel({ ...payload, expected_silence: [
    { surface: "calculator_2029", event: "first_compute", status: "expected", last_seen: "2026-10-12" },
    { surface: "nav_2029", event: "panel_open", status: "awaiting_release", last_seen: null },
    { surface: "story_2029", event: "impression", status: "preserved", last_seen: null },
    { surface: "bad surface!", event: "x", status: "expected" }, { surface: "els", event: "ui_action", status: "expected", last_seen: "2026-10-12T10:11:12Z" }] });
  assert.deepEqual(m.silence.expected.map(x => x.key), ["calculator_2029/first_compute", "els/ui_action"]);
  assert.equal(m.silence.expected[0].last, "2026-10-12");
  assert.equal(m.silence.expected[1].last, null, "a time of day is never shown");
  assert.deepEqual(m.silence.awaiting.map(x => x.key), ["nav_2029/panel_open"]);
  assert.deepEqual(m.silence.preserved.map(x => x.key), ["story_2029/impression"]);
});
test("the SQL catalog equals expected-events.json, and the preserved capabilities are never removed", async () => {
  const cat = JSON.parse(readFileSync(new URL("../docs/reviews/measurement-closure-20261127/expected-events.json", import.meta.url), "utf8")).events;
  const sql = readFileSync(new URL("../supabase/proposed/measurement-domain-actions-20261127/PROPOSAL.sql", import.meta.url), "utf8");
  const rows = [...sql.matchAll(/\('([a-z0-9_]+)','([a-z0-9_]+)','(expected|awaiting_release|preserved)'\)/g)].map(m => m[1] + "/" + m[2] + "/" + m[3]);
  assert.deepEqual(rows, cat.map(c => c.surface + "/" + c.event + "/" + c.status));
  const { readingActionSpec } = await import("../src/lib/publicReadingTelemetry2029.js");
  const { readingStorySpec } = await import("../src/lib/publicReadingStorySpec2029.js");
  assert.ok(readingActionSpec().journey_2029, "journey_2029 stays in the public allow-list");
  assert.ok(readingStorySpec().story_2029, "story_2029 stays defined");
  const preserved = cat.filter(c => c.status === "preserved").map(c => c.surface);
  assert.ok(preserved.includes("story_2029") && preserved.includes("journey_2029"));
  const transport = readFileSync(new URL("../public-reading-deploy/transport.js", import.meta.url), "utf8");
  assert.match(transport, /registerMeasurementFamilies2029\(readingStorySpec\(\)\)/, "the worker still carries the story family");
  const allow = readFileSync(new URL("../supabase/proposed/measurement-allowlist-20261127/PROPOSAL.sql", import.meta.url), "utf8");
  assert.doesNotMatch(allow.split("\n").filter(l => !l.trim().startsWith("--")).join("\n"), /story_2029|journey_2029/, "no proposal removes a preserved family");
});
