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
assert.equal(searchRules.length, 10, "search crawlers must be routed only across the explicit native/public 2029 document family");
for (const rule of searchRules) {
  const ua = rule.has.find((h) => h.key === "user-agent").value;
  assert.ok(ua.includes("Googlebot"), `Googlebot must receive server document for ${rule.source}`);
  assert.ok(ua.includes("bingbot"), `bingbot must receive server document for ${rule.source}`);
  assert.equal(rule.destination.includes("crawler=search"), true);
}
for (const route of ["/2029", "/world", "/topic/(.*)", "/books", "/book/(.*)", "/els", "/heichal", "/היכל", "/researcher/(.*)", "/2029/number/(.*)"]) {
  assert.ok(searchRules.some((r) => r.source === route), `missing search crawler server-document route: ${route}`);
}
assert.equal(searchRules.some((r) => r.source === "/(.*)"), false, "Google/Bing must never be sent through a global crawler catch-all");
assert.ok(
  vercel.rewrites.indexOf(searchRules[0]) < vercel.rewrites.indexOf(socialAiRule),
  "search-crawler document rules must precede the generic social/AI crawler catch-all",
);

console.log("2029 server/crawler SEO+AI metadata parity: PASS");
