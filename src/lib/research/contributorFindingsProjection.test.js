import test from "node:test";
import assert from "node:assert/strict";
import { CONTRIBUTOR_LOAD_PROFILE, fetchContributorFindingsProjection, buildContributorFindingsProjection, deduplicateContributorSourceGroups, MAX_CONTRIBUTOR_RESEARCH } from "./contributorFindingsProjection.js";
import { PROJECTOR_MODE } from "./researchViewMode.js";

const CONTRIBUTOR = { id: "c1", slug: "yaniv", display_name: "יניב", wa_names: [], role: "researcher" };
const SOURCE = { id: 11, created_at: "2026-10-01T10:00:00Z", text: "שלום עולם — דברי המקור בעברית", credit: "יניב", channel: "wa", status: "approved" };
const RESEARCH_ROW = { id: "r1", created_at: "2026-10-02T10:00:00Z", kind: "equality", statement: "ממצא", terms: ["אור"], value: 207, source_ref: "channel_updates:11", contributor: "יניב", status: "candidate", privacy_scope: "public" };

// Minimal chainable fake: per-table result, records the client label so mode isolation can be asserted.
function fakeClient(label, tables, calls) {
  return {
    rpc(name, args) {
      calls.push({ label, table: `rpc:${name}`, filters: [["args", args]] });
      return Promise.resolve(tables[name] ?? tables.gematria_words ?? { data: [] });
    },
    from(table) {
      const call = { label, table, filters: [] };
      calls.push(call);
      const result = tables[table]
        ?? (table === "world_contributor_research_v1" ? tables.research_objects : null)
        ?? { data: [] };
      const b = {
        select: () => b,
        in: (column, value) => { call.filters.push(["in", column, value]); return b; },
        or: (value) => { call.filters.push(["or", value]); return b; },
        eq: (column, value) => { call.filters.push(["eq", column, value]); return b; },
        like: (column, value) => { call.filters.push(["like", column, value]); return b; },
        not: (column, operator, value) => { call.filters.push(["not", column, operator, value]); return b; },
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
  const p = buildContributorFindingsProjection({ contributor: CONTRIBUTOR, sourceMessages: [{ ...SOURCE, topics: ["שפה"] }] });
  assert.equal(p.sourceGroups.length, 1);
  const g = p.sourceGroups[0];
  assert.equal(g.findingCount, 0);
  assert.deepEqual(g.universalFindings, []);
  assert.equal(g.source.text, SOURCE.text); // Hebrew source witness preserved verbatim
  assert.deepEqual(g.source.topics, ["שפה"]);
  assert.equal(g.title, "שלום עולם — דברי המקור בעברית");
  assert.equal(p.counts.sourceOnlyGroups, 1);
  assert.equal(p.counts.sourceGroupsWithFindings, 0);
  assert.equal(p.topics.length, 0); // no Topic minted
});

test("missing research values stay missing and an explicitly authored zero remains zero", () => {
  const sourceMessages = ["missing", "empty", "zero"].map((id) => ({ ...SOURCE, id }));
  const researchObjects = [
    { ...RESEARCH_ROW, id: "m", statement: "ללא מספר", value: null, source_ref: "channel_updates:missing" },
    { ...RESEARCH_ROW, id: "e", statement: "שדה ריק", value: "", source_ref: "channel_updates:empty" },
    { ...RESEARCH_ROW, id: "z", statement: "אפס מפורש", value: 0, source_ref: "channel_updates:zero" },
  ];
  const result = buildContributorFindingsProjection({ contributor: CONTRIBUTOR, sourceMessages, researchObjects });
  for (const id of ["missing", "empty"]) {
    const group = result.sourceGroups.find((row) => row.sourceRef === `channel_updates:${id}`);
    assert.deepEqual(group.values, []);
    assert.equal(group.facets.includes("number"), false);
  }
  const zero = result.sourceGroups.find((row) => row.sourceRef === "channel_updates:zero");
  assert.deepEqual(zero.values, [0]);
  assert.equal(zero.facets.includes("number"), true);
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

test("anchored research locators stay exact on the row but group under their source message", () => {
  const p = buildContributorFindingsProjection({
    contributor: CONTRIBUTOR,
    sourceMessages: [SOURCE],
    researchObjects: [{ ...RESEARCH_ROW, source_ref: "channel_updates:11#batch001:finding" }],
  });
  assert.equal(p.sourceGroups.length, 1);
  assert.equal(p.sourceGroups[0].sourceRef, "channel_updates:11");
  assert.equal(p.sourceGroups[0].findingCount, 1);
  assert.equal(p.sourceGroups[0].rows[0].source_ref, "channel_updates:11#batch001:finding");
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
  assert.equal(linked.sourceGroups[0].findingCount, 1);
  assert.equal(linked.counts.duplicateFindingsHidden, 1);
  assert.equal(linked.sourceGroups[0].mediaSource.id, "image-2");

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

test("exact duplicate findings become one visible publication and retain every source occurrence", () => {
  const sourceOne = { ...SOURCE, id: "source-short", text: "גרסה קצרה", created_at: "2026-10-01T10:00:00Z" };
  const sourceTwo = { ...SOURCE, id: "source-long", text: "הודעת המקור המלאה", created_at: "2026-10-02T10:00:00Z" };
  const short = {
    ...RESEARCH_ROW,
    id: "short",
    statement: "אור=207",
    source_ref: "channel_updates:source-short#batch001:finding",
  };
  const long = {
    ...RESEARCH_ROW,
    id: "long",
    statement: "אור = 207",
    source_ref: "channel_updates:source-long#batch002:finding",
  };

  const projection = buildContributorFindingsProjection({
    contributor: CONTRIBUTOR,
    sourceMessages: [sourceOne, sourceTwo],
    researchObjects: [short, long],
  });

  assert.equal(projection.counts.researchObjects, 2);
  assert.equal(projection.counts.visibleResearchObjects, 1);
  assert.equal(projection.counts.exactDuplicateGroups, 1);
  assert.equal(projection.counts.duplicateFindingsHidden, 1);
  assert.equal(projection.counts.duplicateSourceGroupsHidden, 1);
  assert.equal(projection.sourceGroups.length, 1);
  assert.equal(projection.sourceGroups[0].rows[0].id, "long");
  assert.equal(projection.sourceGroups[0].duplicateFindingClusters[0].canonicalSelection, "longest_original_statement");
  assert.deepEqual(
    projection.sourceGroups[0].duplicateFindingClusters[0].occurrences.map((item) => item.findingId).sort(),
    ["long", "short"],
  );
  assert.deepEqual(
    projection.sourceGroups[0].sourceOccurrences.map((item) => item.sourceRef).sort(),
    ["channel_updates:source-long", "channel_updates:source-short"],
  );
  assert.equal(projection.duplicateProjection.nonDestructive, true);
});

test("access or governance disagreement is never hidden as a duplicate", () => {
  const groups = [
    {
      id: "channel_updates:a",
      sourceRef: "channel_updates:a",
      source: { id: "a", sourceRef: "channel_updates:a", text: "א" },
      rows: [{ ...RESEARCH_ROW, id: "a", statement: "אור=207", source_ref: "channel_updates:a", status: "candidate" }],
      topicLinks: [],
    },
    {
      id: "channel_updates:b",
      sourceRef: "channel_updates:b",
      source: { id: "b", sourceRef: "channel_updates:b", text: "ב" },
      rows: [{ ...RESEARCH_ROW, id: "b", statement: "אור=207", source_ref: "channel_updates:b", status: "approved" }],
      topicLinks: [],
    },
  ];

  const result = deduplicateContributorSourceGroups(groups);
  assert.equal(result.groups.length, 2);
  assert.equal(result.duplicateOccurrences, 0);
  assert.equal(result.hiddenSourceGroups, 0);
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
  assert.ok(calls.some((c) => c.table === "rpc:world_gematria_lexical_lookup_v1"));
  assert.equal(calls.some((c) => c.table === "gematria_words"), false);
  calls.length = 0;
  const admin = await fetchContributorFindingsProjection("yaniv", { mode: PROJECTOR_MODE.ADMIN_ALL, publicClient: () => anon, sessionClient: session, topicsReader: noTopics });
  assert.ok(calls.length && calls.every((c) => c.label === "session"));
  assert.equal(admin.counts.researchObjects, 1);
});

test("an exact public source link reads only that Zvi occurrence and its research rows", async () => {
  const calls = [];
  const occurrenceId = "a6805e30-21e0-4315-8f35-70b1bfdb0d14";
  const contributor = { ...CONTRIBUTOR, id: "zvi", slug: "tzvi-opoc", display_name: "צבי (OPOC)", wa_names: ["צבי"] };
  const source = { ...SOURCE, id: occurrenceId, contributor_id: "zvi", credit: "צבי (OPOC)" };
  const research = { ...RESEARCH_ROW, source_ref: `channel_updates:${occurrenceId}#finding` };
  const anon = fakeClient("anon", {
    contributors: { data: contributor },
    research_objects: { data: [research], count: 1 },
    channel_updates: { data: [source], count: 1 },
    gematria_words: { data: [] },
  }, calls);

  const projection = await fetchContributorFindingsProjection("tzvi-opoc", {
    publicClient: () => anon,
    topicsReader: async () => { throw new Error("focused source must not load topics"); },
    sourceRef: `channel_updates:${occurrenceId}`,
  });

  assert.deepEqual(projection.focus, { sourceRef: `channel_updates:${occurrenceId}`, exactOccurrence: true });
  assert.equal(projection.sourceGroups.length, 1);
  assert.equal(projection.sourceGroups[0].sourceRef, `channel_updates:${occurrenceId}`);
  assert.equal(calls.filter((call) => call.table === "channel_updates").length, 1);
  assert.ok(calls.find((call) => call.table === "channel_updates")?.filters.some((item) => item[0] === "eq" && item[1] === "id" && item[2] === occurrenceId));
  assert.ok(calls.find((call) => call.table === "world_contributor_research_v1")?.filters.some((item) => item[0] === "like" && item[2] === `channel_updates:${occurrenceId}%`));
  assert.equal(calls.some((call) => call.table === "research_contributions"), false);
});

test("the public source library opens every readable source and only its promoted tree findings", async () => {
  const calls = [];
  const anon = fakeClient("anon", {
    contributors: { data: CONTRIBUTOR },
    research_objects: { data: [{ ...RESEARCH_ROW, status: "canonical", promoted_node_id: "node-1" }], count: 1 },
    channel_updates: { data: [SOURCE, { ...SOURCE, id: 12, text: "כתב ציבורי נוסף" }], count: 2 },
    research_contributions: { data: [], count: 0 },
  }, calls);

  const projection = await fetchContributorFindingsProjection("yaniv", {
    publicClient: () => anon,
    topicsReader: noTopics,
    loadProfile: CONTRIBUTOR_LOAD_PROFILE.SOURCE_LIBRARY,
  });

  assert.equal(projection.sourceGroups.length, 2);
  assert.equal(projection.counts.sourceRecords, 2);
  assert.equal(projection.counts.researchObjects, 1);
  assert.equal(projection.availability.research, "ok");
  assert.equal(projection.loadState.researchObjectsTotal, 1);
  assert.equal(projection.loadState.researchObjectsDeferred, false);
  assert.equal(projection.loadState.researchObjectsTreeOnly, true);
  const researchCall = calls.find((call) => call.table === "world_contributor_research_v1");
  assert.ok(researchCall?.filters.some((item) => item[0] === "eq" && item[1] === "status" && item[2] === "canonical"));
  assert.ok(researchCall?.filters.some((item) => item[0] === "not" && item[1] === "promoted_node_id" && item[2] === "is" && item[3] === null));
});

test("source library exposes readable sources while promoted findings are delayed", async () => {
  let releaseResearch;
  const pendingResearch = new Promise((resolve) => { releaseResearch = resolve; });
  const calls = [];
  const anon = fakeClient("anon", { contributors: { data: CONTRIBUTOR }, research_objects: pendingResearch,
    channel_updates: { data: [SOURCE], count: 1 }, research_contributions: { data: [], count: 0 } }, calls);
  let deliverPartial;
  const partialReady = new Promise((resolve) => { deliverPartial = resolve; });
  const resultPromise = fetchContributorFindingsProjection("yaniv", { publicClient: () => anon, topicsReader: noTopics,
    loadProfile: CONTRIBUTOR_LOAD_PROFILE.SOURCE_LIBRARY, onSourcesReady: deliverPartial });
  const partial = await partialReady;
  assert.equal(partial.sourceGroups.length, 1);
  assert.equal(partial.availability.research, "loading");
  assert.equal(partial.loadState.researchObjectsTotal, null);
  releaseResearch({ data: [{ ...RESEARCH_ROW, status: "canonical", promoted_node_id: "node-1" }], count: 1 });
  const final = await resultPromise;
  assert.equal(final.availability.research, "ok");
  assert.equal(final.counts.researchObjects, 1);
  assert.equal(final.sourceGroups[0].rows[0].id, "r1");
});

test("failed promoted research leaves source readable and reports unavailable", async () => {
  const calls = [];
  const anon = fakeClient("anon", { contributors: { data: CONTRIBUTOR }, research_objects: { error: new Error("unavailable") },
    channel_updates: { data: [SOURCE], count: 1 }, research_contributions: { data: [], count: 0 } }, calls);
  let partial;
  const final = await fetchContributorFindingsProjection("yaniv", { publicClient: () => anon, topicsReader: noTopics,
    loadProfile: CONTRIBUTOR_LOAD_PROFILE.SOURCE_LIBRARY, onSourcesReady: (value) => { partial = value; } });
  assert.equal(partial.sourceGroups.length, 1);
  assert.equal(partial.availability.research, "loading");
  assert.equal(final.sourceGroups.length, 1);
  assert.equal(final.availability.research, "unavailable");
});

test("stable source and unbound alias reads run concurrently without losing identities", async () => {
  const calls = [], pending = [];
  const client = fakeClient("anon", { contributors: { data: CONTRIBUTOR }, research_objects: { data: [], count: 0 },
    research_contributions: { data: [], count: 0 } }, calls);
  const originalFrom = client.from.bind(client);
  client.from = (table) => {
    const builder = originalFrom(table);
    if (table === "channel_updates") {
      const call = calls.at(-1);
      builder.range = () => new Promise((resolve) => pending.push({ call, resolve }));
    }
    return builder;
  };
  const promise = fetchContributorFindingsProjection("yaniv", { publicClient: () => client, topicsReader: noTopics,
    loadProfile: CONTRIBUTOR_LOAD_PROFILE.SOURCE_LIBRARY });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(pending.length, 3);
  const stable = pending.find(({ call }) => call.filters.some((x) => x[0] === "eq" && x[1] === "contributor_id"));
  const fallback = pending.filter(({ call }) => call.filters.some((x) => x[0] === "is" && x[1] === "contributor_id"));
  assert.ok(stable);
  assert.equal(fallback.length, 2);
  stable.resolve({ data: [{ ...SOURCE, contributor_id: "c1" }], count: 1 });
  fallback[0].resolve({ data: [{ ...SOURCE, id: 12, contributor_id: null }], count: 1 });
  fallback[1].resolve({ data: [], count: 0 });
  const result = await promise;
  assert.equal(result.counts.sourceRecords, 2);
  assert.deepEqual(new Set(result.sourceGroups.map((group) => group.sourceRef)), new Set(["channel_updates:11", "channel_updates:12"]));
});

test("an exact occurrence overrides source-first deferral and loads only its research slice", async () => {
  const calls = [];
  const occurrenceId = "a6805e30-21e0-4315-8f35-70b1bfdb0d14";
  const contributor = { ...CONTRIBUTOR, id: "zvi", slug: "tzvi-opoc", display_name: "צבי (OPOC)", wa_names: ["צבי"] };
  const anon = fakeClient("anon", {
    contributors: { data: contributor },
    research_objects: { data: [{ ...RESEARCH_ROW, source_ref: `channel_updates:${occurrenceId}#finding` }], count: 1 },
    channel_updates: { data: [{ ...SOURCE, id: occurrenceId, contributor_id: "zvi" }], count: 1 },
    gematria_words: { data: [] },
  }, calls);

  const projection = await fetchContributorFindingsProjection("tzvi-opoc", {
    publicClient: () => anon,
    topicsReader: noTopics,
    sourceRef: `channel_updates:${occurrenceId}`,
    loadProfile: CONTRIBUTOR_LOAD_PROFILE.SOURCE_LIBRARY,
  });

  assert.equal(projection.loadState.researchObjectsDeferred, false);
  assert.equal(projection.counts.researchObjects, 1);
  assert.ok(calls.some((call) => call.table === "world_contributor_research_v1"));
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
  const researchCalls = calls.filter((call) => call.table === "world_contributor_research_v1");
  assert.equal(researchCalls.length, 1);
  assert.ok(researchCalls[0].filters.some(([op, value]) => op === "or" && value.includes("source_contributor_id.eq.c1")));
  const sourceCalls = calls.filter((call) => call.table === "channel_updates");
  assert.equal(sourceCalls.length, 3);
  assert.deepEqual(sourceCalls[0].filters, [["eq", "contributor_id", "c1"]]);
  for (const call of sourceCalls.slice(1)) {
    assert.ok(call.filters.some(([op, column]) => op === "in" && ["credit", "speaker"].includes(column)));
    assert.ok(call.filters.some(([op, column, value]) => op === "is" && column === "contributor_id" && value === null));
  }
});

test("contributor research read is bounded above the current full corpus", () => {
  assert.ok(MAX_CONTRIBUTOR_RESEARCH >= 7353);
});

test("personal/person_only research is never requested by owner_slug", async () => {
  const src = (await import("node:fs")).readFileSync(new URL("./contributorFindingsProjection.js", import.meta.url), "utf8");
  assert.doesNotMatch(src, /owner_slug|person_only/);
});
