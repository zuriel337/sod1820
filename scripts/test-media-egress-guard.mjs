import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { deferLegacyHtmlMedia, hasEagerLegacyHtmlMedia } from "../src/lib/mediaDelivery.js";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const videoThumb = read("src/lib/videoThumb.js");
const homeRail = read("src/components/HomeOrGeulaRail.jsx");
const storyChip = read("src/components/OrGeulaStoryChip.jsx");
const storyColumn = read("src/components/OrGeulaStoryColumn.jsx");
const legacy = read("src/legacy/legacy.jsx");
const post2029 = read("src/pages/Post2029Page.jsx");
const insight = read("src/components/InsightCard.jsx");
const editor = read("src/pages/PostEditorPage.jsx");
const advancedEditor = read("src/components/AdvancedPostEditor.jsx");
const sitemap = read("api/sitemap.js");
const seo = read("src/lib/seo.js");

const fixture = '<p>x</p><video src="https://example.test/heavy.mp4" preload="metadata" autoplay controls></video><audio src="/a.mp3" preload=auto autoplay></audio>';
assert.equal(hasEagerLegacyHtmlMedia(fixture), true);
const deferred = deferLegacyHtmlMedia(fixture);
assert.equal(hasEagerLegacyHtmlMedia(deferred), false);
assert.match(deferred, /<video[^>]*preload="none"/i);
assert.match(deferred, /<audio[^>]*preload="none"/i);
assert.equal(/\sautoplay(?:\s|=|>)/i.test(deferred), false);

// Client-side derivative generation is forbidden: stale callers must be zero-network.
assert.equal(videoThumb.includes('createElement("video")'), false);
assert.equal(videoThumb.includes('preload = "auto"'), false);
assert.equal(videoThumb.includes("capture-video-thumb"), false);
for (const [name, source] of [
  ["HomeOrGeulaRail", homeRail],
  ["OrGeulaStoryChip", storyChip],
  ["OrGeulaStoryColumn", storyColumn],
]) {
  assert.equal(source.includes("ensureVideoThumbs"), false, name + " must never generate video thumbs on page view");
}

// Every renderer that can expose imported post HTML must defer legacy media.
for (const [name, source] of [
  ["legacy post", legacy],
  ["Post2029", post2029],
  ["InsightCard", insight],
  ["PostEditor", editor],
  ["AdvancedPostEditor", advancedEditor],
]) {
  assert.match(source, /deferLegacyHtmlMedia/, name + " must use the canonical media delivery guard");
}

// Search metadata must not advertise Supabase Storage MP4 bytes as crawler download targets.
assert.equal(sitemap.includes("<video:content_loc>"), false, "sitemap must never advertise raw self-hosted MP4 bytes");
assert.match(sitemap, /<video:player_loc>/, "YouTube video sitemap entries may use player_loc");
assert.match(sitemap, /videoWatchPage/, "self-hosted video watch pages remain normally indexable");
assert.match(seo, /SUPABASE_PUBLIC_STORAGE_RE/);
assert.match(seo, /function seoSafeContentUrl/);
assert.equal(/contentUrl:\s*v\.image_url/.test(seo), false);
assert.equal(/contentUrl:\s*v\.contentUrl\s*\|\|/.test(seo), false);

console.log("Media cached-egress regression guard: PASS");
