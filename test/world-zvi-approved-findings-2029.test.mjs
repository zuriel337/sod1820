import test from "node:test";
import assert from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import { fetchZviApprovedFindingsPage, fetchZviReviewedFindingsPage, fetchZviNumberFindingsPage, fetchZviSourceFindingsPage, ZVI_SOURCE_CONTRIBUTOR_ID } from "../src/lib/research/worldZviApprovedFindings2029.js";
import { researchObjectToUniversalFinding } from "../src/lib/research/researchObjectFinding.js";

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
        if (filter.startsWith("source_ref.eq.")) {
          const match = /^source_ref\.eq\.(channel_updates:[0-9a-f-]+),source_ref\.like\.\1#%$/i.exec(filter);
          assert.ok(match);
          if (serverFilters) filtered = filtered.filter((r) => r.source_ref === match[1] || r.source_ref?.startsWith(`${match[1]}#`));
          return q;
        }
        if (filter.startsWith("meta->ext->presentation->>statement_role.in.")) {
          if (serverFilters) filtered = filtered.filter((r) => (
            ["research_statement", "research_analysis", "extraction_observation"].includes(r.meta?.ext?.presentation?.statement_role)
            || (r.status === "canonical" && r.promoted_node_id != null && r.engine_verified === true && r.engine_detail?.verification_state === "match")
          ));
          return q;
        }
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
      then(resolve, reject) { return Promise.resolve({ data: filtered, error: table === "channel_updates" ? sourceError : error }).then(resolve, reject); },
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
  assert.ok(calls.some((c) => c[0] === "or" && c[1].includes("research_statement,research_analysis,extraction_observation")
    && c[1].includes("promoted_node_id.not.is.null") && c[1].includes("engine_detail->>verification_state.eq.match")));
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
  assert.equal(result.omittedForReview, true);
  assert.equal(result.omittedUnavailable, false);
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
  assert.equal(calls.filter((c) => c[0] === "or" && c[1].startsWith("created_at.lt.")).length, 2);
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
  assert.equal(orGeula.omittedUnavailable, true);
  assert.equal(orGeula.omittedForReview, false);
  const openWeb = await fetchZviApprovedFindingsPage({ client: client([row(2, { source: "openweb_legacy" })], []) });
  assert.deepEqual(openWeb.rows, []);
  assert.equal(openWeb.omittedForReview, true);
  assert.equal(openWeb.omittedUnavailable, false);
});

test("non-research material and references to the owner are suppressed even with Hebrew marks", async () => {
  const rows = [row(1), row(2, { meta: { ext: { presentation: { statement_role: "message" } } } }),
    row(3, { statement: "לצוריאל שלום" }), row(4, { statement: "לצוּריאל שלום" }), row(5, { contributor: "צוריאל" })];
  const result = await fetchZviApprovedFindingsPage({ client: client(rows, [], { serverFilters: false }) });
  assert.deepEqual(result.rows.map((r) => r.id), [uuid(1)]);
});

test("research roles and exact verified canonical material appear without inventing engine verification", async () => {
  const roles = ["research_analysis", "extraction_observation", "source_material"];
  const rows = [
    ...roles.map((role, index) => row(index + 1, { kind: ["hypothesis", "observation", "question"][index],
      meta: { ext: { presentation: { statement_role: role } } } })),
    row(4, { kind: "fact", status: "canonical", meta: {}, promoted_node_id: "node-4",
      engine_verified: true, engine_detail: { verification_state: "match" } }),
    row(5, { status: "canonical", meta: {}, promoted_node_id: "node-5",
      engine_verified: true, engine_detail: { verification_state: "mismatch" } }),
    row(6, { status: "canonical", meta: {}, promoted_node_id: "node-6",
      engine_verified: true, engine_detail: {} }),
    row(7, { status: "approved", meta: {}, promoted_node_id: "node-7",
      engine_verified: true, engine_detail: { verification_state: "match" } }),
    row(8, { status: "canonical", meta: {}, engine_verified: true,
      engine_detail: { verification_state: "match" } }),
    row(9, { status: "canonical", meta: {}, promoted_node_id: "node-9", engine_verified: false,
      engine_detail: { verification_state: "match" } }),
    row(10, { status: "canonical", meta: { ext: { presentation: { statement_role: "source_material" } } },
      promoted_node_id: "node-10", engine_verified: true, engine_detail: { verification_state: "match" } }),
  ];
  // Even if a faulty response ignores server filters, the display checks again.
  const result = await fetchZviApprovedFindingsPage({ client: client(rows, [], { serverFilters: false }) });
  const byId = Object.fromEntries(result.rows.map((r) => [r.id, r]));
  assert.deepEqual(result.rows.map((r) => r.id).sort(), [1,2,4,10].map(uuid));
  assert.equal(byId[uuid(1)].kindLabel, "השערה");
  assert.equal(byId[uuid(2)].roleLabel, "חילוץ מחקרי · לבדיקה מול המקור");
  assert.equal(byId[uuid(10)].roleLabel, "חומר מקור · לבדיקה");
  assert.equal(byId[uuid(3)], undefined);
  assert.equal(byId[uuid(4)].status, "canonical");
  assert.equal(byId[uuid(4)].kindLabel, "טענת מחקר");
  assert.equal(byId[uuid(4)].createdAt, "2026-10-28T12:00:00Z");
  assert.ok(!("engineVerified" in byId[uuid(4)]));
});

