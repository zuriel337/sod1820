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

test("the 78 approved Topic and 132 public source rows are paged completely", async () => {
  const calls = [];
  const out = await fetchPublicSourceSubjectIndex({
    topicReader: async ({ offset, limit, creator }) => {
      calls.push(["topic", offset, creator]);
      assert.equal(creator, "צבי (OPOC)");
      assert.equal(limit, 60);
      const n = offset === 0 ? 60 : 18;
      return { rows: Array.from({ length: n }, (_, i) => ({
        id: String(offset + i + 1), slug: `z-${offset + i + 1}`, title: `צבי ${offset + i + 1}`,
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
  assert.deepEqual(out.totals, { zvi: 78, hashmal: 132 });
  assert.deepEqual(out.available, { zvi: true, hashmal: true });
  assert.equal(out.incomplete, false);
  assert.equal(calls.filter(([type]) => type === "topic").length, 2);
  assert.equal(calls.filter(([type]) => type === "source").length, 6);
});

test("one unavailable source reader never turns unknown inventory into zero", async () => {
  const out = await fetchPublicSourceSubjectIndex({
    topicReader: async () => { throw new Error("unavailable"); },
    corpusReader: async () => ({ items: [{ id: "8", slug: "a", title: "המקור" }], total: 1, hasMore: false }),
  });
  assert.deepEqual(out.totals, { zvi: null, hashmal: 1 });
  assert.deepEqual(out.available, { zvi: false, hashmal: true });
  assert.equal(out.cards.length, 1);
});

test("media-only source does not show empty technical title", () => {
  assert.equal(readableSourceTitle({ text: "📷 עדכון", imageUrl: "https://example.com/photo.jpg" }), "תמונה מהמקור");
  assert.equal(readableSourceTitle({ text: "🎬 עדכון וידאו", imageUrl: "https://example.com/movie.mp4" }), "סרטון מהמקור");
  assert.equal(readableSourceTitle({ text: "נושא ברור\nשורה נוספת" }), "נושא ברור");
  assert.equal(readableSourceTitle(null), "עדכון מהמקור");
});

test("the single public World layout uses one category-free subject reader and keeps sources separate", () => {
  const world = readFileSync(new URL("../src/pages/World2029Page.jsx", import.meta.url), "utf8");
  assert.equal((world.match(/<WorldPublicSourceSubjects2029 \/>/g) || []).length, 1);
  assert.doesNotMatch(world, /<WorldSourceDepth|sourceDepthOpen/);
  const ui = readFileSync(new URL("../src/components/research/WorldPublicSourceSubjects2029.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(ui, /קטגוריות סוד החשמל|publicSourceSubjectCategories|category ===/);
  assert.match(ui, /מקורות סוד החשמל/);
  assert.match(ui, /נושאי צבי מאושרים/);
  assert.match(ui, /פרסומי סוד החשמל/);
  assert.match(ui, /ממצאי המחקר של צבי נספרים וממוינים בנפרד/);
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
