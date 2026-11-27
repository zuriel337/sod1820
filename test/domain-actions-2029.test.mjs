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
