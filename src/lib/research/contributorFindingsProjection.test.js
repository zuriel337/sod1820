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
      calls.push({ label, table });
      const result = tables[table] ?? { data: [] };
      const b = {
        select: () => b, in: () => b, eq: () => b, order: () => b, contains: () => b,
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

test("personal/person_only research is never requested by owner_slug", async () => {
  const src = (await import("node:fs")).readFileSync(new URL("./contributorFindingsProjection.js", import.meta.url), "utf8");
  assert.doesNotMatch(src, /owner_slug|person_only/);
});
