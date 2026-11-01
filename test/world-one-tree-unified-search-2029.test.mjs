import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalSourceSubjectCards, filterPublicSourceSubjects, groupPublicSourceMessages,
  interleavePublicSubjectCards, searchPublicGroupSourcePage,
} from "../src/lib/research/worldPublicSourceSubjects2029.js";
import { searchCorpusContentPage, WORLD_SOURCE_CORPORA } from "../src/lib/research/worldSourceCorpus.js";

const ref = (suffix) => `channel_updates:00000000-0000-4000-8000-${String(suffix).padStart(12, "0")}`;
const group = (suffix, fullText, creatorSlug = "tzvi-opoc") => ({
  sourceRef: ref(suffix), fullText, creatorSlug, creator: creatorSlug,
  label: fullText.slice(0, 140), arrivalAt: `2026-10-${String(suffix).padStart(2, "0")}T00:00:00Z`,
});

test("one search finds non-numeric topic terms and preserves source and topic identities", () => {
  const cards = canonicalSourceSubjectCards({
    topics: [{ id: "one", slug: "one", title: "שער אחר", search_terms: ["ירושלים", "תפילה"], created_by: "צבי (OPOC)" }],
    hashmalPosts: [{ id: 5, slug: "source", title: "ירושלים", source: "sod1820" }],
  });
  const matches = filterPublicSourceSubjects(cards, { query: "ירושלים" });
  assert.deepEqual(matches.map((card) => card.id), ["topic:one", "posts:5"]);
  assert.deepEqual(matches.map((card) => card.href), ["/topic/one", "/post/source"]);
  assert.equal(filterPublicSourceSubjects(cards, { query: "תפילה" })[0].id, "topic:one");
  assert.equal(filterPublicSourceSubjects([{ id: "vowels", title: "חִלָּזוֹן", values: [] }], { query: "חלזון" })[0].id,
    "vowels", "Hebrew words remain searchable without typing their vowel marks");
  assert.equal(filterPublicSourceSubjects(cards, { query: "תפילה", origin: "writer:tzvi-opoc", creatorName: "צבי (OPOC)" })[0].id, "topic:one");
  assert.equal(filterPublicSourceSubjects(cards, { query: "תפילה", origin: "writer:another", creatorName: "כותב אחר" }).length, 0);
  assert.deepEqual(interleavePublicSubjectCards([cards[0], { ...cards[0], id: "topic:two" }, cards[1]])
    .map((card) => card.id), ["topic:one", "posts:5", "topic:two"]);
});

test("group-source search uses the existing bounded reader and retains every occurrence", async () => {
  const calls = [];
  const client = { from: () => {
    const builder = { select: () => builder, in: () => builder,
      eq: async () => ({ data: [{ id: ref(1).split(":")[1], status: "live", contributor_id: "writer-id" },
        { id: ref(2).split(":")[1], status: "private", contributor_id: "writer-id" }] }) };
    return builder;
  } };
  const result = await searchPublicGroupSourcePage("ירושלים", { reader: async (args) => {
    calls.push(args); return [group(1, "ירושלים היא נושא"), group(2, "ירושלים היא נושא"), group(3, "עניין אחר")];
  }, client, peopleBySlug: { "tzvi-opoc": { id: "writer-id" } } });
  assert.deepEqual(calls, [{ limit: 40, before: null }]);
  assert.equal(result.rows.length, 2);
  const grouped = groupPublicSourceMessages(result.rows);
  assert.equal(grouped.length, 1);
  assert.deepEqual(grouped[0].occurrences.map((item) => item.ref), [ref(1), ref(2)]);
  assert.ok(grouped[0].occurrences[0].href.includes("sourceRef=channel_updates%3A"));
  assert.equal(grouped[0].occurrences[1].href, null, "an unverified public source is readable in place but never gets a fabricated link");
  assert.equal(groupPublicSourceMessages([group(1, "אותו נוסח"), group(2, "אותו נוסח", "another-writer")]).length, 2);
  assert.equal(filterPublicSourceSubjects(grouped, { origin: "writer:tzvi-opoc" }).length, 1);
  const withVowels = await searchPublicGroupSourcePage("חלזון", {
    reader: async () => [group(4, "חִלָּזוֹן כחול")], client: null,
  });
  assert.equal(withVowels.rows.length, 1);
  assert.equal(groupPublicSourceMessages([group(1, "א".repeat(1200)), group(2, "א".repeat(1200))]).length, 2,
    "possibly clipped messages never collapse on their visible prefix");
});

test("corpus text search preserves public filters, rejects HTML-only and draft matches, and never returns raw HTML", async () => {
  const calls = [];
  const rows = [
    { id: 1, slug: "visible", title: "מקור", source: "sod1820", content: "<p>כאן כתובה ירושלים במקור</p>", tags: [] },
    { id: 2, slug: "html-only", title: "תמונה", content: '<img alt="ירושלים">לא מוזכר בגוף', tags: [] },
    { id: 3, slug: "draft", title: "טיוטה", content: "ירושלים", tags: ["טיוטה"] },
  ];
  const client = { from(table) { calls.push(["from", table]);
    const builder = {};
    for (const method of ["select", "or", "ilike", "order"]) builder[method] = (...args) => { calls.push([method, ...args]); return builder; };
    builder.range = async (...args) => { calls.push(["range", ...args]); return { data: rows, count: 3 }; };
    return builder;
  } };
  const page = await searchCorpusContentPage(WORLD_SOURCE_CORPORA[0], "ירושלים", 0, { client });
  assert.deepEqual(page.items.map((item) => item.id), ["1"]);
  assert.match(page.items[0].matchedExcerpt, /ירושלים/);
  assert.equal(Object.hasOwn(page.items[0], "content"), false);
  assert.equal(page.hasMore, false);
  assert.equal(calls.find(([method]) => method === "select").length, 2, "content search does not count all matching HTML on every keystroke");
  assert.equal(calls.filter(([method]) => method === "or").length, 2, "corpus and public draft filters are both applied");
  assert.deepEqual(calls.find(([method]) => method === "ilike").slice(1), ["content", "%ירושלים%"]);
  await assert.rejects(searchCorpusContentPage(WORLD_SOURCE_CORPORA[0], "א", 0, { client }), /invalid_corpus_content_search/);
  await searchCorpusContentPage(WORLD_SOURCE_CORPORA[0], "50%_*,or(status.eq.private)", 0, { client });
  assert.deepEqual(calls.filter(([method]) => method === "ilike").at(-1).slice(1),
    ["content", "%50\\%\\_\\*,or(status.eq.private)%"], "special characters stay in a literal ilike filter");
  await searchCorpusContentPage(WORLD_SOURCE_CORPORA[0], "ירושלים", 1, { client });
  assert.deepEqual(calls.filter(([method]) => method === "range").at(-1).slice(1), [8, 15], "the next bounded page has no gap");
});
