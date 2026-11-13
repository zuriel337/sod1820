// Content visible before entry (Design Contract V2 §8.3, ZURIEL 12.11.2026): opening content must not change a finding's status
// and must not publish personal information. Pure tests with injected clients: no network, no database, synthetic data only.
// Each claim has its own test:
//   1. status is kept and never promoted (stream, finding pages, share/OG, contributor model; readers never write)
//   2. private / person_only / public_candidate (dossier) rows stay hidden, also when the upstream ignores every filter
//   3. contact details, owner mention, excluded material, a non-live source and a missing research role keep a candidate out
//   4. no contributor id and no contact detail in what the feed and the finding pages output
//   5. the share card endpoint answers the neutral card for a private / person_only / excluded row, even from a faulty upstream
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildWorldDiscoveryStream, readUnverifiedPublicResearch } from "../src/lib/research/worldDiscoveryStream.js";
import { admitPublicCandidateRows, fetchWorldPublicFindingById, fetchWorldPublicFindingsPage, clearWorldPublicFindingCache } from "../src/lib/research/worldPublicFindingReader.js";
import ogHandler from "../api/og.js";

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const SOURCE = uuid(900);          // a LIVE public channel update
const HIDDEN_SOURCE = uuid(901);   // exists, but is not live
const CONTRIBUTOR_ID = uuid(777);  // internal provenance id of the source owner; must never be output
const ROLE = { ext: { presentation: { statement_role: "research_statement" } } };
const candidate = (n, changes = {}) => ({ id: uuid(n), created_at: `2026-11-${String(10 - (n % 9)).padStart(2, "0")}T10:00:00Z`,
  kind: "observation", statement: `ממצא מועמד ${n}`, evidence: null, value: null, source: "whatsapp", source_ref: `channel_updates:${SOURCE}#${n}`,
  contributor: "משתתף לא מוכר", status: "candidate", privacy_scope: "public", meta: ROLE, ...changes });

// A PostgREST-like client over fixed tables. `faulty` = the upstream ignores every filter (an RLS/view fault): our own checks must hold.
function client({ research = [], sources = [{ id: SOURCE, status: "live", channel: "public", contributor_id: CONTRIBUTOR_ID },
  { id: HIDDEN_SOURCE, status: "draft", channel: "public", contributor_id: CONTRIBUTOR_ID }], faulty = false } = {}) {
  const calls = [];
  return { calls, from(table) {
    const call = { table, filters: [], writes: [] }; calls.push(call);
    const builder = {
      select(fields) { call.fields = fields; return builder; },
      eq(key, value) { call.filters.push(["eq", key, value]); return builder; },
      in(key, values) { call.filters.push(["in", key, values]); return builder; },
      or(value) { call.filters.push(["or", value]); return builder; },
      order() { return builder; }, limit(value) { call.limit = value; return builder; },
      maybeSingle() { return builder.then((result) => ({ data: result.data[0] ?? null, error: null })); },
      then(resolve, reject) {
        let rows = [...(table === "research_objects" ? research : table === "channel_updates" ? sources : [])];
        if (!faulty) for (const [operation, key, value] of call.filters) {
          if (operation === "eq") rows = rows.filter((row) => row[key] === value);
          if (operation === "in") rows = rows.filter((row) => value.includes(row[key]));
          if (operation === "or" && /person_only/.test(key)) rows = rows.filter((row) => row.meta?.ext?.personal_scope?.scope !== "person_only");
        }
        return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
      },
    };
    return builder;   // no insert/update/upsert/delete/rpc exist: any write attempt throws and fails the test
  } };
}

test("candidate listing: a clean public candidate is listed with its stored status, labelled, and nothing is written", async () => {
  const c = client({ research: [candidate(1)] });
  const rows = await readUnverifiedPublicResearch(c, { requested: 18 });
  assert.deepEqual(rows.map((row) => row.id), [uuid(1)]);
  const stream = buildWorldDiscoveryStream({ research: rows }, { limit: 18 });
  const item = stream.items.find((entry) => entry.id === `research:${uuid(1)}`);
  assert.equal(item.status, "candidate", "status is kept, never promoted");
  assert.equal(item.statusLabel, "טרם אומת");
  assert.equal(item.humanGateVerified, false);
  assert.deepEqual(c.calls.filter((call) => call.writes.length), [], "read-only");
  const read = c.calls.find((call) => call.table === "research_objects");
  assert.ok(read.filters.some(([op, key, value]) => op === "eq" && key === "status" && value === "candidate"));
  assert.ok(read.filters.some(([op, key, value]) => op === "eq" && key === "privacy_scope" && value === "public"));
  assert.ok(read.filters.some(([op, value]) => op === "or" && /person_only/.test(value)));
});

