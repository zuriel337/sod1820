import assert from "node:assert/strict";
import fs from "node:fs";
import {
  extractTikTokMediaCandidatesFromHtml,
  extractTikTokVideoId,
  fetchFollowingAllowedRedirects,
  fetchTikTokMedia,
  isAllowedTikTokMediaUrl,
  isTikTokPageUrl,
  mediaFetchHeaders,
  resolveTikTokSource,
} from "../supabase/functions/_shared/tiktokSourceResolver.js";

assert.equal(isTikTokPageUrl("https://vt.tiktok.com/ZSqPf4qb4/"), true);
assert.equal(isTikTokPageUrl("https://vm.tiktok.com/abc/"), true);
assert.equal(isTikTokPageUrl("https://example.com/video/123"), false);
assert.equal(extractTikTokVideoId("https://www.tiktok.com/@x/video/7551234567890123456"), "7551234567890123456");
assert.equal(isAllowedTikTokMediaUrl("https://v16-webapp-prime.us.tiktok.com/video/tos/a.mp4"), true);
assert.equal(isAllowedTikTokMediaUrl("https://evil.example/video.mp4"), false);

const universal = JSON.stringify({
  __DEFAULT_SCOPE__: {
    "webapp.video-detail": {
      itemInfo: {
        itemStruct: {
          music: {
            playUrl: "https://v58.tiktokcdn.com/audio/wrong.mp3",
          },
          video: {
            playAddr: "https://v16-webapp-prime.us.tiktok.com/video/tos/a.mp4",
            downloadAddr: "https://v16-webapp-prime.us.tiktok.com/video/tos/b.mp4",
          },
        },
      },
    },
  },
});
const universalHtml = `<html><script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">${universal}</script></html>`;
const candidates = extractTikTokMediaCandidatesFromHtml(universalHtml);
assert.equal(candidates.length, 3);
assert.match(candidates[0].url, /a\.mp4$/);
assert.equal(candidates.some((candidate) => /b\.mp4$/.test(candidate.url)), true);

function mockResponse({
  status = 200,
  url = "https://www.tiktok.com/@x/video/7551234567890123456",
  type = "text/html",
  text = "",
  json = null,
  headers = {},
}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    url,
    headers: new Headers({ "content-type": type, ...headers }),
    text: async () => text,
    json: async () => json,
  };
}

const pageOnlyFetch = async (url) => {
  if (String(url).includes("/api/item/detail/")) return mockResponse({ status: 404, type: "application/json" });
  return mockResponse({
    text: universalHtml,
    headers: { "set-cookie": "tt_session=test-cookie; Path=/; Secure" },
  });
};
const resolved = await resolveTikTokSource("https://vt.tiktok.com/ZSqPf4qb4/", pageOnlyFetch);
assert.equal(resolved.kind, "tiktok");
assert.equal(resolved.platformVideoId, "7551234567890123456");
assert.match(resolved.mediaUrl, /a\.mp4$/);
assert.equal(resolved.mediaCandidates.length, 2);
assert.equal(resolved.mediaCandidates.some((candidate) => /music/i.test(candidate.source)), false);
assert.equal(resolved.requestCookie, "tt_session=test-cookie");
assert.equal(mediaFetchHeaders(resolved).Cookie, "tt_session=test-cookie");

const apiFallbackFetch = async (url) => {
  if (String(url).includes("/api/item/detail/")) {
    return mockResponse({
      type: "application/json",
      json: { itemInfo: { itemStruct: { video: { playAddr: "https://v16-webapp-prime.us.tiktok.com/video/tos/api.mp4" } } } },
    });
  }
  return mockResponse({ text: "<html>no inline media</html>" });
};
const apiResolved = await resolveTikTokSource("https://www.tiktok.com/@x/video/7551234567890123456", apiFallbackFetch);
assert.match(apiResolved.mediaUrl, /api\.mp4$/);

const mergedCandidateFetch = async (url) => {
  if (String(url).includes("/api/item/detail/")) {
    return mockResponse({
      type: "application/json",
      json: { itemInfo: { itemStruct: { video: { playAddrH264: "https://v16-webapp-prime.us.tiktok.com/video/tos/h264.mp4" } } } },
    });
  }
  return mockResponse({ text: universalHtml });
};
const mergedResolved = await resolveTikTokSource("https://www.tiktok.com/@x/video/7551234567890123456", mergedCandidateFetch);
assert.equal(mergedResolved.mediaCandidates.some((candidate) => /h264\.mp4$/.test(candidate.url)), true);

const poisonedHtml = `<script id="SIGI_STATE" type="application/json">${JSON.stringify({ ItemModule: { x: { video: { playAddr: "https://evil.example/a.mp4" } } } })}</script>`;
const poisonedFetch = async () => mockResponse({ text: poisonedHtml });
await assert.rejects(
  () => resolveTikTokSource("https://vt.tiktok.com/ZSqPf4qb4/", poisonedFetch),
  /tiktok_media_not_found/,
);


const pageRedirectFetch = async (url) => {
  if (String(url).startsWith("https://vt.tiktok.com/")) {
    return mockResponse({
      status: 302,
      url: String(url),
      headers: { location: "https://evil.example/steal" },
    });
  }
  throw new Error("must not fetch rejected redirect target");
};
await assert.rejects(
  () => fetchFollowingAllowedRedirects(
    "https://vt.tiktok.com/ZSqPf4qb4/",
    pageRedirectFetch,
    {},
    isTikTokPageUrl,
    "tiktok_page",
  ),
  /tiktok_page_redirect_host_rejected/,
);

const mediaResolution = {
  kind: "tiktok",
  mediaUrl: "https://v16-webapp-prime.us.tiktok.com/video/tos/a.mp4",
  resolvedPageUrl: "https://www.tiktok.com/@x/video/7551234567890123456",
};
const mediaRedirectFetch = async (url) => {
  if (String(url).includes("tiktok.com")) {
    return mockResponse({
      status: 302,
      url: String(url),
      type: "video/mp4",
      headers: { location: "https://evil.example/video.mp4" },
    });
  }
  throw new Error("must not fetch rejected media redirect target");
};
await assert.rejects(
  () => fetchTikTokMedia(mediaResolution, mediaRedirectFetch),
  /tiktok_media_redirect_host_rejected/,
);

const migrateSource = fs.readFileSync(new URL("../supabase/functions/video-migrate/index.ts", import.meta.url), "utf8");
assert.match(migrateSource, /resolveTikTokSource/);
assert.match(migrateSource, /tiktok_resolve_failed/);
assert.match(migrateSource, /fetchTikTokMedia/);
assert.match(migrateSource, /resolved_media_host_rejected/);
assert.match(migrateSource, /source_not_video_html/);
assert.match(migrateSource, /source_not_video_audio/);
assert.match(migrateSource, /attempted_candidates/);
assert.match(migrateSource, /mediaCandidates/);
assert.match(migrateSource, /public_url/);
assert.match(migrateSource, /kind: "direct"/);
assert.doesNotMatch(migrateSource, /resp\\.arrayBuffer\\(\\)/);
assert.match(migrateSource, /uploadStreamToStorage/);
assert.match(migrateSource, /TransformStream/);
assert.match(migrateSource, /source_too_large/);
assert.match(migrateSource, /deleteFromStorage/);

console.log("PASS video-migrate TikTok resolver + direct-source compatibility guards");