test("long excerpts signal truncation without breaking Unicode characters", async () => {
  const result = await fetchZviApprovedFindingsPage({
    client: client([row(1, { statement: "א".repeat(239) + "💡" + "ב" })], []),
  });
  assert.equal(result.rows[0].summaryTruncated, true);
  assert.equal(Array.from(result.rows[0].title).length, 240);
  assert.ok(result.rows[0].title.endsWith("💡"));
});

test("OCR text and rows marked as OCR must be identified as needing source review", async () => {
  const rows = [row(1, { statement: "תיאור מהמקור: oCr טקסט מסריקה" }), row(2, { meta: { ext: { presentation: { statement_role: "research_statement", ocr_used: true }, wa_channel_intake: { ocr_used: false } } } }), row(3)];
  const result = await fetchZviApprovedFindingsPage({ client: client(rows, []) });
  assert.deepEqual(Object.fromEntries(result.rows.map((r) => [r.id, r.ocrNeedsReview])), { [uuid(3)]: false, [uuid(2)]: true, [uuid(1)]: true });
});

function reviewedEntry(record) {
  const content = JSON.stringify([record.id, record.kind, record.statement, record.contributor, record.source_ref]);
  return { id: record.id, fingerprint: createHash("sha256").update(content, "utf8").digest("hex") };
}

test("number lookup uses structured exact value; missing values do not become zero", async () => {
  const calls = [];
  const candidates = [
    row(1, { value: 0 }), row(2, { value: null }), row(3, { value: "" }),
    row(4, { value: false }), row(5, { value: 1 }), row(6, { value: 0, privacy_scope: "private" }),
    row(7, { value: 0, meta: { ext: { personal_scope: { scope: "person_only" }, presentation: { statement_role: "research_statement" } } } }),
    row(8, { value: 0, source_contributor_id: uuid(88) }),
  ];
  const result = await fetchZviNumberFindingsPage({ client: client(candidates, calls, { serverFilters: false }), value: 0 });
  assert.deepEqual(result.rows.map((r) => r.id), [uuid(1)]);
  assert.equal(result.rows[0].claimedNumber, 0);
  assert.equal(result.rows[0].verificationState, null);
  assert.equal(result.rows[0].sourceRef, `channel_updates:${sourceId}`);
  assert.equal(result.rows[0].findingRef, researchObjectToUniversalFinding(candidates[0]).id);
  assert.ok(calls.some((c) => c[0] === "eq" && c[1] === "value" && c[2] === 0));
  assert.equal(result.omittedForReview, true);
  for (const bad of [null, "", "0", NaN, 1.5]) {
    await assert.rejects(fetchZviNumberFindingsPage({ client: client([], []), value: bad }), /invalid_zvi_number_findings_page/);
  }
});

test("number lookup follows stable pages beyond 80 and never fabricates totals", async () => {
  const candidates = Array.from({ length: 107 }, (_, i) => row(i + 1, { value: 73 }));
  const calls = []; const c = client(candidates, calls); const seen = []; let cursor = null;
  do {
    const result = await fetchZviNumberFindingsPage({ client: c, value: 73, cursor });
    seen.push(...result.rows.map((r) => r.id));
    assert.ok(!("total" in result));
    cursor = result.nextCursor;
  } while (cursor);
  assert.equal(seen.length, 107);
  assert.equal(new Set(seen).size, 107);
  assert.equal(calls.filter((c) => c[0] === "limit").length, 5);
});

