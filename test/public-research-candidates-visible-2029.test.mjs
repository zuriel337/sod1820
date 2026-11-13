// ZURIEL 12.11.2026 (M0-D): every privacy_scope='public' research finding is viewable in the
// public readers with its ORIGINAL status; a candidate is labelled "טרם אומת" and never promoted.
// Private, person_only and dossier-governed (public_candidate) rows stay hidden. Verified rows are
// never displaced by candidates. Pure unit tests: no network, no database.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  researchPublicStatusPresentation,
  isResearchPublicVisibleStatus,
  orderResearchByPublicStatusTier,
  RESEARCH_VERIFIED_PUBLIC_STATUSES,
  RESEARCH_PUBLIC_VISIBLE_STATUSES,
} from "../src/lib/research/researchObjectPresentation.js";
import { buildWorldDiscoveryStream, researchRowToWorldUpdate } from "../src/lib/research/worldDiscoveryStream.js";
import { worldPublicResearchDto, findWorldPublicResearchFinding } from "../src/lib/research/worldAllResearchProjection.js";
import { fetchWorldPublicFindingsPage } from "../src/lib/research/worldPublicFindingReader.js";
import { fetchZviApprovedFindingsPage, ZVI_SOURCE_CONTRIBUTOR_ID } from "../src/lib/research/worldZviApprovedFindings2029.js";
import { worldFindingPublicShare } from "../src/lib/research/worldFindingShare.js";
import { publicNumberSourceCards } from "../src/lib/research/numberSourceCards.js";
import ogHandler from "../api/og.js";

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const sourceId = id(900);

test("status label helper: candidate → טרם אומת, verified labels kept, unknown/private states are not public", () => {
  assert.deepEqual(RESEARCH_VERIFIED_PUBLIC_STATUSES, ["approved", "canonical"]);
  assert.deepEqual(RESEARCH_PUBLIC_VISIBLE_STATUSES, ["approved", "canonical", "candidate"]);
  assert.equal(researchPublicStatusPresentation("candidate").label, "טרם אומת");
  assert.equal(researchPublicStatusPresentation("candidate").verified, false);
  assert.equal(researchPublicStatusPresentation("approved").label, "מאושר");
  assert.equal(researchPublicStatusPresentation("canonical").label, "קנוני");
  assert.equal(researchPublicStatusPresentation(" Approved ").status, "approved");
  for (const status of ["rejected", "draft", "", null, undefined, "public_candidate"]) {
    assert.equal(researchPublicStatusPresentation(status), null);
    assert.equal(isResearchPublicVisibleStatus(status), false);
  }
  // The label never says "approved" for a candidate and never claims engine verification.
  assert.doesNotMatch(researchPublicStatusPresentation("candidate").label, /מאושר|קנוני/u);
});

test("tier order is a stable partition: verified keep their order, candidates follow in theirs", () => {
  const rows = [{ id: "c1", status: "candidate" }, { id: "a1", status: "approved" }, { id: "c2", status: "candidate" },
    { id: "k1", status: "canonical" }, { id: "t1", status: null }, { id: "a2", status: "approved" }];
  assert.deepEqual(orderResearchByPublicStatusTier(rows).map((row) => row.id), ["a1", "k1", "t1", "a2", "c1", "c2"]);
  assert.deepEqual(rows.map((row) => row.id), ["c1", "a1", "c2", "k1", "t1", "a2"], "input is not mutated");
});

const research = (n, changes = {}) => ({ id: id(n), created_at: `2026-11-${String(10 - (n % 9)).padStart(2, "0")}T10:00:00Z`,
  kind: "observation", statement: `ממצא ${n}`, value: null, source_ref: `channel_updates:${id(800 + n)}`,
  contributor: "חוקר", status: "approved", privacy_scope: "public", ...changes });

