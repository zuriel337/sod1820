import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import handler from "../api/og.js";
import sitemapHandler from "../api/sitemap.js";
import { loadPublicSitemapAdapter } from "../test/fixtures/public-sitemap-adapter.mjs";
import { PUBLIC_READING_PROFILE_ID } from "../src/lib/publicReadingRelease2029.js";

function makeRes() {
  return {
    headers: new Map(),
    statusCode: null,
    body: null,
    setHeader(k, v) { this.headers.set(String(k).toLowerCase(), v); },
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = String(body); return this; },
  };
}

async function renderResponse(path, fetchImpl, query = {}) {
  const prev = globalThis.fetch;
  globalThis.fetch = fetchImpl || (async () => { throw new Error("unexpected fetch"); });
  try {
    const res = makeRes();
    await handler({ query: { path, ...query } }, res);
    assert.equal(res.statusCode, 200);
    return res;
  } finally {
    globalThis.fetch = prev;
  }
}

async function render(path, fetchImpl, query = {}) {
  return (await renderResponse(path, fetchImpl, query)).body;
}

function withOpenLaunchFlag(key, fetchImpl) {
  return async (url, options) => {
    if (String(url).includes('/site_flags?')) {
      return { ok: true, json: async () => [{ key, enabled: false, mode: 'all' }] };
    }
    if (!fetchImpl) throw new Error('unexpected data fetch: ' + url);
    return fetchImpl(url, options);
  };
}


