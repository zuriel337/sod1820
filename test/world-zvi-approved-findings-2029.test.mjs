import test from "node:test";
import assert from "node:assert/strict";
import { fetchZviApprovedFindingsPage, ZVI_SOURCE_CONTRIBUTOR_ID } from "../src/lib/research/worldZviApprovedFindings2029.js";

const sourceId = "e720a119-00e7-4e27-8c8a-d8671ae7b474";
const uuid = (number) => `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
const row = (number, overrides = {}) => ({
  id: uuid(number), created_at: "2026-10-28T12:00:00Z", statement: `טקסט ${number}`,
  source_contributor_id: ZVI_SOURCE_CONTRIBUTOR_ID, contributor: "OPOC1",
  source_ref: `channel_updates:${sourceId}#${number}`, status: "approved", privacy_scope: "public",
  meta: { ext: { presentation: { statement_role: "research_statement" } } }, ...overrides,
});
function client(rows, calls, { error = null, sourceError = null, sourceRows = [{ id: sourceId, status: "live", channel: "tzvi" }], serverFilters = true } = {}) {
  return { from(table) {
    calls.push(["from", table]);
    let filtered = (table === "channel_updates" ? sourceRows : rows).slice();
    const q = {
      select(fields) { calls.push(["select", fields]); return q; },
      eq(key, value) { calls.push(["eq", key, value]); if (serverFilters) filtered = filtered.filter((r) => (key === "meta->ext->presentation->>statement_role" ? r.meta?.ext?.presentation?.statement_role : r[key]) === value); return q; },
      in(key, values) { calls.push(["in", key, values]); if (serverFilters) filtered = filtered.filter((r) => values.includes(r[key])); return q; },
      not(key, operator, value) { calls.push(["not", key, operator, value]); if (serverFilters) filtered = filtered.filter((r) => r[key] != null && !String(r[key]).includes(value.replaceAll("%", ""))); return q; },
      order(key, options) { calls.push(["order", key, options]); return q; },
      or(filter) {
        calls.push(["or", filter]);
        const match = /^created_at\.lt\."([^"]+)",and\(created_at\.eq\."[^"]+",id\.lt\.([0-9a-f-]+)\)$/.exec(filter);
        assert.ok(match);
        filtered = filtered.filter((r) => r.created_at < match[1] || (r.created_at === match[1] && r.id < match[2]));
        return q;
      },
      async limit(max) {
        calls.push(["limit", max]);
        filtered.sort((a,b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
        return { data: filtered.slice(0, max), error };
      },
      then(resolve, reject) { return Promise.resolve({ data: filtered, error: sourceError }).then(resolve, reject); },
    };
    return q;
  } };
}

test("the reader uses the anonymous public view, exact source identity and explicit governance filters", async () => {
  const calls = [];
  const result = await fetchZviApprovedFindingsPage({ client: client([row(1)], calls) });
  assert.deepEqual(calls[0], ["from", "world_contributor_research_v1"]);
  assert.ok(calls.some((c) => c[0] === "eq" && c[1] === "source_contributor_id" && c[2] === ZVI_SOURCE_CONTRIBUTOR_ID));
  assert.ok(calls.some((c) => c[0] === "eq" && c[1] === "privacy_scope" && c[2] === "public"));
  assert.ok(calls.some((c) => c[0] === "in" && c[1] === "status" && c[2].join() === "approved,canonical"));
  assert.ok(calls.some((c) => c[0] === "eq" && c[1] === "meta->ext->presentation->>statement_role" && c[2] === "research_statement"));
  assert.ok(calls.some((c) => c[0] === "not" && c[1] === "statement" && c[2] === "ilike" && c[3] === "%צוריאל%"));
  assert.deepEqual(calls.filter((c) => c[0] === "order").map((c) => c[1]), ["created_at", "id"]);
  assert.equal(result.rows[0].contributor, "OPOC1");
  assert.equal(result.rows[0].findingHref, `/world?finding=${uuid(1)}`);
  assert.ok(result.rows[0].sourceHref.includes(encodeURIComponent(`channel_updates:${sourceId}`)));
  assert.ok(!("engineVerified" in result.rows[0]));
});

test("a faulty upstream response cannot expose private, person-only, candidate or differently attributed sources", async () => {
  const calls = [];
  const rows = [row(1), row(2, { privacy_scope: "private" }), row(3, { status: "candidate" }),
    row(4, { meta: { ext: { personal_scope: { scope: "person_only" } } } }),
    row(5, { source_contributor_id: uuid(99) }), row(6, { id: "not-a-uuid" })];
  const result = await fetchZviApprovedFindingsPage({ client: client(rows, calls, { serverFilters: false }) });
  assert.deepEqual(result.rows.map((r) => r.id), [uuid(1)]);
});

