import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import handler from "../api/og.js";

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


const homeSearchCrawler = await renderResponse("/", async () => {
  throw new Error("home server document must not require Supabase fetch");
}, { crawler: "search" });
assert.match(homeSearchCrawler.body, /canonical" href="https:\/\/sod1820\.co\.il"/);
assert.equal(homeSearchCrawler.headers.get("x-robots-tag"), "index, follow");
assert.doesNotMatch(homeSearchCrawler.body, /http-equiv="refresh"/);

const number = await render("/2029/number/123");
assert.match(number, /<meta name="robots" content="noindex, nofollow"\/>/);
assert.match(number, /123 · דף המספר 2029/);
assert.match(number, /og:type" content="website"/);
assert.equal(number.includes('"@type":"Article"'), false);

let researcherFetches = [];
const researcher = await render("/researcher/admin-only", async (url) => {
  researcherFetches.push(String(url));
  throw new Error("native researcher OG must not fetch corpus or contributor data");
});
assert.match(researcher, /<meta name="robots" content="noindex, nofollow"\/>/);
assert.match(researcher, /קורפוס חוקר/);
assert.equal(researcherFetches.length, 0);

const topic = await render("/topic/98-test", async (url) => {
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
});
assert.match(topic, /og:type" content="website"/);
assert.match(topic, /"@type":"WebPage"/);
assert.match(topic, /"@type":"BreadcrumbList"/);
assert.equal(topic.includes('"@type":"Article"'), false);

const topicSearchCrawler = await renderResponse("/topic/98-test", async (url) => {
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
}, { crawler: "search" });
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



const legacyNumberSearchCrawler = await renderResponse("/number/1237", async (url) => {
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
}, { crawler: "search" });
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

const vercel = JSON.parse(readFileSync("vercel.json", "utf8"));
const uaRules = vercel.rewrites.filter((r) => Array.isArray(r.has) && r.has.some((h) => h.key === "user-agent"));
const socialAiRule = uaRules.find((r) => r.source === "/(.*)" && r.destination === "/api/og?path=/$1");
assert.ok(socialAiRule, "canonical social/AI OG UA rewrite must exist");
const socialAiUa = socialAiRule.has.find((h) => h.key === "user-agent").value;
for (const token of ["GPTBot", "OAI-SearchBot", "ClaudeBot", "PerplexityBot", "CCBot", "Google-Extended", "Bytespider"]) {
  assert.ok(socialAiUa.includes(token), `AI crawler UA must be included: ${token}`);
}

const searchRules = uaRules.filter((r) => String(r.destination || "").includes("crawler=search"));
assert.equal(searchRules.length, 14, "search crawlers must be routed only across the explicit native/public document family");
for (const rule of searchRules) {
  const ua = rule.has.find((h) => h.key === "user-agent").value;
  assert.ok(ua.includes("Googlebot"), `Googlebot must receive server document for ${rule.source}`);
  assert.ok(ua.includes("bingbot"), `bingbot must receive server document for ${rule.source}`);
  assert.ok(ua.includes("Baiduspider"), `Baiduspider must receive server document for ${rule.source}`);
  assert.equal(rule.destination.includes("crawler=search"), true);
}
for (const route of ["/", "/2029", "/world", "/topic/(.*)", "/post/(.*)", "/video/(.*)", "/books", "/book/(.*)", "/els", "/heichal", "/היכל", "/researcher/(.*)", "/2029/number/(.*)", "/number/(.*)"]) {
  assert.ok(searchRules.some((r) => r.source === route), `missing search crawler server-document route: ${route}`);
}
assert.equal(searchRules.some((r) => r.source === "/(.*)"), false, "search crawlers must never be sent through a global crawler catch-all");
assert.ok(
  vercel.rewrites.indexOf(searchRules[0]) < vercel.rewrites.indexOf(socialAiRule),
  "search-crawler document rules must precede the generic social/AI crawler catch-all",
);

console.log("2029 server/crawler SEO+AI metadata parity: PASS");