test("World stream: public candidate shown with label and original status; private, person_only and dossier rows hidden", () => {
  const candidate = researchRowToWorldUpdate(research(1, { status: "candidate" }));
  assert.equal(candidate.status, "candidate");
  assert.equal(candidate.statusLabel, "טרם אומת");
  assert.equal(candidate.humanGateVerified, false);
  assert.equal(researchRowToWorldUpdate(research(2, { status: "candidate", privacy_scope: "private" })), null);
  assert.equal(researchRowToWorldUpdate(research(3, { status: "candidate", privacy_scope: "public_candidate" })), null);
  assert.equal(researchRowToWorldUpdate(research(4, { status: "candidate",
    meta: { ext: { personal_scope: { scope: "person_only" } } } })), null);
  assert.equal(researchRowToWorldUpdate(research(5, { status: "rejected" })), null);
  assert.equal(researchRowToWorldUpdate(research(6)).statusLabel, "מאושר");
});

test("World stream: a flood of candidates never displaces the verified window and stays bounded", () => {
  const verified = Array.from({ length: 30 }, (_, i) => research(i + 1, { created_at: `2026-10-${String(1 + (i % 28)).padStart(2, "0")}T08:00:00Z` }));
  const flood = Array.from({ length: 60 }, (_, i) => research(100 + i, { status: "candidate", created_at: "2026-11-12T09:00:00Z" }));
  const without = buildWorldDiscoveryStream({ research: verified }, { limit: 18 });
  const withCandidates = buildWorldDiscoveryStream({ research: [...flood, ...verified] }, { limit: 18 });
  assert.deepEqual(withCandidates.items.slice(0, without.items.length).map((item) => item.id), without.items.map((item) => item.id));
  const tail = withCandidates.items.slice(without.items.length);
  assert.equal(tail.length, Math.ceil(18 / 3));
  assert.ok(tail.every((item) => item.statusLabel === "טרם אומת" && item.status === "candidate" && item.publicTier === 1));
  assert.equal(withCandidates.sourceCounts.unverifiedFindings, 60);
});

test("World stream: a candidate on a known source occurrence is counted separately, never as verified research", () => {
  const post = { id: 7, slug: "p", title: "פוסט", source: "wordpress", home_hidden: false, created_at: "2026-11-01T00:00:00Z" };
  const stream = buildWorldDiscoveryStream({ posts: [post], research: [
    research(1, { source_ref: "posts:7" }), research(2, { status: "candidate", source_ref: "posts:7" })] });
  const source = stream.items.find((item) => item.id === "post:7");
  assert.equal(source.researchCount, 1);
  assert.equal(source.unverifiedResearchCount, 1);
});

test("World DTO + exact finding: public candidate after verified, labelled; private and dossier rows stay out", () => {
  const dto = worldPublicResearchDto({ rows: [
    { id: "research:c", sourceId: "c", family: "research_object", status: "candidate", access: "public" },
    { id: "research:a", sourceId: "a", family: "research_object", status: "approved", access: "public" },
    { id: "research:p", sourceId: "p", family: "research_object", status: "candidate", access: "private" },
    { id: "research:d", sourceId: "d", family: "research_object", status: "candidate", access: "public_candidate" },
  ] });
  assert.deepEqual(dto.rows.map((row) => row.id), ["research:a", "research:c"]);
  assert.equal(dto.rows[1].statusLabel, "טרם אומת");
  assert.equal(dto.rows[1].status, "candidate");
  assert.equal(findWorldPublicResearchFinding(dto, "p"), null);
  assert.equal(findWorldPublicResearchFinding(dto, "d"), null);
  assert.equal(findWorldPublicResearchFinding(dto, "c").statusLabel, "טרם אומת");
});

const finding = (n, changes = {}) => ({ id: id(n), created_at: `2026-10-${String(30 - n).padStart(2, "0")}T12:00:00Z`,
  statement: `מחקר ${n}`, kind: "observation", source_ref: `channel_updates:${sourceId}#${n}`,
  source_contributor_id: ZVI_SOURCE_CONTRIBUTOR_ID, contributor: "חוקר לדוגמה",
  privacy_scope: "public", status: "approved", value: 1118,
  meta: { ext: { presentation: { statement_role: "research_statement" } } }, ...changes });

