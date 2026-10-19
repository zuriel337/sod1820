import test from "node:test";
import assert from "node:assert/strict";
import {
  ALON_5119_SLUG, SHAUL_DAVID_REVIEW_IDS, buildAlon5119OneTreePilot,
} from "../src/lib/research/alon5119OneTreePilot2029.js";

const news = [
  ['12.10.2026', 'Goliath', 'https://apnews.com/article/a9ce45f681772b828f7b5d3c59d010d1'],
  ['14.10.2026', 'נחלת בנימין', 'https://www.mako.co.il/news-israel/2026_q4/Article-38ad1a12e2931a1026.htm'],
  ['14.10.2026', 'קריית גת', 'https://www.mako.co.il/news-israel/2026_q4/Article-e5dbe0d21ed31a1027.htm'],
];
const makePost = (patch = {}) => ({
  id: 5119, slug: ALON_5119_SLUG, source: "ai", tags: ["אלון לוי", "מה קורה הבורא"],
  title: "מה קורה הבורא — גוליית, נחלת בנימין וקריית גת",
  date: "2026-10-16T04:37:48Z",
  content: '<h3>בדיקת האירועים בחדשות</h3><ul>' +
    news.map(([date, term, link]) => `<li><strong>${date}</strong> — ${term} <a href="${link}">מקור</a></li>`).join("") +
    '</ul><h3>שמואל א׳ י״ז</h3><p>תודעת מלכות דוד · אלון לוי</p>',
  ...patch,
});
const video = {
  source_type: "post", source_id: "5119", media_url: "https://cdn.example.org/episode.mp4",
  series_keys: ["mah-kore-habora"], speaker: "אלון לוי", needs_review: false,
  asset_key: "existing-asset-key", video_kind: "selfhost",
};
const archive = SHAUL_DAVID_REVIEW_IDS.map((id) => ({
  id, slug: `historical-${id}`, title: `פוסט היסטורי ${id}`, tags: [],
}));

test("full episode has three independent events, but one post source and no approved Graph edge", () => {
  const result = buildAlon5119OneTreePilot(makePost(), { videoPlacement: video, archivePosts: archive });
  assert.equal(result.available, true);
  assert.equal(result.ready, true);
  assert.equal(result.events.length, 3);
  assert.deepEqual(result.events.map((e) => e.occurredOn), ["2026-10-12", "2026-10-14", "2026-10-14"]);
  assert.ok(result.events.every((e) => e.witness.sourceRef === "posts:5119"));
  assert.ok(result.events.every((e) => e.connectionStatus === "editorial_candidate_not_graph_approved"));
  assert.equal(result.publishedAt, "2026-10-16T04:37:48Z");
  assert.equal(result.sourceUnits.video.assetKey, "existing-asset-key");
  assert.equal(result.sourceUnits.video.seriesKey, "mah-kore-habora");
});

test("a tag or a transcript mention cannot replace the exact news source witness", () => {
  const post = makePost();
  const tampered = makePost({ content: post.content.replace(news[0][2], "https://other.invalid/") });
  const projection = buildAlon5119OneTreePilot(tampered);
  assert.equal(projection.ready, false);
  assert.equal(projection.events.length, 2);
  assert.equal(projection.events.some((e) => e.id === "goliath-georgia"), false);
  const noNewsList = makePost({ content: post.content.replace("<h3>בדיקת האירועים בחדשות</h3>","<h3>רשימה אחרת</h3>") });
  assert.equal(buildAlon5119OneTreePilot(noNewsList).events.length, 0);
});

test("unknown post, draft and hidden content fail closed", () => {
  for (const p of [
    makePost({ id: 101 }),
    makePost({ slug: "different" }),
    makePost({ tags: ["טיוטה"] }),
    makePost({ tags: ["פורום"] }),
    makePost({ home_hidden: true }),
    makePost({ source: "gpt-draft" }),
  ]) {
    assert.equal(buildAlon5119OneTreePilot(p).available, false);
  }
});

test("external video row must be the approved series occurrence, never guessed from the post", () => {
  assert.equal(buildAlon5119OneTreePilot(makePost()).sourceUnits.video, null);
  assert.equal(buildAlon5119OneTreePilot(makePost(), { videoPlacement: { ...video, speaker: "אחר" } }).sourceUnits.video, null);
  assert.equal(buildAlon5119OneTreePilot(makePost(), { videoPlacement: { ...video, source_id: "77" } }).sourceUnits.video, null);
  assert.equal(buildAlon5119OneTreePilot(makePost(), { videoPlacement: { ...video, media_url: "javascript:alert(1)" } }).sourceUnits.video, null);
});

test("curated archive suggestions remain unapproved candidates, excluded when draft", () => {
  const rows = archive.concat([{id:9999,slug:"unrelated",tags:[]}])
    .map((r) => r.id===77 ? {...r,tags:["טיוטה"]} : r);
  const result = buildAlon5119OneTreePilot(makePost(), { archivePosts: rows });
  assert.equal(result.archiveCandidates.length, SHAUL_DAVID_REVIEW_IDS.length-1);
  assert.ok(result.archiveCandidates.every((r) => r.relationStatus === "candidate_needs_exact_source_review"));
  assert.ok(!result.archiveCandidates.some((r) => r.postId===77 || r.postId===9999));
});

test("verified/public calculation and symbolic dates are separate", () => {
  const first = buildAlon5119OneTreePilot(makePost(), { david14Row: {phrase:"דוד",ragil:14,is_verified:true,is_published:false} });
  assert.equal(first.numberUnit.publiclyVerified,false);
  const verified = buildAlon5119OneTreePilot(makePost(), { david14Row: {phrase:"דוד",ragil:14,is_verified:true,is_published:true} });
  assert.equal(verified.numberUnit.publiclyVerified,true);
  assert.equal(verified.numberUnit.dateLinksApproved,false);
  assert.equal(verified.yearHint,undefined);
});
