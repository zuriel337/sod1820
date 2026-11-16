import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// PLAN37 §32.2 — the REAL media classification (ZURIEL / POST_VIDEO_CLASSIFICATION_PLAN_CHECK_20261116): "posts that contain video" and "all videos" on the EXISTING media views,
// no new store, no dependence on the legacy "וידאו" category, every post re-admitted through the public boundary.
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const libSource = read("src/lib/research/postsVideoLibrary2029.js");
const lib = libSource.split("\n").filter((line) => !/^\s*\/\//.test(line)).join("\n");   // code only: the comments explain WHY the category is not used
const page = read("src/pages/Posts2029Page.jsx");
const classification = read("src/lib/research/postsCatalog2029Projection.js");
const taxonomy = read("src/lib/research/postsTaxonomy2029Route.js");

test("the library reads the existing public media views and never the legacy category or a manual tag", () => {
  assert.match(lib, /from\("video_media_placements_v1"\)/);
  assert.doesNotMatch(lib, /overlaps|\.(?:eq|in|contains|ilike|filter)\("(?:categories|tags)"|"וידאו"/, "no category / tag FILTER in the reader (the columns are only read for the public-boundary check)");
  assert.match(lib, /publicPostOnlyFilter\(\)/, "every post is re-admitted through the public post boundary");
  assert.match(lib, /hasSuppressedPublicPostTag/);
  assert.doesNotMatch(lib, /\.insert\(|\.update\(|\.upsert\(|\.rpc\(/, "read-only");
  assert.match(lib, /PLAYABLE_KINDS = Object\.freeze\(\["selfhost", "youtube", "vimeo"\]\)/);
});

test("the posts list offers the two named scopes and the media view is noindex and does not replace the catalog's own scopes", () => {
  assert.match(page, /postsMediaScope2029\(searchParams\)/);
  assert.match(page, /\["category", "tag", "series"\]\.some\(\(name\) => searchParams\.has\(name\)\)/);
  assert.match(page, /\(searchParams\.get\("q"\) \|\| ""\)\.trim\(\)/, "an empty q= is not a selection");
  assert.match(page, /data-posts-media-state="unsupported-combination"/, "a media view combined with another selection is an explicit state, never a list that ignores part of the address");
  assert.doesNotMatch(page, /media\.active && !other \?/, "the old silent fall-through to the catalog is gone");
  assert.match(page, /noindex: true/);
  assert.match(page, /פוסטים עם וידאו/);
  assert.match(page, /כל הסרטונים/);
  assert.match(page, /סרטונים שמופיעים רק בערוצים נפתחים במקורם/, "the scope of the library is stated to the reader");
  assert.match(page, /\/or-geula/, "the channel videos keep their own entrance");
});

test("the legacy category entrance keeps its results and links to the real media views; the media chip comes from the media itself", () => {
  assert.match(taxonomy, /mediaLinks: legacyVideo/);
  assert.match(page, /scope\.mediaLinks/);
  assert.match(classification, /postHasVideoMedia2029/);
  assert.match(classification, /role: "media-type"/);
});