function backend(rows, { faulty = false } = {}) {
  const calls = [];
  const sources = [{ id: sourceId, status: "live", channel: "public", contributor_id: ZVI_SOURCE_CONTRIBUTOR_ID }];
  const client = { from(table) {
    const filters = []; let cap = Infinity; const call = { table, filters }; calls.push(call);
    const request = {
      select(fields) { call.fields = fields; return this; },
      eq(key, value) { filters.push(["eq", key, value]); return this; },
      in(key, values) { filters.push(["in", key, values]); return this; },
      ilike(key, value) { filters.push(["ilike", key, value]); return this; },
      or(value) { filters.push(["or", value]); return this; },
      not(key, operator, value) { filters.push(["not", key, operator, value]); return this; },
      order() { return this; }, limit(value) { cap = value; call.limit = value; return this; },
      then(resolve, reject) {
        let result = [...({ world_contributor_research_v1: rows.filter((row) => row.status !== "candidate"),
          research_objects: rows, channel_updates: sources }[table] || [])];
        if (!faulty || table === "channel_updates") for (const [operation, key, value] of filters) {
          if (operation === "eq") result = result.filter((row) => row[key] === value);
          if (operation === "in") result = result.filter((row) => value.includes(row[key]));
          if (operation === "or" && key.startsWith("created_at.lt.")) {
            const [, at, cursorId] = /^created_at\.lt\."([^"]+)",and\(created_at\.eq\."[^"]+",id\.lt\.([0-9a-f-]+)\)$/.exec(key);
            result = result.filter((row) => row.created_at < at || (row.created_at === at && row.id < cursorId));
          }
        }
        result.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
        return Promise.resolve({ data: result.slice(0, cap), error: null }).then(resolve, reject);
      },
    };
    return request;
  } };
  return { client, calls };
}

test("finding pages: verified tier first, then public candidates; status unchanged; tiers paginate without loss", async () => {
  const rows = [finding(1), finding(2, { status: "candidate" }), finding(3, { status: "canonical" }),
    finding(4, { status: "candidate" }), finding(5, { status: "candidate" })];
  const { client, calls } = backend(rows);
  const first = await fetchWorldPublicFindingsPage({ client, value: 1118, pageSize: 3 });
  assert.deepEqual(first.rows.map((row) => row.id), [id(1), id(3), id(2)]);
  assert.deepEqual(first.rows.map((row) => row.publicationState), ["approved", "canonical", "candidate"]);
  assert.deepEqual(first.rows.map((row) => row.statusLabel), ["מאושר", "קנוני", "טרם אומת"]);
  assert.equal(first.hasMore, true);
  assert.equal(first.nextCursor.phase, "candidate");
  const second = await fetchWorldPublicFindingsPage({ client, value: 1118, pageSize: 3, cursor: first.nextCursor });
  assert.deepEqual(second.rows.map((row) => row.id), [id(4), id(5)]);
  assert.equal(second.hasMore, false);
  // The candidate tier reads the public table under anon RLS with an explicit public scope.
  const candidateCall = calls.find((call) => call.table === "research_objects");
  assert.ok(candidateCall.filters.some(([op, key, value]) => op === "eq" && key === "privacy_scope" && value === "public"));
  assert.ok(candidateCall.filters.some(([op, key, value]) => op === "eq" && key === "status" && value === "candidate"));
  assert.ok(candidateCall.filters.some(([op, value]) => op === "or" && /personal_scope->>scope\.neq\.person_only/.test(value)));
  assert.doesNotMatch(candidateCall.fields, /source_contributor_id/);
  // Zvi's exact source home is still derived from the admitted live source, never output as an id.
  assert.ok(second.rows.every((row) => !JSON.stringify(row).includes(ZVI_SOURCE_CONTRIBUTOR_ID)));
});

test("finding pages: a faulty upstream cannot leak private, person_only or dossier candidates", async () => {
  const rows = [finding(1), finding(2, { status: "candidate", privacy_scope: "private" }),
    finding(3, { status: "candidate", privacy_scope: "public_candidate" }),
    finding(4, { status: "candidate", meta: { ext: { personal_scope: { scope: "person_only" },
      presentation: { statement_role: "research_statement" } } } }),
    finding(5, { status: "candidate", statement: "צרו קשר hello@example.test" }),
    finding(6, { status: "candidate" })];
  const page = await fetchWorldPublicFindingsPage({ client: backend(rows, { faulty: true }).client, value: 1118 });
  assert.deepEqual(page.rows.map((row) => row.id), [id(1), id(6)]);
  assert.equal(page.omittedForReview, true);
});

