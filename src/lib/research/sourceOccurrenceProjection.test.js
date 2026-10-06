import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { researchObjectToUniversalFinding } from "./researchObjectFinding.js";
import { buildSourceBundles, humanSourceCorpusLabel } from "./sourceBundleProjection.js";
import { buildSurfaceFindings } from "./surfaceFindingsAdapter.js";
import { baseSourceRef, parseSupportedSourceRef, fetchSourceOccurrences } from "./sourceOccurrenceProjection.js";

const ZVI = "c66f0464-0928-490e-be9b-66d8a87e7fc8";
const SRC = "0c2aaf88-5df4-45fc-a92e-f644610a4f1a";
const REF = `channel_updates:${SRC}`;
const row = (id, kind, extra = {}) => ({
  id, kind, statement: `s-${id}`, value: 631, terms: ["בנט"], source: "channel_updates", source_ref: REF,
  status: "draft", privacy_scope: "public", contributor: "ZURIEL", created_at: `2026-10-01T00:00:0${id.length}Z`, ...extra,
});
const five = ["a1", "a2", "b", "c", "d"].map((id, i) => row(id, ["fact", "fact", "relation", "observation", "hypothesis"][i]));
const finds = (rs) => rs.map((r) => researchObjectToUniversalFinding(r));

function fakeClient({ sources = [], people = [], fail = false } = {}) {
  const calls = [];
  return {
    calls,
    from(table) {
      const q = { table, select(cols) { q.cols = cols; return q; }, in(col, ids) {
        calls.push({ table, cols: q.cols, col, ids });
        if (fail) return Promise.resolve({ data: null, error: { message: "denied" } });
        return Promise.resolve({ data: table === "channel_updates" ? sources : people, error: null });
      } };
      return q;
    },
  };
}
const zviClient = () => fakeClient({
  sources: [{ id: SRC, created_at: "2026-09-30T10:00:00Z", status: "approved", channel: "tg", contributor_id: ZVI, credit: "x", speaker: "y" }],
  people: [{ id: ZVI, display_name: "צבי (OPOC)" }],
});

test("parser: exact base ref, supported prefix only", () => {
  assert.equal(baseSourceRef(`${REF}#semantic/batch`), REF);
  assert.deepEqual(parseSupportedSourceRef(`${REF}#x`), { kind: "channel_updates", id: SRC, ref: REF });
  assert.equal(parseSupportedSourceRef("channel_updates:not-a-uuid"), null);
  assert.equal(parseSupportedSourceRef("work_log:" + SRC), null);
  assert.equal(parseSupportedSourceRef("סוד החשמל — גליון"), null);
});

test("resolver: exact bounded lookup + contributor display; occurrence shape", async () => {
  const client = zviClient();
  const occ = await fetchSourceOccurrences(finds(five), { client });
  assert.deepEqual(occ[REF], { createdAt: "2026-09-30T10:00:00Z", status: "approved", channel: "tg", contributorId: ZVI, contributorName: "צבי (OPOC)" });
  assert.equal(client.calls.length, 2);
  assert.deepEqual(client.calls[0].ids, [SRC]);
  assert.equal(client.calls[0].cols, "id, created_at, status, channel, contributor_id, credit, speaker");
  assert.deepEqual(client.calls[1], { table: "contributors", cols: "id, display_name", col: "id", ids: [ZVI] });
});

test("resolver: unsupported/freeform refs trigger no query; failure/denial => empty", async () => {
  const client = zviClient();
  const free = finds([row("f1", "fact", { source_ref: "סוד החשמל — גליון", source: "גליון" })]);
  assert.deepEqual(await fetchSourceOccurrences(free, { client }), {});
  assert.equal(client.calls.length, 0);
  assert.deepEqual(await fetchSourceOccurrences(finds(five), { client: fakeClient({ fail: true }) }), {});
  assert.deepEqual(await fetchSourceOccurrences(finds(five), { client: fakeClient() }), {});
  assert.deepEqual(await fetchSourceOccurrences(finds(five), {}), {});
});