test("number lookup only admits reviewed unsorted-role rows when exact fingerprint and source still match", async () => {
  const allowed = row(1, { value: 73, kind: "observation", meta: {} });
  const changed = row(2, { value: 73, kind: "observation", meta: {} });
  const old = { ...changed, statement: "מקור מוקדם אחר" };
  const unknown = row(3, { value: 73, kind: "observation", meta: {} });
  const manifest = [reviewedEntry(allowed), reviewedEntry(old)];
  const result = await fetchZviNumberFindingsPage({ client: client([allowed, changed, unknown], []), value: 73, manifest, subtle: webcrypto.subtle });
  assert.deepEqual(result.rows.map((r) => r.id), [uuid(1)]);
  assert.equal(result.omittedForReview, true);
  assert.equal(result.omittedUnavailable, false);
  const inactive = await fetchZviNumberFindingsPage({ client: client([allowed], [], { sourceRows: [] }), value: 73, manifest, subtle: webcrypto.subtle });
  assert.deepEqual(inactive.rows, []);
  assert.equal(inactive.omittedUnavailable, true);
  await assert.rejects(fetchZviNumberFindingsPage({ client: client([allowed], []), value: 73, manifest, subtle: null }), /review_digest_unavailable/);
});

test("number lookup preserves universal identity and exact source in ordinary and reviewed pages", async () => {
  const candidate = row(1, { value: 73 });
  const ordinary = await fetchZviApprovedFindingsPage({ client: client([candidate], []) });
  const number = await fetchZviNumberFindingsPage({ client: client([candidate], []), value: 73 });
  const reviewed = await fetchZviReviewedFindingsPage({ client: client([candidate], []), manifest: [reviewedEntry(candidate)], subtle: webcrypto.subtle });
  for (const result of [ordinary, number, reviewed]) {
    assert.equal(result.rows[0].findingRef, researchObjectToUniversalFinding(candidate).id);
    assert.equal(result.rows[0].sourceRef, `channel_updates:${sourceId}`);
    assert.equal(result.rows[0].href, `/world?finding=${candidate.id}`);
    assert.equal(result.rows[0].publicationState, "approved");
    assert.equal(result.rows[0].verificationState, null);
  }
});

test("source lookup accepts only the exact source or its hash occurrence, never prefix collisions", async () => {
  const ref = `channel_updates:${sourceId}`;
  const rows = [
    row(1, { source_ref: ref }), row(2, { source_ref: `${ref}#precise` }),
    row(3, { source_ref: `${ref}-collision` }), row(4, { source_ref: `${ref}:other` }),
    row(5, { source_ref: ref, privacy_scope: "private" }),
    row(6, { source_ref: ref, meta: { ext: { personal_scope: { scope: "person_only" }, presentation: { statement_role: "research_statement" } } } }),
    row(7, { source_ref: ref, status: "candidate" }), row(8, { source_ref: ref, contributor: "צוריאל" }),
  ];
  const calls = [];
  // Guard against a faulty server ignoring the exact-source and privacy filters.
  const result = await fetchZviSourceFindingsPage({ client: client(rows, calls, { serverFilters: false }), sourceRef: ref });
  assert.deepEqual(result.rows.map((r) => r.id).sort(), [uuid(1), uuid(2)]);
  assert.ok(result.rows.every((r) => r.sourceRef === ref && !("claimedNumber" in r)));
  assert.equal(result.omittedForReview, true);
  assert.ok(calls.some((c) => c[0] === "or" && c[1] === `source_ref.eq.${ref},source_ref.like.${ref}#%`));
  assert.ok(calls.some((c) => c[0] === "eq" && c[1] === "source_contributor_id" && c[2] === ZVI_SOURCE_CONTRIBUTOR_ID));
});