const homeSearchCrawler = await renderResponse("/", async () => {
  throw new Error("home server document must not require Supabase fetch");
}, { crawler: "search" });
assert.match(homeSearchCrawler.body, /canonical" href="https:\/\/sod1820\.co\.il"/);
assert.equal(homeSearchCrawler.headers.get("x-robots-tag"), "index, follow");
assert.doesNotMatch(homeSearchCrawler.body, /http-equiv="refresh"/);

const number = await render("/2029/number/123", withOpenLaunchFlag("lock_number"));
assert.match(number, /<meta name="robots" content="noindex, nofollow"\/>/);
assert.match(number, /123 · דף המספר 2029/);
assert.match(number, /og:type" content="website"/);
assert.equal(number.includes('"@type":"Article"'), false);

let researcherFetches = [];
const researcher = await render("/researcher/admin-only", withOpenLaunchFlag("lock_world", async (url) => {
  researcherFetches.push(String(url));
  throw new Error("native researcher OG must not fetch corpus or contributor data");
}));
assert.match(researcher, /<meta name="robots" content="noindex, nofollow"\/>/);
assert.match(researcher, /קורפוס חוקר/);
assert.equal(researcherFetches.length, 0);

const topic = await render("/topic/98-test", withOpenLaunchFlag("lock_world", async (url) => {
  const u = String(url);
  if (u.includes("/topic_cards_public?")) {
    return {
      ok: true,
      async json() {
        return [{ title: "בדיקת התכנסות", subtitle: "תיאור ציבורי", image_ids: [], highlight_numbers: [98, 138] }];
      },
    };
  }
  throw new Error("unexpected topic fetch: " + u);
}));
assert.match(topic, /og:type" content="website"/);
assert.match(topic, /"@type":"WebPage"/);
assert.match(topic, /"@type":"BreadcrumbList"/);
assert.equal(topic.includes('"@type":"Article"'), false);

const topicSearchCrawler = await renderResponse("/topic/98-test", withOpenLaunchFlag("lock_world", async (url) => {
  const u = String(url);
  if (u.includes("/topic_cards_public?")) {
    return {
      ok: true,
      async json() {
        return [{ title: "בדיקת התכנסות", subtitle: "תיאור ציבורי", image_ids: [], highlight_numbers: [98, 138] }];
      },
    };
  }
  throw new Error("unexpected topic fetch: " + u);
}), { crawler: "search" });
assert.match(topicSearchCrawler.body, /<link rel="canonical" href="https:\/\/sod1820\.co\.il\/topic\/98-test"\/>/);
assert.match(topicSearchCrawler.body, /"@type":"WebPage"/);
assert.doesNotMatch(topicSearchCrawler.body, /http-equiv="refresh"/);
assert.equal(topicSearchCrawler.headers.get("x-robots-tag"), "index, follow");
assert.equal(topicSearchCrawler.headers.get("vary"), "User-Agent");

const postSearchCrawler = await renderResponse("/post/demo-2029", async (url) => {
  const u = String(url);
  if (u.includes("/posts?slug=eq.demo-2029")) {
    return {
      ok: true,
      async json() {
        return [{
          id: 900001,
          slug: "demo-2029",
          source: "ai",
          title: "פוסט 2029",
          excerpt: "תיאור פוסט",
          content: "<p>מקור</p>",
          image_url: null,
          date: "2026-09-28T08:00:00+00:00",
          modified: "2026-09-28T09:00:00+00:00",
          tags: [],
          categories: ["מחקר"],
          author: "SOD1820",
        }];
      },
    };
  }
  throw new Error("unexpected 2029 post fetch: " + u);
}, { crawler: "search" });
assert.match(postSearchCrawler.body, /canonical" href="https:\/\/sod1820\.co\.il\/post\/demo-2029"/);
assert.match(postSearchCrawler.body, /"@type":"Article"/);
assert.equal(postSearchCrawler.headers.get("x-robots-tag"), "index, follow");
assert.doesNotMatch(postSearchCrawler.body, /http-equiv="refresh"/);

const videoId = "0123456789abcdef0123456789abcdef";
const videoSearchCrawler = await renderResponse(`/video/${videoId}`, async (url) => {
  const u = String(url);
  if (u.includes("/video_media_assets_v1?")) {
    return {
      ok: true,
      async json() {
        return [{
          public_id: videoId,
          title: "סרטון 2029",
          video_kind: "selfhost",
          media_url: "https://example.test/video.mp4",
          youtube_id: null,
          poster_url: "https://example.test/poster.jpg",
          thumb_url: "https://example.test/thumb.jpg",
          topics: ["מחקר"],
          google_indexable: true,
          first_seen_at: "2026-09-28T08:00:00+00:00",
          last_seen_at: "2026-09-28T09:00:00+00:00",
        }];
      },
    };
  }
  throw new Error("unexpected 2029 video fetch: " + u);
}, { crawler: "search" });
assert.match(videoSearchCrawler.body, new RegExp(`canonical" href="https:\\\/\\\/sod1820\\.co\\.il\\/video\\/${videoId}"`));
assert.match(videoSearchCrawler.body, /"@type":"VideoObject"/);
assert.equal(videoSearchCrawler.headers.get("x-robots-tag"), "index, follow");
assert.doesNotMatch(videoSearchCrawler.body, /http-equiv="refresh"/);
assert.ok(videoSearchCrawler.body.includes('"contentUrl":"https://example.test/video.mp4"'));
assert.ok(videoSearchCrawler.body.includes('property="og:video" content="https://example.test/video.mp4"'));

const videoSocialCrawler = await renderResponse(`/video/${videoId}`, async (url) => {
  const u = String(url);
  if (u.includes("/video_media_assets_v1?")) {
    return {
      ok: true,
      async json() {
        return [{
          public_id: videoId,
          title: "סרטון 2029",
          video_kind: "selfhost",
          media_url: "https://example.test/video.mp4",
          youtube_id: null,
          poster_url: "https://example.test/video.mp4",
          thumb_url: "https://example.test/video.mp4",
          topics: ["מחקר"],
          google_indexable: true,
          first_seen_at: "2026-09-28T08:00:00+00:00",
          last_seen_at: "2026-09-28T09:00:00+00:00",
        }];
      },
    };
  }
  throw new Error("unexpected social video fetch: " + u);
});
assert.doesNotMatch(videoSocialCrawler.body, /property="og:video"/);
assert.doesNotMatch(videoSocialCrawler.body, /"contentUrl":/);
assert.doesNotMatch(videoSocialCrawler.body, /og:image" content="https:\/\/example\.test\/video\.mp4"/);
assert.doesNotMatch(videoSocialCrawler.body, /"thumbnailUrl":\["https:\/\/example\.test\/video\.mp4"\]/);



const legacyNumberSearchCrawler = await renderResponse("/number/1237", withOpenLaunchFlag("lock_number", async (url) => {
  const u = String(url);
  if (u.includes("/number_anchors?")) {
    return {
      ok: true,
      async json() {
        return [{ fact: "עוגן 1237", hint: "תיאור קצר" }];
      },
    };
  }
  throw new Error("unexpected legacy number fetch: " + u);
}), { crawler: "search" });
assert.match(legacyNumberSearchCrawler.body, /canonical" href="https:\/\/sod1820\.co\.il\/number\/1237"/);
assert.match(legacyNumberSearchCrawler.body, /עוגן 1237/);
assert.equal(legacyNumberSearchCrawler.headers.get("x-robots-tag"), "index, follow");
assert.doesNotMatch(legacyNumberSearchCrawler.body, /http-equiv="refresh"/);

const elsLocked = await render("/els", async (url) => {
  const u = String(url);
  if (u.includes("/site_flags?")) {
    return {
      ok: true,
      async json() {
        return [{ key: "lock_els", enabled: true, mode: "all", message: "ELS סגור לבדיקה" }];
      },
    };
  }
  throw new Error("unexpected ELS fetch: " + u);
});
assert.match(elsLocked, /ELS סגור לבדיקה/);
assert.doesNotMatch(elsLocked, /מחקר דילוגי אותיות מעל מנוע ELS קנוני אחד/);

const elsFailClosed = await render("/els", async () => { throw new Error("flag unavailable"); });
assert.match(elsFailClosed, /ELS סגור זמנית לציבור לצורך בנייה מחדש/);
assert.doesNotMatch(elsFailClosed, /מחקר דילוגי אותיות מעל מנוע ELS קנוני אחד/);
const codeOpen = await renderResponse("/code", async (url) => {
  assert.match(String(url), /site_flags\?/);
  return { ok: true, async json() { return [{ key: "lock_els", enabled: false, mode: "all" }]; } };
}, { crawler: "search" });
assert.match(codeOpen.body, /<link rel="canonical" href="https:\/\/sod1820\.co\.il\/code"\/>/);
assert.match(codeOpen.body, /חיפוש צפנים בתנ״ך, מטריצות וממצאים שמורים/);
const elsAlias = await renderResponse("/els", async () => ({ ok: true, async json() { return [{ key: "lock_els", enabled: false, mode: "all" }]; } }), { crawler: "search" });
assert.match(elsAlias.body, /<link rel="canonical" href="https:\/\/sod1820\.co\.il\/code"\/>/);

for (const path of ["/heichal", "/היכל"]) {
  const closed = await renderResponse(path, async (url) => {
    assert.match(String(url), /site_flags\?/);
    return { ok: true, async json() { return [{ key: "lock_heichal", enabled: true, mode: "all", message: "ההיכל סגור לבדיקה" }]; } };
  }, { crawler: "search" });
  assert.match(closed.body, /ההיכל סגור לבדיקה/);
  assert.equal(closed.headers.get("x-robots-tag"), "noindex, follow");
  assert.doesNotMatch(closed.body, /סביבת המחקר העמוקה של SOD1820/);
}
const heichalUnknown = await renderResponse("/heichal", async () => { throw new Error("flag unavailable"); }, { crawler: "search" });
assert.equal(heichalUnknown.headers.get("x-robots-tag"), "noindex, follow");
const heichalOpen = await renderResponse("/heichal", async () => ({ ok: true, async json() { return [{ key: "lock_heichal", enabled: false, mode: "all" }]; } }), { crawler: "search" });
assert.equal(heichalOpen.headers.get("x-robots-tag"), "index, follow");

for (const [path, title] of [["/code", "ELS"], ["/codes", "ספריית הצפנים"]]) {
  const page = await renderResponse(path, async () => { throw new Error("static ELS metadata must not fetch records"); }, { crawler: "search" });
  assert.match(page.body, new RegExp(`<title>${title}`));
  assert.match(page.body, new RegExp(`<link rel="canonical" href="https://sod1820\\.co\\.il${path}"\\/>`));
  assert.equal(page.headers.get("x-robots-tag"), "index, follow");
}

const cipherSlug = encodeURIComponent("תורה-50");
const publishedCipher = await renderResponse(`/codes/${cipherSlug}`, async (url) => {
  assert.match(String(url), /els_records\?slug=eq\./);
  return { ok: true, json: async () => [{ title: "תורה", search_term: "תורה", skip_distance: 50, scope: "torah", positions: {} }] };
}, { crawler: "search" });
assert.match(publishedCipher.body, /הצופן «תורה» — דילוג 50/);
assert.match(publishedCipher.body, /og:type" content="article"/);
assert.match(publishedCipher.body, new RegExp(`<link rel="canonical" href="https://sod1820\\.co\\.il/codes/${cipherSlug}"\\/>`));
assert.equal(publishedCipher.headers.get("x-robots-tag"), "index, follow");

const missingCipher = await renderResponse("/codes/unknown-cipher", async () => ({ ok: true, json: async () => [] }), { crawler: "search" });
assert.match(missingCipher.body, /הצופן לא נמצא/);
assert.equal(missingCipher.headers.get("x-robots-tag"), "noindex, follow");

// The public research collection is a real page, never a cipher slug. Both URL
// spellings must share its own metadata and canonical without a record lookup.
for (const path of ["/codes/מחקר", `/codes/${encodeURIComponent("מחקר")}`]) {
  const researchFolder = await renderResponse(path, async () => {
    throw new Error("research collection metadata must not fetch a cipher record");
  }, { crawler: "search" });
  assert.match(researchFolder.body, /<title>תיקיית המחקר — צירים ארוכים \(ELS\) בתנ״ך/);
  assert.match(researchFolder.body, /<link rel="canonical" href="https:\/\/sod1820\.co\.il\/codes\/מחקר"\/>/);
  assert.match(researchFolder.body, /og:type" content="website"/);
  assert.equal(researchFolder.headers.get("x-robots-tag"), "index, follow");
}

const previousSitemapFetch = globalThis.fetch;
try {
  globalThis.fetch = async () => ({ ok: true, json: async () => [] });
  const sitemap = makeRes();
  await sitemapHandler({}, sitemap);
  assert.equal(sitemap.statusCode, 200);
  assert.match(sitemap.body, new RegExp(`<loc>https://sod1820\\.co\\.il/codes/${encodeURIComponent("מחקר")}</loc>`));
} finally {
  globalThis.fetch = previousSitemapFetch;
}

const vercel = JSON.parse(readFileSync("vercel.json", "utf8"));
const uaRules = vercel.rewrites.filter((r) => Array.isArray(r.has) && r.has.some((h) => h.key === "user-agent"));
const socialAiRule = uaRules.find((r) => r.source === "/(.*)" && r.destination === "/api/og?path=/$1");
assert.ok(socialAiRule, "canonical social/AI OG UA rewrite must exist");
const socialAiUa = socialAiRule.has.find((h) => h.key === "user-agent").value;
for (const token of ["GPTBot", "OAI-SearchBot", "ClaudeBot", "PerplexityBot", "CCBot", "Google-Extended", "Bytespider"]) {
  assert.ok(socialAiUa.includes(token), `AI crawler UA must be included: ${token}`);
}

const searchRules = uaRules.filter((r) => String(r.destination || "").includes("crawler=search"));
const expectedSearchRoutes = ["/forum/(.*)", "/journey", "/journey-beta", "/מסע", "/number", "/", "/2029", "/world", "/topic/(.*)", "/post/(.*)", "/video/(.*)", "/books", "/book/(.*)", "/code", "/codes", "/codes/(.*)", "/els", "/heichal", "/היכל", "/researcher/(.*)", "/2029/number/(.*)", "/number/(.*)"];
assert.equal(searchRules.length, expectedSearchRoutes.length, "search crawlers must be routed only across the explicit native/public and closed alias document families");
for (const rule of searchRules) {
  const ua = rule.has.find((h) => h.key === "user-agent").value;
  assert.ok(ua.includes("Googlebot"), `Googlebot must receive server document for ${rule.source}`);
  assert.ok(ua.includes("bingbot"), `bingbot must receive server document for ${rule.source}`);
  assert.ok(ua.includes("Baiduspider"), `Baiduspider must receive server document for ${rule.source}`);
  assert.equal(rule.destination.includes("crawler=search"), true);
}
for (const route of expectedSearchRoutes) {
  assert.ok(searchRules.some((r) => r.source === route), `missing search crawler server-document route: ${route}`);
}
assert.equal(searchRules.some((r) => r.source === "/(.*)"), false, "search crawlers must never be sent through a global crawler catch-all");
assert.ok(
  vercel.rewrites.indexOf(searchRules[0]) < vercel.rewrites.indexOf(socialAiRule),
  "search-crawler document rules must precede the generic social/AI crawler catch-all",
);

// The actual publication adapter, rather than the dormant Legacy root, owns
// current sitemap cache/indexability. These are synthetic public-only rows.
const privacySitemapFetch = globalThis.fetch;
try {
  const publicReadingSitemapHandler = await loadPublicSitemapAdapter();
  globalThis.fetch = async () => new Response("[]", { headers: { "Content-Type": "application/json" } });
  const sitemapResponse = makeRes();
  const publicationRequest = { method: "GET", url: "/sitemap.xml", headers: { host: "sod1820.co.il" }, query: {} };
  const publication = publicReadingSitemapHandler({ authorized: () => true, indexable: origin => origin === "https://sod1820.co.il" });
  await publication(publicationRequest, sitemapResponse);
  assert.equal(sitemapResponse.statusCode, 200);
  assert.match(sitemapResponse.body, /<loc>https:\/\/sod1820.co.il\/privacy<\/loc>/);
  assert.match(sitemapResponse.headers.get("cache-control"), /^public,.*s-maxage=21600.*stale-while-revalidate=86400/);
  const privacy = makeRes();
  await handler({ publicFoundationPreview: true, publicReadingRelease: PUBLIC_READING_PROFILE_ID,
    publicReadingProductionArtifact: true, query: { path: "/privacy", crawler: "search" } }, privacy);
  assert.equal(privacy.statusCode, 200);
  assert.match(privacy.body, /canonical" href="https:\/\/sod1820.co.il\/privacy"/);
  assert.equal(privacy.headers.get("x-robots-tag"), "index, follow");
  globalThis.fetch = async () => { throw new Error("synthetic publication source failure"); };
  const failed = makeRes(); await publication(publicationRequest, failed);
  assert.equal(failed.statusCode, 503); assert.equal(failed.headers.get("cache-control"), "no-store");
  assert.doesNotMatch(failed.body, /<urlset/);
} finally { globalThis.fetch = privacySitemapFetch; }
// The public learning area is a SPA route, not a Post slug. Before this branch existed the server document fell through to the
// post lookup and answered 404 "הפוסט לא נמצא" (and noindex metadata) for a page that renders fine in the browser.
const beitMidrashFetch = globalThis.fetch;
try {
  globalThis.fetch = async (url) => { throw new Error("Beit Midrash server metadata must not fetch data: " + url); };
  for (const path of ["/beit-midrash", "/beit-midrash/standard", "/beit-midrash/standard/"]) {
    const bm = makeRes();
    await handler({ publicFoundationPreview: true, publicReadingRelease: PUBLIC_READING_PROFILE_ID,
      publicReadingProductionArtifact: true, query: { path, crawler: "search" } }, bm);
    assert.equal(bm.statusCode, 200, `${path} must be a public document, not a missing Post`);
    assert.match(bm.body, /<title>בית המדרש · לומדים לגלות · SOD1820<\/title>/, path);
    assert.match(bm.body, /canonical" href="https:\/\/sod1820.co.il\/beit-midrash"/, path);
    assert.equal(bm.headers.get("x-robots-tag"), "noindex, nofollow", path);
    assert.doesNotMatch(bm.body, /הפוסט לא נמצא/, path);
  }
  // Addresses that are not a method/section stay missing rather than becoming a Post lookup.
  const deep = makeRes();
  await handler({ publicFoundationPreview: true, publicReadingRelease: PUBLIC_READING_PROFILE_ID,
    publicReadingProductionArtifact: true, query: { path: "/beit-midrash/standard/extra", crawler: "search" } }, deep);
  assert.equal(deep.statusCode, 404);
} finally { globalThis.fetch = beitMidrashFetch; }
execFileSync(process.execPath, ["--test", "test/public-sitemap-cache-2029.test.mjs"], { cwd: new URL("..", import.meta.url), stdio: "inherit" });
console.log("2029 server/crawler SEO+AI metadata parity: PASS");