for (const faulty of [false, true]) {
  test(`private, person_only and dossier (public_candidate) rows stay hidden${faulty ? " even when the upstream ignores every filter" : ""}`, async () => {
    const rows = [candidate(1),
      candidate(2, { privacy_scope: "private" }),
      candidate(3, { privacy_scope: "public_candidate" }),
      candidate(4, { meta: { ...ROLE, ext: { ...ROLE.ext, personal_scope: { scope: "person_only" } } } }),
      candidate(5, { status: "rejected" })];
    const listed = await readUnverifiedPublicResearch(client({ research: rows, faulty }), { requested: 18 });
    assert.deepEqual(listed.map((row) => row.id), [uuid(1)]);
    // The stream builder is a second line: handed the raw rows it still refuses them.
    const built = buildWorldDiscoveryStream({ research: rows }, { limit: 18 });
    assert.deepEqual(built.items.map((entry) => entry.id), [`research:${uuid(1)}`]);
  });
}

test("a candidate with contact details, an owner mention, excluded material, a missing research role or a non-live source stays out", async () => {
  const rows = [
    candidate(1),
    candidate(2, { statement: "צרו קשר hello@example.test" }),
    candidate(3, { statement: "התקשרו 050-1234567 עכשיו" }),
    candidate(4, { statement: "+1 202 555 0143 call" }),
    candidate(5, { statement: "צוריאל אמר" }),
    candidate(6, { contributor: "אור הגאולה" }),
    candidate(7, { source: "openweb_legacy" }),
    candidate(8, { meta: { ext: { presentation: { statement_role: "source_material" } } } }),
    candidate(9, { meta: {} }),
    candidate(10, { source_ref: `channel_updates:${HIDDEN_SOURCE}#10` }),
    candidate(11, { source_ref: `channel_updates:${uuid(999)}#11` }),
    candidate(12, { source_ref: null }),
    candidate(13, { evidence: "פרטים: person@example.test" }),
    candidate(14, { evidence: "מקור: הודעת קבוצה" }),
  ];
  for (const faulty of [false, true]) {
    const listed = await readUnverifiedPublicResearch(client({ research: rows, faulty }), { requested: 40 });
    assert.deepEqual(listed.map((row) => row.id).sort(), [uuid(1), uuid(14)].sort(), `faulty=${faulty}`);
  }
  // The admission itself, without the listing wrapper.
  assert.deepEqual((await admitPublicCandidateRows(client({ research: rows }), rows)).map((row) => row.id).sort(), [uuid(1), uuid(14)].sort());
});

test("an excluded channel (or-geula) source keeps a candidate out of the feed", async () => {
  const sources = [{ id: SOURCE, status: "live", channel: "or-geula", contributor_id: CONTRIBUTOR_ID }];
  assert.deepEqual(await readUnverifiedPublicResearch(client({ research: [candidate(1)], sources }), { requested: 18 }), []);
});

test("a failing source read lists no candidate and never throws into the feed", async () => {
  const broken = { from(table) {
    const builder = { select: () => builder, eq: () => builder, in: () => builder, or: () => builder, order: () => builder, limit: () => builder,
      then: (resolve, reject) => Promise.resolve(table === "research_objects" ? { data: [candidate(1)], error: null } : { data: null, error: new Error("down") }).then(resolve, reject) };
    return builder;
  } };
  assert.deepEqual(await readUnverifiedPublicResearch(broken, { requested: 18 }), []);
  assert.deepEqual(await readUnverifiedPublicResearch({ from: () => { throw new Error("offline"); } }, { requested: 18 }), []);
});