test("source lookup follows stable keyset pages beyond 100 and never invents a total", async () => {
  const ref = `channel_updates:${sourceId}`;
  const rows = Array.from({ length: 107 }, (_, i) => row(i + 1));
  const calls = []; const c = client(rows, calls); const seen = []; let cursor = null;
  do {
    const result = await fetchZviSourceFindingsPage({ client: c, sourceRef: ref, cursor });
    seen.push(...result.rows.map((r) => r.id));
    assert.ok(!("total" in result));
    cursor = result.nextCursor;
  } while (cursor);
  assert.equal(seen.length, 107);
  assert.equal(new Set(seen).size, 107);
  assert.equal(calls.filter((c) => c[0] === "limit").length, 5);
  assert.equal(calls.filter((c) => c[0] === "or" && c[1].startsWith("created_at.lt.")).length, 4);
});

test("source lookup requires the exact reviewed fingerprint and fails closed for unavailable sources", async () => {
  const ref = `channel_updates:${sourceId}`;
  const allowed = row(1, { meta: {}, kind: "observation" });
  const changed = row(2, { meta: {}, kind: "observation" });
  const old = { ...changed, statement: "נוסח מוקדם" };
  const manifest = [reviewedEntry(allowed), reviewedEntry(old)];
  const result = await fetchZviSourceFindingsPage({ client: client([allowed, changed], []), sourceRef: ref, manifest, subtle: webcrypto.subtle });
  assert.deepEqual(result.rows.map((r) => r.id), [uuid(1)]);
  assert.equal(result.omittedForReview, true);
  assert.equal(result.rows[0].findingRef, researchObjectToUniversalFinding(allowed).id);
  assert.equal(result.rows[0].verificationState, null);
  const inactive = await fetchZviSourceFindingsPage({ client: client([allowed], [], { sourceRows: [] }), sourceRef: ref, manifest, subtle: webcrypto.subtle });
  assert.equal(inactive.omittedUnavailable, true);
  assert.deepEqual(inactive.rows, []);
  await assert.rejects(fetchZviSourceFindingsPage({ client: client([allowed], [], { sourceError: new Error("source offline") }), sourceRef: ref, manifest, subtle: webcrypto.subtle }), /source offline/);
  await assert.rejects(fetchZviSourceFindingsPage({ client: client([allowed], []), sourceRef: ref, manifest, subtle: null }), /review_digest_unavailable/);
});

test("source lookup refuses malformed, anchored or injected selectors and reports unclassified pages honestly", async () => {
  const ref = `channel_updates:${sourceId}`; const c = client([], []);
  for (const sourceRef of [null, "", sourceId, `${ref}#anchor`, `${ref},status.eq.private`, "channel_updates:invalid"]) {
    await assert.rejects(fetchZviSourceFindingsPage({ client: c, sourceRef }), /invalid_zvi_source_findings_page/);
  }
  const unknown = Array.from({ length: 8 }, (_, i) => row(i + 1, { meta: {}, kind: "observation" }));
  const page = await fetchZviSourceFindingsPage({ client: client(unknown, []), sourceRef: ref, pageSize: 5, manifest: [] });
  assert.deepEqual(page.rows, []);
  assert.equal(page.hasMore, true);
  assert.equal(page.omittedForReview, true);
  assert.equal(page.omittedUnavailable, false);
});

test("individually reviewed items require an unchanged exact fingerprint and a live public source", async () => {
  const reviewed = row(1, { meta: {}, kind: "observation" });
  const changed = row(2, { meta: {}, kind: "observation" });
  const old = row(2, { meta: {}, kind: "observation", statement: "נוסח קודם" });
  const missing = row(3, { meta: {}, kind: "observation" });
  const calls = [];
  const result = await fetchZviReviewedFindingsPage({
    client: client([changed, reviewed], calls),
    manifest: [reviewedEntry(reviewed), reviewedEntry(old), reviewedEntry(missing)],
    subtle: webcrypto.subtle,
  });
  assert.deepEqual(result.rows.map((r) => r.id), [reviewed.id]);
  assert.equal(result.rows[0].kindLabel, "תצפית");
  assert.equal(result.omittedUnavailable, true);
  assert.equal(result.omittedForReview, true);
  assert.ok(calls.some((c) => c[0] === "in" && c[1] === "id" && c[2].length === 3));
  assert.ok(calls.some((c) => c[0] === "eq" && c[1] === "status" && c[2] === "live"));
  const off = await fetchZviReviewedFindingsPage({
    client: client([reviewed], [], { sourceRows: [{ id: sourceId, status: "off", channel: "tzvi" }] }),
    manifest: [reviewedEntry(reviewed)], subtle: webcrypto.subtle,
  });
  assert.deepEqual(off.rows, []);
  assert.equal(off.omittedUnavailable, true);
  assert.equal(off.omittedForReview, false);
});

