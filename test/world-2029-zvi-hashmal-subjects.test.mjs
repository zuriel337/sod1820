import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  canonicalSourceSubjectCards, filterPublicSourceSubjects, fetchPublicSourceSubjectIndex,
} from "../src/lib/research/worldPublicSourceSubjects2029.js";
import { readableSourceTitle } from "../src/lib/research/contributorFindingsProjection.js";

test("only approved Topic identities are subjects; Hashmal post is a source work", () => {
  const cards = canonicalSourceSubjectCards({
    zviTopics: [{ id: "t1", slug: "zvi-topic", title: "שער נון", approved_at: "2026-10-01", numbers: [1234] }],
    hashmalPosts: [{ id: 8, slug: "source-8", title: "שער נון", categories: ["סוד החשמל", "גימטריות"] }],
  });
  assert.equal(cards.length, 2);
  assert.deepEqual(cards.map((c) => c.type), ["approved_topic", "source_work"]);
  assert.equal(cards[0].href, "/topic/zvi-topic");
  assert.equal(cards[1].href, "/post/source-8");
  assert.equal(cards[1].linkedTopicSlugs.length, 0);
  assert.ok(!Object.hasOwn(cards[1], "categories"));
  assert.equal(filterPublicSourceSubjects(cards, { origin: "hashmal" }).length, 1);
  assert.equal(filterPublicSourceSubjects(cards, { query: "1234" }).length, 1);
});

test("the 78 approved Zvi Topics stay a ranked subset of 205 Topics; 132 source rows stay separate", async () => {
  const calls = [];
  const out = await fetchPublicSourceSubjectIndex({
    topicReader: async ({ offset, limit, creator, rankByMeterScore }) => {
      calls.push(["topic", offset, creator, rankByMeterScore]);
      assert.equal(rankByMeterScore, true);
      if (!creator) return { rows: [{ id: "all-1" }], total: 205, hasMore: true };
      assert.equal(creator, "צבי (OPOC)");
      assert.equal(limit, 60);
      const n = offset === 0 ? 60 : 18;
      return { rows: Array.from({ length: n }, (_, i) => ({
        id: String(offset + i + 1), slug: `z-${offset + i + 1}`, title: `צבי ${offset + i + 1}`,
        meter_score: 100 - offset - i,
      })), total: 78, hasMore: offset === 0 };
    },
    corpusReader: async (spec, page) => {
      calls.push(["source", page, spec.key]);
      const n = page < 5 ? 24 : 12;
      return { items: Array.from({ length: n }, (_, i) => ({
        id: `p-${page}-${i}`, slug: `p-${page}-${i}`, title: "פרסום מקור",
      })), total: 132, hasMore: page < 5 };
    },
  });
  assert.equal(out.cards.length, 210);
  assert.deepEqual(out.totals, { allTopics: 205, zvi: 78, hashmal: 132 });
  assert.deepEqual(out.available, { allTopics: true, zvi: true, hashmal: true });
  assert.equal(out.cards[0].meterScore, 100);
  assert.equal(out.incomplete, false);
  assert.equal(out.contentProjection.metrics.corpusSources, 132, "only Hashmal source identities count as sources in this legacy bridge");
  assert.equal(out.contentProjection.metrics.legacyTopics, 78);
  assert.equal(out.contentProjection.metrics.findings, null);
  assert.equal(out.contentProjection.sources[0].sourceRef, "posts:p-0-0");
  assert.deepEqual(out.contentProjection.seriesCategories, [{
    key: "sod-hashmal-publications", kind: "series", label: "פרסומי סוד החשמל",
    sourceRefs: out.contentProjection.sources.map((item) => item.sourceRef),
  }]);
  assert.equal(out.contentProjection.metrics.seriesCategories, 1);
  assert.equal(calls.filter(([type]) => type === "topic").length, 3);
  assert.equal(calls.filter(([type]) => type === "source").length, 6);
});

test("one unavailable source reader never turns unknown inventory into zero", async () => {
  const out = await fetchPublicSourceSubjectIndex({
    topicReader: async () => { throw new Error("unavailable"); },
    corpusReader: async () => ({ items: [{ id: "8", slug: "a", title: "המקור" }], total: 1, hasMore: false }),
  });
  assert.deepEqual(out.totals, { allTopics: null, zvi: null, hashmal: 1 });
  assert.deepEqual(out.available, { allTopics: false, zvi: false, hashmal: true });
  assert.equal(out.cards.length, 1);
  assert.equal(out.contentProjection.metrics.corpusSources, 1);
  assert.equal(out.contentProjection.metrics.legacyTopics, null);
});

test("media-only source does not show empty technical title", () => {
  assert.equal(readableSourceTitle({ text: "📷 עדכון", imageUrl: "https://example.com/photo.jpg" }), "תמונה מהמקור");
  assert.equal(readableSourceTitle({ text: "🎬 עדכון וידאו", imageUrl: "https://example.com/movie.mp4" }), "סרטון מהמקור");
  assert.equal(readableSourceTitle({ text: "נושא ברור\nשורה נוספת" }), "נושא ברור");
  assert.equal(readableSourceTitle(null), "עדכון מהמקור");
});

test("the single public World layout uses one category-free subject reader and keeps sources separate", () => {
  const world = readFileSync(new URL("../src/pages/World2029Page.jsx", import.meta.url), "utf8");
  assert.equal((world.match(/<WorldPublicSourceSubjects2029\s+peopleIndex=\{landing\.contributors\}\s*\/>/g) || []).length, 1);
  assert.doesNotMatch(world, /<WorldSourceDepth|sourceDepthOpen/);
  const ui = readFileSync(new URL("../src/components/research/WorldPublicSourceSubjects2029.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(ui, /קטגוריות סוד החשמל|publicSourceSubjectCategories|category ===/);
  assert.match(ui, /מפת החומר הציבורי/);
  assert.match(ui, /id="world-public-content-map"/);
  assert.match(ui, /אנשים ציבוריים/);
  assert.match(ui, /מקורות שנטענו בעדשה זו/);
  assert.match(ui, /נושאים קיימים בעץ/);
  assert.match(ui, /נושאי צבי נשארים תת־קבוצה/);
  assert.match(ui, /סדרת מקורות · סוד החשמל/);
  assert.match(ui, /חוזק תצוגה:.*טרם דורג/);
  const reader = readFileSync(new URL("../src/lib/research/worldPublicSourceSubjects2029.js", import.meta.url), "utf8");
  assert.doesNotMatch(reader, /posts\.categories|\.map\(.*categories|category\s*=/);
  const source = readFileSync(new URL("../src/components/research/ContributorFindingsLens.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /פרסום מקור אינו אימות מחקרי|מקור ללא טקסט שמור/);
  assert.match(source, /contributor-structured-sort/);
  assert.match(source, /בלי להסיק קטגוריה מהטקסט/);
  assert.match(source, /contributor-admin-triage-links/);
  assert.match(source, /החזקים שמומלצים לעץ/);
  assert.match(world, /<WorldPeopleSources2029/);
  assert.doesNotMatch(world, /canReview=\{isAdmin\}/, "the public people/source lens is identical for guest and admin");
});
