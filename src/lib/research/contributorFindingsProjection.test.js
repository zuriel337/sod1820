import test from "node:test";
import assert from "node:assert/strict";
import { fetchContributorFindingsProjection, buildContributorFindingsProjection } from "./contributorFindingsProjection.js";
import { PROJECTOR_MODE } from "./researchViewMode.js";

const CONTRIBUTOR = { id: "c1", slug: "yaniv", display_name: "יניב", wa_names: [], role: "researcher" };
const SOURCE = { id: 11, created_at: "2026-10-01T10:00:00Z", text: "שלום עולם — דברי המקור בעברית", credit: "יניב", channel: "wa", status: "approved" };
const RESEARCH_ROW = { id: "r1", created_at: "2026-10-02T10:00:00Z", kind: "equality", statement: "ממצא", terms: ["אור"], value: 207, source_ref: "channel_updates:11", contributor: "יניב", status: "candidate", privacy_scope: "public" };

// Minimal chainable fake: per-table result, records the client label so mode isolation can be asserted.
function fakeClient(label, tables, calls) {
  return {
    from(table) {
      const call = { label, table, filters: [] };
      calls.push(call);
      const result = tables[table] ?? { data: [] };
      const b = {
        select: () => b,
        in: (column, value) => { call.filters.push(["in", column, value]); return b; },
        eq: (column, value) => { call.filters.push(["eq", column, value]); return b; },
        is: (column, value) => { call.filters.push(["is", column, value]); return b; },
        order: () => b, contains: () => b,
        range: () => Promise.resolve(result),
        maybeSingle: () => Promise.resolve(result),
        then: (res, rej) => Promise.resolve(result).then(res, rej),
      };
      return b;
    },
  };
}
const noTopics = async () => [];

test("source with zero Findings renders as a source group (no dummy Finding)", () => {
  const p = buildContributorFindingsProjection({ contributor: CONTRIBUTOR, sourceMessages: [SOURCE] });
  assert.equal(p.sourceGroups.length, 1);
  const g = p.sourceGroups[0];
  assert.equal(g.findingCount, 0);
  assert.deepEqual(g.universalFindings, []);
  assert.equal(g.source.text, SOURCE.text); // Hebrew source witness preserved verbatim
  assert.equal(g.title, "שלום עולם — דברי המקור בעברית");
  assert.equal(p.counts.sourceOnlyGroups, 1);
  assert.equal(p.counts.sourceGroupsWithFindings, 0);
  assert.equal(p.topics.length, 0); // no Topic minted
});

test("an explicit image reference links the adjacent image and full message without deleting either source", () => {
  const image = {
    id: "image-1", created_at: "2026-10-01T10:00:00Z", text: "📷 עדכון",
    image_url: "https://example.com/source.jpg", credit: "יניב", channel: "wa", status: "approved",
  };
  const message = {
    id: "text-1", created_at: "2026-10-01T10:02:00Z", text: "הסבר מלא [Image 17.jpg]",
    credit: "יניב", channel: "wa", status: "approved",
  };
  const p = buildContributorFindingsProjection({ contributor: CONTRIBUTOR, sourceMessages: [message, image] });
  assert.equal(p.counts.sourceRecords, 2);
  assert.equal(p.counts.sourceGroups, 1);
  assert.equal(p.counts.linkedImageMessages, 1);
  assert.equal(p.sourceGroups[0].source.id, "text-1");
  assert.equal(p.sourceGroups[0].mediaSource.id, "image-1");
  assert.deepEqual(p.sourceGroups[0].linkedSourceRefs, ["channel_updates:image-1", "channel_updates:text-1"]);
  assert.equal(p.sourceGroups[0].mediaPair.basis, "explicit_image_reference");
});

test("bounded structured overlap links a media message, while time proximity alone does not", () => {
  const image = { id: "image-2", created_at: "2026-10-01T10:00:00Z", text: "📷 עדכון", image_url: "https://example.com/2.jpg", credit: "יניב", channel: "wa", status: "approved" };
  const related = { id: "text-2", created_at: "2026-10-01T10:02:00Z", text: "הסבר ללא שם קובץ", credit: "יניב", channel: "wa", status: "approved" };
  const researchObjects = [
    { ...RESEARCH_ROW, id: "image-finding", source_ref: "channel_updates:image-2", terms: ["אור", "חיים"], value: 207 },
    { ...RESEARCH_ROW, id: "text-finding", source_ref: "channel_updates:text-2", terms: ["אור", "חיים", "ברכה"], value: 207 },
  ];
  const linked = buildContributorFindingsProjection({ contributor: CONTRIBUTOR, sourceMessages: [image, related], researchObjects });
  assert.equal(linked.counts.linkedImageMessages, 1);
  assert.equal(linked.sourceGroups[0].mediaPair.basis, "structured_source_overlap");
  assert.equal(linked.sourceGroups[0].findingCount, 2);

  const unrelated = buildContributorFindingsProjection({ contributor: CONTRIBUTOR, sourceMessages: [
    image,
    { ...related, id: "text-3", text: "הודעה אחרת" },
  ] });
  assert.equal(unrelated.counts.linkedImageMessages, 0);
  assert.equal(unrelated.counts.sourceGroups, 2);

  const mixedAccess = buildContributorFindingsProjection({ contributor: CONTRIBUTOR, sourceMessages: [
    image,
    { ...related, id: "text-4", text: "הסבר [Image 4.jpg]", status: "private" },
  ] });
  assert.equal(mixedAccess.counts.linkedImageMessages, 0);
  assert.equal(mixedAccess.counts.sourceGroups, 2);
});