test("reviewed changes need another review while a missing record is unavailable", async () => {
  const old = row(1, { meta: {}, statement: "נוסח קודם" });
  const changed = row(1, { meta: {}, statement: "נוסח חדש" });
  const mismatch = await fetchZviReviewedFindingsPage({
    client: client([changed], []), manifest: [reviewedEntry(old)], subtle: webcrypto.subtle,
  });
  assert.deepEqual(mismatch.rows, []);
  assert.equal(mismatch.omittedForReview, true);
  assert.equal(mismatch.omittedUnavailable, false);
  const missing = await fetchZviReviewedFindingsPage({
    client: client([], []), manifest: [reviewedEntry(old)], subtle: webcrypto.subtle,
  });
  assert.deepEqual(missing.rows, []);
  assert.equal(missing.omittedForReview, false);
  assert.equal(missing.omittedUnavailable, true);
});

test("reviewed pagination is bounded to 20 IDs and retains manifest order", async () => {
  const rows = Array.from({ length: 43 }, (_, index) => row(index + 1, { meta: {}, kind: "observation" }));
  const manifest = rows.map(reviewedEntry);
  const calls = [], c = client([...rows].reverse(), calls);
  const first = await fetchZviReviewedFindingsPage({ client: c, manifest, subtle: webcrypto.subtle });
  const second = await fetchZviReviewedFindingsPage({ client: c, manifest, cursor: first.nextCursor, subtle: webcrypto.subtle });
  const third = await fetchZviReviewedFindingsPage({ client: c, manifest, cursor: second.nextCursor, subtle: webcrypto.subtle });
  assert.deepEqual([first.rows.length, second.rows.length, third.rows.length], [20, 20, 3]);
  assert.deepEqual([...first.rows, ...second.rows, ...third.rows].map((r) => r.id), rows.map((r) => r.id));
  assert.deepEqual([first.hasMore, second.hasMore, third.hasMore], [true, true, false]);
  assert.deepEqual(calls.filter((c) => c[0] === "in" && c[1] === "id" && c[2].includes(uuid(1))).map((c) => c[2].length), [20]);
});

test("reviewed entries still enforce privacy, author/source identity, content restrictions and World exclusions", async () => {
  const rows = [
    row(1, { meta: {}, kind: "observation" }),
    row(2, { meta: {}, privacy_scope: "private" }),
    row(3, { meta: { ext: { personal_scope: { scope: "person_only" } } } }),
    row(4, { meta: {}, status: "candidate" }),
    row(5, { meta: {}, contributor: "צוריאל" }),
    row(6, { meta: {}, statement: "איש קשר 050-1234567" }),
    row(7, { meta: {}, statement: "מייל example@example.com" }),
    row(8, { meta: {}, source_contributor_id: uuid(99) }),
    row(9, { meta: {}, source: "openweb_legacy" }),
  ];
  const result = await fetchZviReviewedFindingsPage({
    client: client(rows, [], { serverFilters: false }), manifest: rows.map(reviewedEntry), subtle: webcrypto.subtle,
  });
  assert.deepEqual(result.rows.map((r) => r.id), [uuid(1)]);
  assert.equal(result.omittedUnavailable, false);
  assert.equal(result.omittedForReview, true);
});

test("missing digest support and unavailable source fail closed; regular list omits contact details", async () => {
  const item = row(1, { meta: {}, kind: "observation" });
  const manifest = [reviewedEntry(item)];
  await assert.rejects(fetchZviReviewedFindingsPage({ client: client([item], []), manifest, subtle: null }), /review_digest_unavailable/);
  await assert.rejects(fetchZviReviewedFindingsPage({ client: client([item], [], { sourceError: new Error("offline") }),
    manifest, subtle: webcrypto.subtle }), /offline/);
  const rows = [row(1), row(2, { statement: "טלפון 050-1234567" }), row(3, { contributor: "example@example.com" }),
    row(4, { statement: "מספר +1 (212) 555-1234" }), row(5, { statement: "טלפון +972 50 123 4567" })];
  const result = await fetchZviApprovedFindingsPage({ client: client(rows, [], { serverFilters: false }) });
  assert.deepEqual(result.rows.map((r) => r.id), [uuid(1)]);
});