test("no contributor id and no contact detail in what the feed outputs", async () => {
  const listed = await readUnverifiedPublicResearch(client({ research: [candidate(1, { contributor: "חוקר" }), candidate(2)] }), { requested: 18 });
  const stream = buildWorldDiscoveryStream({ research: listed }, { limit: 18 });
  const text = JSON.stringify(stream);
  assert.ok(!text.includes(CONTRIBUTOR_ID), "the internal source-owner id is never output");
  assert.doesNotMatch(text, /source_contributor_id|contributor_id/);
  assert.doesNotMatch(text, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  // An unknown participant name is never printed as a creator: the generic public label is used.
  assert.ok(stream.items.every((entry) => entry.creator === "מקור ציבורי"));
  assert.ok(!text.includes("חוקר") || !stream.items.some((entry) => entry.creator === "חוקר"));
});

test("finding pages: no contributor id and no contact detail in the output of a candidate row", async () => {
  const UUID_FINDING = (n) => ({ ...candidate(n), source_contributor_id: CONTRIBUTOR_ID, value: 1118 });
  const rows = [UUID_FINDING(1), UUID_FINDING(2), { ...UUID_FINDING(3), statement: "צרו קשר hello@example.test" }];
  const page = await fetchWorldPublicFindingsPage({ client: client({ research: rows }), value: 1118, pageSize: 10 });
  assert.deepEqual(page.rows.map((row) => row.id).sort(), [uuid(1), uuid(2)].sort());
  assert.ok(page.rows.every((row) => row.status === "candidate" && row.statusLabel === "טרם אומת"));
  const text = JSON.stringify(page.rows);
  assert.ok(!text.includes(CONTRIBUTOR_ID));
  assert.doesNotMatch(text, /hello@example\.test/);
});

test("exact finding by id: a clean public candidate opens labelled; contact details, private, person_only, dossier and missing role do not", async () => {
  const open = async (row, options = {}) => {
    clearWorldPublicFindingCache();
    return fetchWorldPublicFindingById(uuid(1), { publicClient: () => client({ research: [row], ...options }), cache: false });
  };
  const ok = await open(candidate(1, { value: 1118 }));
  assert.equal(ok?.status, "candidate", "the stored status is kept");
  assert.equal(ok?.statusLabel, "טרם אומת");
  for (const [name, changes] of [
    ["contact detail", { statement: "צרו קשר hello@example.test" }],
    ["phone", { statement: "התקשרו 050-1234567" }],
    ["owner mention", { statement: "צוריאל אמר" }],
    ["private", { privacy_scope: "private" }],
    ["dossier public_candidate", { privacy_scope: "public_candidate" }],
    ["person_only", { meta: { ...ROLE, ext: { ...ROLE.ext, personal_scope: { scope: "person_only" } } } }],
    ["no research role", { meta: {} }],
    ["rejected", { status: "rejected" }],
  ]) {
    // faulty: the upstream ignores every filter, so only the reader's own checks can hold
    assert.equal(await open(candidate(1, changes), { faulty: true }), null, name);
  }
  assert.equal(await open(candidate(1), { sources: [{ id: SOURCE, status: "draft", channel: "public" }], faulty: false }).catch(() => "unavailable"), "unavailable",
    "a non-live source does not open");
});

test("the feed read is wired to the admission and nothing else lists raw candidates", () => {
  const stream = readFileSync(new URL("../src/lib/research/worldDiscoveryStream.js", import.meta.url), "utf8");
  assert.match(stream, /readUnverifiedPublicResearch\(supabase, \{ requested \}\)/);
  assert.match(stream, /admitPublicCandidateRows\(client, result\.data\)/);
  // The only place a candidate query is built in the stream is the admitted reader.
  assert.equal((stream.match(/\.eq\("status", "candidate"\)/g) || []).length, 1);
});

// --- share card endpoint ---------------------------------------------------------------------------------------------
async function og(row, { channel = "public" } = {}) {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    const json = url.includes("/rest/v1/research_objects?") ? (row ? [row] : [])
      : url.includes("/rest/v1/channel_updates?") ? [{ id: SOURCE, channel, status: "live" }] : [];
    return { ok: true, status: 200, json: async () => json };
  };
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status() { return this; }, send(html) { this.html = html; return this; } };
  try { await ogHandler({ query: { path: "/world", finding: uuid(1) } }, res); } finally { globalThis.fetch = oldFetch; }
  return res.html;
}

test("share card: a clean public candidate gets the labelled noindex card; private, person_only and excluded rows get the neutral card", async () => {
  const base = { id: uuid(1), statement: "ממצא ציבורי לבדיקה", kind: "observation", source: "whatsapp", source_ref: `channel_updates:${SOURCE}`,
    // CR-X2 (13.11.2026): the card needs the research role of a candidate, like the finding pages
    contributor: "חוקר", status: "candidate", privacy_scope: "public", meta: ROLE };
  const ok = await og(base);
  assert.match(ok, /טרם אומת/);
  assert.match(ok, /noindex, nofollow/);
  const NEUTRAL = /הממצא המבוקש אינו זמין לציבור/;
  for (const [name, row, options] of [
    ["private", { ...base, privacy_scope: "private" }, {}],
    ["dossier public_candidate", { ...base, privacy_scope: "public_candidate" }, {}],
    ["person_only", { ...base, meta: { ext: { personal_scope: { scope: "person_only" } } } }, {}],
    ["excluded contributor", { ...base, contributor: "אור הגאולה" }, {}],
    ["excluded channel", base, { channel: "or-geula" }],
    ["rejected", { ...base, status: "rejected" }, {}],
    ["no research role (as on the finding pages)", { ...base, meta: {} }, {}],
    ["missing", null, {}],
  ]) {
    const html = await og(row, options);
    assert.match(html, NEUTRAL, name);
    assert.doesNotMatch(html, /ממצא ציבורי לבדיקה/, `${name}: the statement is not reflected`);
    assert.match(html, /noindex, nofollow/, name);
  }
});
