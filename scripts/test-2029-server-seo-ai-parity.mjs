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

async function render(path, fetchImpl) {
  const prev = globalThis.fetch;
  globalThis.fetch = fetchImpl || (async () => { throw new Error("unexpected fetch"); });
  try {
    const res = makeRes();
    await handler({ query: { path } }, res);
    assert.equal(res.statusCode, 200);
    return res.body;
  } finally {
    globalThis.fetch = prev;
  }
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
const uaRule = vercel.rewrites.find((r) => Array.isArray(r.has) && r.has.some((h) => h.key === "user-agent"));
assert.ok(uaRule, "canonical OG UA rewrite must exist");
const ua = uaRule.has.find((h) => h.key === "user-agent").value;
for (const token of ["GPTBot", "OAI-SearchBot", "ClaudeBot", "PerplexityBot", "CCBot", "Google-Extended", "Bytespider"]) {
  assert.ok(ua.includes(token), `AI crawler UA must be included: ${token}`);
}
assert.equal(ua.includes("Googlebot"), false, "Googlebot must retain hydrated 2029 rendering");
assert.equal(ua.includes("bingbot"), false, "Bingbot must retain hydrated 2029 rendering");

console.log("2029 server/crawler SEO+AI metadata parity: PASS");