test("resolver: refs capped at 40", async () => {
  const many = finds(Array.from({ length: 60 }, (_, i) => row(`m${i}`, "fact", { source_ref: `channel_updates:${SRC.slice(0, -2)}${String(i).padStart(2, "0")}` })));
  const client = fakeClient();
  await fetchSourceOccurrences(many, { client });
  assert.ok(client.calls[0].ids.length <= 40);
});

test("5 Zvi findings, one source => ONE sidecar row, label, count 5, child createdBy null", async () => {
  const f = finds(five);
  const occurrences = await fetchSourceOccurrences(f, { client: zviClient() });
  const rows = buildSurfaceFindings({ findings: f, occurrences, prominenceItems: [] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].sourceLabel, "צבי (OPOC)");
  assert.equal(rows[0].bundleCount, 5);
  assert.equal(rows[0].focusKind, "source_bundle");
  assert.ok(!("findings" in rows[0]));
  const [b] = buildSourceBundles(f, { occurrences });
  assert.ok(b.findings.every((x) => x.createdBy == null));
});

test("filtered child absent from hub findings cannot affect count", async () => {
  const f = finds(five.slice(0, 4));
  const occurrences = await fetchSourceOccurrences(f, { client: zviClient() });
  assert.equal(buildSurfaceFindings({ findings: f, occurrences })[0].bundleCount, 4);
});

test("Sod Hashmal: human corpus => source_work header, no ZURIEL/uploaded_docx authorship", () => {
  const corpus = "סוד החשמל — גליון ראש השנה תשפ״ז";
  const f = finds(["s1", "s2", "s3"].map((id) => row(id, "fact", { source: corpus, source_ref: "freeform:ראש-השנה" })));
  const [b] = buildSourceBundles(f);
  assert.deepEqual(b.header, { type: "source_work", contributorId: null, label: corpus });
  assert.ok(b.findings.every((x) => x.createdBy == null));
  const [r] = buildSurfaceFindings({ findings: f });
  assert.equal(r.sourceLabel, corpus);
});

test("source_work fallback filters technical corpus; occurrence header wins", () => {
  for (const t of ["channel_updates", "uploaded_docx", "research_objects", "work_log", "engine_adapter", "https://x.io/a", "123", "some_internal_token"]) {
    assert.equal(humanSourceCorpusLabel(t), null, t);
  }
  assert.equal(humanSourceCorpusLabel("גליון ראש השנה"), "גליון ראש השנה");
  const f = finds([row("u1", "fact", { source: "uploaded_docx", contributor: "ZURIEL" }), row("u2", "fact", { source: "uploaded_docx", contributor: "ZURIEL" })]);
  assert.equal(buildSourceBundles(f)[0].header, null);
  const mixed = finds([row("x1", "fact", { source: "גליון א" }), row("x2", "fact", { source: "גליון ב" })]);
  assert.equal(buildSourceBundles(mixed)[0].header, null);
  const g = finds([row("w1", "fact", { source: "גליון א" }), row("w2", "fact", { source: "גליון א" })]);
  const occ = { [REF]: { contributorId: ZVI, contributorName: "צבי (OPOC)" } };
  assert.equal(buildSourceBundles(g, { occurrences: occ })[0].header.type, "source_author");
});

test("Number/Topic/World feed findings + occurrences through the SAME buildSurfaceFindings; Post has no raw lookup", () => {
  const dir = new URL("../../pages/", import.meta.url);
  const read = (n) => readFileSync(new URL(n, dir), "utf8");
  const num = read("Number2029Page.jsx"), topic = read("Topic2029Page.jsx"), world = read("World2029Page.jsx"), post = read("Post2029Page.jsx");
  assert.match(num, /buildSurfaceFindings\(\{ findings: researchFindings, occurrences: data\?\.research\?\.sourceOccurrences/);
  assert.match(topic, /buildSurfaceFindings\(\{ findings: goldenState\.hub\?\.research\?\.findings[^)]*sourceOccurrences/);
  assert.match(world, /buildSurfaceFindings\(\{ findings: researchFindings, occurrences: data\?\.research\?\.sourceOccurrences/);
  assert.doesNotMatch(post, /fetchSourceOccurrences|channel_updates|research_objects/);
  assert.match(readFileSync(new URL("./entityHubProjection.js", import.meta.url), "utf8"), /sourceOccurrences/);
});