test("a research permission failure does not erase readable sources; availability is separate from zero", async () => {
  const calls = [];
  const anon = fakeClient("anon", {
    contributors: { data: CONTRIBUTOR },
    research_objects: { data: null, error: { message: "permission denied for table research_objects", code: "42501" } },
    channel_updates: { data: [SOURCE], count: 1 },
    research_contributions: { data: [], count: 0 },
    gematria_words: { data: [] },
  }, calls);
  const projection = await fetchContributorFindingsProjection("yaniv", { publicClient: () => anon, topicsReader: noTopics });
  assert.equal(projection.availability.research, "unavailable");
  assert.equal(projection.availability.sources, "ok");
  assert.equal(projection.sourceGroups.length, 1);
  assert.equal(projection.counts.researchObjects, 0); // count is 0 but availability says unknown, not "none exist"
});

test("anon site writer read (Yaniv/Shahar shape): sources + contributions, zero stable-id research", async () => {
  const calls = [];
  const anon = fakeClient("anon", {
    contributors: { data: CONTRIBUTOR },
    research_objects: { data: [], count: 0 },
    channel_updates: { data: [SOURCE, { ...SOURCE, id: 12, text: "עוד מקור" }], count: 2 },
    research_contributions: { data: [{ id: "k1", created_at: "2026-10-01T00:00:00Z", title: "תרומה", body: "x" }], count: 1 },
  }, calls);
  const p = await fetchContributorFindingsProjection("yaniv", { publicClient: () => anon, topicsReader: noTopics });
  assert.equal(p.sourceGroups.length, 2);
  assert.equal(p.counts.contributions, 1);
  assert.equal(p.availability.research, "ok");
  assert.equal(p.mode, PROJECTOR_MODE.PUBLIC_VIEW);
});

test("PUBLIC mode never touches the session client; ADMIN mode uses it", async () => {
  const calls = [];
  const tables = { contributors: { data: CONTRIBUTOR }, research_objects: { data: [RESEARCH_ROW], count: 1 }, channel_updates: { data: [], count: 0 }, research_contributions: { data: [], count: 0 }, gematria_words: { data: [] } };
  const anon = fakeClient("anon", tables, calls);
  const session = fakeClient("session", tables, calls);
  await fetchContributorFindingsProjection("yaniv", { publicClient: () => anon, sessionClient: session, topicsReader: noTopics });
  assert.ok(calls.length && calls.every((c) => c.label === "anon"));
  calls.length = 0;
  const admin = await fetchContributorFindingsProjection("yaniv", { mode: PROJECTOR_MODE.ADMIN_ALL, publicClient: () => anon, sessionClient: session, topicsReader: noTopics });
  assert.ok(calls.length && calls.every((c) => c.label === "session"));
  assert.equal(admin.counts.researchObjects, 1);
});

test("source attribution uses stable contributor identity and only unbound registered aliases", async () => {
  const calls = [];
  const contributor = { ...CONTRIBUTOR, wa_names: ["יניב הרשום"] };
  const anon = fakeClient("anon", {
    contributors: { data: contributor },
    research_objects: { data: [], count: 0 },
    channel_updates: { data: [], count: 0 },
    research_contributions: { data: [], count: 0 },
  }, calls);
  await fetchContributorFindingsProjection("yaniv", { publicClient: () => anon, topicsReader: noTopics });
  const sourceCalls = calls.filter((call) => call.table === "channel_updates");
  assert.equal(sourceCalls.length, 3);
  assert.deepEqual(sourceCalls[0].filters, [["eq", "contributor_id", "c1"]]);
  for (const call of sourceCalls.slice(1)) {
    assert.ok(call.filters.some(([op, column]) => op === "in" && ["credit", "speaker"].includes(column)));
    assert.ok(call.filters.some(([op, column, value]) => op === "is" && column === "contributor_id" && value === null));
  }
});

test("personal/person_only research is never requested by owner_slug", async () => {
  const src = (await import("node:fs")).readFileSync(new URL("./contributorFindingsProjection.js", import.meta.url), "utf8");
  assert.doesNotMatch(src, /owner_slug|person_only/);
});