test("Zvi verified list stays fail-closed to candidates (deliberate Human-Gate list)", async () => {
  const rows = [finding(1), finding(2, { status: "candidate" })];
  const { client } = backend(rows, { faulty: true });
  const page = await fetchZviApprovedFindingsPage({ client });
  assert.deepEqual(page.rows.map((row) => row.id), [id(1)]);
});

test("share card and OG card carry the label; candidates stay noindex", async () => {
  const href = (fid) => `/world?finding=${fid}#finding-${fid}`;
  const base = { family: "research_object", access: "public", sourceId: id(1), canonicalFindingHref: href(id(1)),
    statement: "ממצא ציבורי", typeLabel: "תצפית", sourceLabel: "הודעות מקור" };
  const approved = worldFindingPublicShare({ ...base, status: "approved" });
  assert.equal(approved.title, "ממצא ציבורי");
  const candidate = worldFindingPublicShare({ ...base, status: "candidate" });
  assert.equal(candidate.title, "ממצא ציבורי · טרם אומת");
  assert.match(new URL(candidate.image).searchParams.get("sub"), /^טרם אומת · /);
  assert.match(candidate.description, /^טרם אומת/);
  assert.equal(worldFindingPublicShare({ ...base, status: "candidate", access: "private" }), null);

  const row = { id: id(1), statement: "ממצא", kind: "observation", source: "posts", source_ref: "posts:5123",
    contributor: "חוקר", status: "candidate", privacy_scope: "public",
    // CR-X2 (13.11.2026): the card follows the admission of the finding pages, which needs the research role of a candidate.
    meta: { ext: { presentation: { statement_role: "research_statement" } } } };
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    const json = url.includes("/rest/v1/research_objects?") ? [row] : [];
    return { ok: true, status: 200, json: async () => json };
  };
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status() { return this; }, send(html) { this.html = html; return this; } };
  try { await ogHandler({ query: { path: "/world", finding: id(1) } }, res); } finally { globalThis.fetch = oldFetch; }
  assert.match(res.html, /טרם אומת/);
  assert.match(res.html, /noindex, nofollow/);
  assert.match(res.html, new RegExp(`og:url" content="https://sod1820.co.il/world\\?finding=${id(1)}`));
});

test("number source cards keep a candidate's status and label", () => {
  const cards = publicNumberSourceCards([
    { id: id(1), title: "ממצא", sourceRef: `channel_updates:${sourceId}`, publicationState: "candidate", findingHref: `/world?finding=${id(1)}` },
    { id: id(2), title: "ממצא פרטי", sourceRef: `channel_updates:${sourceId}`, publicationState: "candidate", privacy_scope: "private", findingHref: `/world?finding=${id(2)}` },
  ]);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].findings[0].publicationState, "candidate");
  assert.equal(cards[0].findings[0].statusLabel, "טרם אומת");
});

test("aligned readers never write and never assign a governance status", () => {
  for (const file of ["src/lib/research/worldDiscoveryStream.js", "src/lib/research/worldPublicFindingReader.js",
    "src/lib/research/worldAllResearchProjection.js", "src/lib/research/worldZviApprovedFindings2029.js",
    "src/lib/research/researchObjectPresentation.js", "src/lib/research/worldFindingShare.js", "src/lib/research/numberSourceCards.js"]) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    // A Supabase write (Map.delete on a local cache is not one).
    assert.doesNotMatch(source, /\.(insert|upsert)\(|\.update\(\s*\{|\.delete\(\s*\)|\.rpc\(/, `${file} stays read-only`);
    // The presentation helper's own label table is the only place these words are keys.
    if (!file.endsWith("researchObjectPresentation.js")) {
      assert.doesNotMatch(source, /status\s*:\s*["'](approved|canonical)["']/, `${file} never assigns a verified status`);
    }
  }
});