test("pages use bounded explicit requests and no rows are lost at their boundary", async () => {
  const rows = Array.from({ length: 53 }, (_, index) => row(index + 1));
  const calls = [];
  const c = client(rows, calls);
  const first = await fetchZviApprovedFindingsPage({ client: c });
  const second = await fetchZviApprovedFindingsPage({ client: c, cursor: first.nextCursor });
  const third = await fetchZviApprovedFindingsPage({ client: c, cursor: second.nextCursor });
  assert.deepEqual([first.rows.length, second.rows.length, third.rows.length], [25, 25, 3]);
  assert.deepEqual([first.hasMore, second.hasMore, third.hasMore], [true, true, false]);
  assert.equal(new Set([...first.rows, ...second.rows, ...third.rows].map((r) => r.id)).size, 53);
  assert.deepEqual(calls.filter((c) => c[0] === "limit").map((c) => c[1]), [26, 26, 26]);
  assert.equal(calls.filter((c) => c[0] === "or").length, 2);
});

test("newer insertions between requests do not duplicate or hide existing equal-timestamp rows", async () => {
  const rows = Array.from({ length: 30 }, (_, index) => row(index + 1));
  const c = client(rows, []);
  const first = await fetchZviApprovedFindingsPage({ client: c });
  rows.push(row(100, { created_at: "2026-10-29T12:00:00Z" }));
  const second = await fetchZviApprovedFindingsPage({ client: c, cursor: first.nextCursor });
  const ids = [...first.rows, ...second.rows].map((r) => r.id);
  assert.equal(new Set(ids).size, 30);
  assert.equal(ids.includes(uuid(100)), false);
  assert.equal(second.hasMore, false);
});

test("a missing channel source is omitted rather than exposed or assigned a guessed link", async () => {
  const result = await fetchZviApprovedFindingsPage({ client: client([row(1, { source_ref: "unverified-source", value: null })], []) });
  assert.deepEqual(result.rows, []);
  assert.equal(result.omittedUnavailable, true);
  const visible = await fetchZviApprovedFindingsPage({ client: client([row(1, { value: null })], []) });
  assert.ok(!("value" in visible.rows[0]));
});

test("failed reads and invalid page parameters fail instead of returning an invented empty collection", async () => {
  await assert.rejects(fetchZviApprovedFindingsPage({ client: client([], [], { error: new Error("offline") }) }), /offline/);
  await assert.rejects(fetchZviApprovedFindingsPage({ client: client([], []), cursor: { id: "invalid", createdAt: "invalid" } }), /invalid_public_findings_page/);
  await assert.rejects(fetchZviApprovedFindingsPage({ client: client([], []), pageSize: 51 }), /invalid_public_findings_page/);
});

test("inactive or unavailable channel sources fail closed without revealing finding text", async () => {
  const inactive = await fetchZviApprovedFindingsPage({ client: client([row(1)], [], { sourceRows: [{ id: sourceId, status: "off", channel: "tzvi" }] }) });
  assert.deepEqual(inactive.rows, []);
  assert.equal(inactive.omittedUnavailable, true);
  await assert.rejects(fetchZviApprovedFindingsPage({ client: client([row(1)], [], { sourceError: new Error("source offline") }) }), /source offline/);
});

test("existing World exclusions remove Or Geula and OpenWeb research before presentation", async () => {
  const orGeula = await fetchZviApprovedFindingsPage({ client: client([row(1)], [], { sourceRows: [{ id: sourceId, status: "live", channel: "or-geula" }] }) });
  assert.deepEqual(orGeula.rows, []);
  const openWeb = await fetchZviApprovedFindingsPage({ client: client([row(2, { source: "openweb_legacy" })], []) });
  assert.deepEqual(openWeb.rows, []);
});

test("only research statements are shown; a reference to the owner is suppressed even with Hebrew marks", async () => {
  const rows = [row(1), row(2, { meta: { ext: { presentation: { statement_role: "message" } } } }),
    row(3, { statement: "לצוריאל שלום" }), row(4, { statement: "לצוּריאל שלום" }), row(5, { contributor: "צוריאל" })];
  const result = await fetchZviApprovedFindingsPage({ client: client(rows, [], { serverFilters: false }) });
  assert.deepEqual(result.rows.map((r) => r.id), [uuid(1)]);
});

test("OCR text and rows marked as OCR must be identified as needing source review", async () => {
  const rows = [row(1, { statement: "OCR: טקסט מסריקה" }), row(2, { meta: { ext: { presentation: { statement_role: "research_statement" }, wa_channel_intake: { ocr_used: true } } } }), row(3)];
  const result = await fetchZviApprovedFindingsPage({ client: client(rows, []) });
  assert.deepEqual(Object.fromEntries(result.rows.map((r) => [r.id, r.ocrNeedsReview])), { [uuid(3)]: false, [uuid(2)]: true, [uuid(1)]: true });
});
