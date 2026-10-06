import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { topicLabel } from "../src/lib/notifications.js";
import { post2029ReadingInternals as I } from "../src/lib/research/post2029ReadingProjection.js";
import { projectPost2029Experience } from "../src/lib/research/post2029ExperienceProjection.js";
import { canonicalFollowTopic, includesFollowSubject, followTopicAliases } from "../src/lib/followIdentity.js";

const KEY = "10b548b4-ab22-40fc-a12c-5a622434f0bd";
const BASE = `https://x.supabase.co/storage/v1/object/public/media/sod1820/2029/video/2026/10/${KEY}`;
const CONTENT = `<div data-video-key="${KEY}"><p>intro</p>
<video controls poster="${BASE}/derivatives/poster.jpg"><source src="${BASE}/original.mp4" type="video/mp4"><track kind="subtitles" srclang="he" src="${BASE}/captions/he.vtt" default></video>
<h2>השביעי לעשירי — 7 אל 10</h2><p>x</p><h2>2027 לפי היוצר</h2><p>y</p></div>`;
const post = { id: 5116, slug: I.SEVENTH_TENTH_SLUG, date: "2026-10-06 11:01:21+00", content: CONTENT };
const exp = () => projectPost2029Experience({ _experience: I.buildSeventhTenthExperience(post) });
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

test("main spine 233 → 149 → 5116 → 5109; side branches 87/108 stay bounded and separate", () => {
  const e = exp();
  assert.deepEqual(e.trail.map((t) => t.id), ["post-233", "post-149", "post-5116", "post-5109"]);
  assert.deepEqual(e.trail.filter((t) => t.active).map((t) => t.id), ["post-5116"]);
  const spine = e.connections.filter((c) => c.relation === "main_spine").map((c) => c.id);
  const side = e.connections.filter((c) => c.relation === "side_branch").map((c) => c.id);
  assert.deepEqual(spine, ["post-233", "post-149", "post-5109"]);
  assert.deepEqual(side, ["post-87", "post-108"]);
  assert.ok(!e.trail.some((t) => side.includes(t.id)));
});

test("exact-return continuity: every trail/connection href is an existing identity path, no duplicate Post", () => {
  const e = exp();
  const hrefs = [...e.trail, ...e.connections].map((x) => x.href).filter(Boolean);
  assert.ok(hrefs.every((h) => h.startsWith("/")));
  assert.equal(e.trail.find((t) => t.active).href, "/post/" + I.SEVENTH_TENTH_SLUG);
  const ids = Object.values(I.SEVENTH_TENTH_CHAIN).map((c) => c.postId).sort((a, b) => a - b);
  assert.deepEqual(ids, [87, 108, 149, 233, 5109]);
  assert.ok(!ids.includes(5116));
  assert.equal(new Set(e.connections.map((c) => c.id)).size, e.connections.length);
  assert.equal(e.timeline.filter((t) => t.current).length, 1);
});

test("rail connections: numbers and sefirot carry source/provenance and no truth promotion", () => {
  const e = exp();
  for (const id of ["number-7", "number-10", "number-710", "sefira-keter", "sefira-chokhmah", "sefira-binah", "sefira-tiferet"]) {
    const c = e.connections.find((x) => x.id === id);
    assert.ok(c?.provenanceLabel, id);
    assert.equal(c.truthState, "source_stated", id);
  }
  assert.equal(e.connections.find((c) => c.id === "sefira-tiferet").provenanceLabel, "post:5109");
  assert.ok(e.connections.filter((c) => c.relation !== "topic").every((c) => c.truthState === "navigation"));
  assert.ok(e.connections.every((c) => !["verified", "canonical", "fact", "proven"].includes(c.truthState)));
  const src = read("../src/lib/research/post2029ReadingProjection.js");
  assert.match(src, /אינם ציון אמת/);
});

