import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  canonicalSourceSubjectCards,
  filterPublicSourceSubjects,
  publicSourceSubjectCategories,
  fetchPublicSourceSubjectIndex,
} from "../src/lib/research/worldPublicSourceSubjects2029.js";
import { readableSourceTitle } from "../src/lib/research/contributorFindingsProjection.js";

test("Zvi's approved topics and Hashmal public posts keep DISTINCT identities", () => {
  const cards = canonicalSourceSubjectCards({
    zviTopics: [{ id: "t1", slug: "zvi-topic", title: "שערי חכמה", approved_at: "2026-10-01" }],
    hashmalPosts: [{ id: 8, slug: "source-8", title: "שערי חכמה", categories: ["סוד החשמל", "תיעוד אירועים"] }],
  });
  assert.equal(cards.length, 2);
  assert.deepEqual(cards.map((c) => c.type), ["approved_topic", "source_post"]);
  assert.equal(cards[0].href, "/topic/zvi-topic");
  assert.equal(cards[1].href, "/post/source-8");
  assert.deepEqual(cards[1].categories, ["תיעוד אירועים"]);
  assert.equal(filterPublicSourceSubjects(cards, { origin: "hashmal" }).length, 1);
  assert.equal(filterPublicSourceSubjects(cards, { category: "תיעוד אירועים" }).length, 1);
  assert.equal(publicSourceSubjectCategories(cards)[0].count, 1);
});

test("all pages are read using existing public readers, without silent first-page cutoff", async () => {
  const calls = [];
  const out = await fetchPublicSourceSubjectIndex({
    topicReader: async ({ offset, limit, creator }) => {
      calls.push(["topic", offset, creator]);
      assert.equal(creator, "צבי (OPOC)");
      assert.equal(limit, 60);
      const n = offset === 0 ? 60 : 18;
      return { rows: Array.from({ length: n }, (_, i) => ({ id: String(offset + i + 1), slug: `z-${offset + i + 1}`, title: `צבי ${offset + i + 1}` })), total: 78, hasMore: offset === 0 };
    },
    corpusReader: async (spec, page) => {
      calls.push(["hashmal", page, spec.key]);
      const n = page < 5 ? 24 : 11;
      return { items: Array.from({ length: n }, (_, i) => ({ id: `p-${page}-${i}`, slug: `p-${page}-${i}`, title: "תיעוד מקור", categories: ["סוד החשמל"] })), total: 131, hasMore: page < 5 };
    },
  });
  assert.equal(out.cards.length, 209);
  assert.deepEqual(out.totals, { zvi: 78, hashmal: 131 });
  assert.equal(out.incomplete, false);
  assert.equal(calls.filter(([type]) => type === "topic").length, 2);
  assert.equal(calls.filter(([type]) => type === "hashmal").length, 6);
});

test("media-only source and generic placeholder never become title 'מקור ללא טקסט'", () => {
  assert.equal(readableSourceTitle({ text: "📷 עדכון", imageUrl: "https://example.com/photo.jpg" }), "תמונה מהמקור");
  assert.equal(readableSourceTitle({ text: "🎬 עדכון וידאו", imageUrl: "https://example.com/movie.mp4" }), "סרטון מהמקור");
  assert.equal(readableSourceTitle({ text: "נושא ברור\nשורה נוספת" }), "נושא ברור");
  assert.equal(readableSourceTitle(null), "עדכון מהמקור");
});

test("topic browse is on BOTH World layouts and avoids raw research-source words", () => {
  const world = readFileSync(new URL("../src/pages/World2029Page.jsx", import.meta.url), "utf8");
  assert.equal((world.match(/<WorldPublicSourceSubjects2029 \/>/g) || []).length, 2);
  const ui = readFileSync(new URL("../src/components/research/ContributorFindingsLens.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(ui, /פרסום מקור אינו אימות מחקרי|מקור ללא טקסט שמור/);
  assert.match(ui, /sod29-contributor-public-media/);
});