test("media uses canonical source video/poster; hard-coded track removed; transcripts via shared path", () => {
  const e = exp();
  assert.equal(e.media.highlight.src, `${BASE}/original.mp4`);
  assert.equal(e.media.highlight.poster, `${BASE}/derivatives/poster.jpg`);
  assert.equal(e.media.videoKey, KEY);
  const body = I.prepareSeventhTenthContent(CONTENT);
  assert.doesNotMatch(body, /<video|<track|\.vtt/);
  assert.deepEqual(e.media.captionTracks.map((t) => [t.srclang, t.src, t.isDefault]), [["he", `${BASE}/captions/he.vtt`, true]]);
  const mediaSrc = read("../src/components/experience2029/PostEvidenceMedia2029.jsx");
  assert.match(mediaSrc, /<track[\s\S]*srcLang=\{t\.srclang\}/);
  assert.ok(e.followGaps.some((g) => g.kind === "timed_translation_vtt"));
  assert.equal((body.match(/data-source-heading="true"/g) || []).length, 2);
  assert.match(body, /intro/);
  const media = read("../src/components/experience2029/PostEvidenceMedia2029.jsx");
  assert.match(media, /<VideoTranscript videoKey=\{media\.videoKey\}/);
  const vt = read("../src/components/VideoTranscript.jsx");
  assert.match(vt, /getVideoTranscripts\(/);
  for (const l of ["he", "en", "ar", "es", "fr", "ru", "pt", "de"]) assert.match(vt, new RegExp(`\\b${l}: \\{ name`));
  assert.equal(I.extractSourceVideo("<p>no video</p>"), null);
});

test("follow: exactly 710 + category + author, topics derived server-style, compatible with follow engine/topicLabel", () => {
  const e = exp();
  assert.deepEqual(e.follow.map((f) => f.topic), ["number:710", "cat:מימד חמש", "author:מדריך לריפוי 10 הספירות"]);
  assert.ok(!e.follow.some((f) => ["number:7", "number:10"].includes(f.topic)));
  assert.ok(e.follow.every((f) => I.FOLLOW_RESOLVABLE_ENTITY_TYPES.includes(f.entityType)));
  assert.ok(e.follow.every((f) => f.topic === canonicalFollowTopic(f.topic)));
  assert.ok(includesFollowSubject(["num_710"], "number:710"));
  assert.ok(includesFollowSubject(["category:מימד חמש"], e.follow[1].topic));
  assert.ok(followTopicAliases(e.follow[1].topic).includes("cat:מימד חמש"));
  for (const f of e.follow) assert.ok(topicLabel(f.topic), f.topic);
  assert.deepEqual(e.followGaps.map((g) => g.kind).sort(), ["chain", "concept", "event", "post", "timed_translation_vtt"]);
  // topic is re-derived from entityType+stableId for every resolver type, never trusted from the caller
  const d = (entityType, stableId) => projectPost2029Experience({ _experience: { follow: [{ entityType, stableId, topic: "evil:topic" }] } }).follow?.[0]?.topic;
  assert.equal(d("number", "7"), "number:7");
  assert.equal(d("author", "X"), "author:X");
  assert.equal(d("category", "מימד חמש"), "cat:מימד חמש");
  assert.equal(d("cipher_feed", "any"), "codes:new");
  assert.equal(d("reality_stream", "any"), "stream:reality");
  assert.equal(d("media_channel", "orgeula"), "channel:or-geula");
  assert.equal(d("channel", "or_geula"), "channel:or-geula");
  assert.equal(d("channel", "foo"), "channel:foo");
  assert.equal(d("post", "5116"), undefined);
  assert.equal(d("concept", "keter"), undefined);
  const page = read("../src/pages/Post2029Page.jsx");
  assert.match(page, /<WatchButton\s[^>]*topic=\{item\.topic\}/);
  assert.doesNotMatch(page, /post2029_follow|localStorage\.setItem\([^)]*follow/i);
  // no Personal Area duplicate: existing UserCenter FollowingPanel is the projection
  assert.match(read("../src/components/userCenter/UserCenter.jsx"), /topicLabel/);
});
