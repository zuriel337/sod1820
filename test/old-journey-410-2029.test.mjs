// Old Journey addresses answer 410 (ZURIEL 19.11.2026): /journey?from=<expression>, GET/HEAD, the same light document for a browser and a
// crawler, with the expression's identity kept (its existing expression page and the calculator, never a computed number, never a redirect).
// /journey without `from`, sub-paths, /journey-beta, /2029/journey and other methods are unchanged; bad bots and blocked countries are still
// refused. Runs the real production middleware with the network replaced (as middleware.test.js does).
import test from "node:test";
import assert from "node:assert/strict";
import middleware from "../middleware.js";
import { oldJourneyAddress, oldJourneyExpression, oldJourneyExpressionHref, oldJourneyCalculatorHref } from "../edge-old-journey.js";
import { numberPageHref, NUMBER_PAGE_BASE } from "../src/lib/research/numberPageAddress.js";

const GOOGLEBOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const BROWSER = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const BAD_BOT = "curl/8.5.0";
const GESHER = "%D7%92%D7%A9%D7%A8"; // גשר

const crawlLogs = [];
globalThis.fetch = async (url, init) => {
  const href = String(url);
  // One blocked country for the whole file (the country policy is cached per instance).
  if (href.includes("/edge_blocked_countries")) return new Response(JSON.stringify([{ code: "CN", mode: "blocked", strict_level: 1 }]));
  if (href.endsWith("/rpc/log_crawl")) crawlLogs.push(JSON.parse(init.body));
  return new Response("null");
};

async function run({ path, ua = BROWSER, method = "GET", country = "IL" }) {
  const pending = [];
  const response = await middleware(new Request(`https://sod1820.co.il${path}`, { method, headers: { "user-agent": ua, "x-vercel-ip-country": country } }),
    { waitUntil: (p) => pending.push(p) });
  await Promise.all(pending);
  return response;
}

const passesOn = (response) => response.headers.get("x-middleware-next") === "1";

test("Googlebot and a browser get the same 410 document for /journey?from=<expression>, not 403", async () => {
  const bodies = [];
  for (const ua of [GOOGLEBOT, BROWSER]) {
    const response = await run({ path: `/journey?from=${GESHER}`, ua });
    assert.equal(response.status, 410, ua);
    assert.equal(response.headers.get("x-robots-tag"), "noindex");
    assert.equal(response.headers.get("x-sod-route"), "legacy-journey-gone");
    assert.match(response.headers.get("cache-control"), /^public/);
    assert.match(response.headers.get("content-type"), /^text\/html/);
    bodies.push(await response.text());
  }
  assert.equal(bodies[0], bodies[1], "one document for everyone");
  const body = bodies[0];
  assert.match(body, /המסלול הישן הוסר/);
  assert.match(body, new RegExp(`href="/number/${GESHER}"`), "the existing expression page of the same expression");
  assert.match(body, new RegExp(`href="/gematria\\?q=${GESHER}"`), "the calculator with the same expression");
  assert.doesNotMatch(body, /מסע החיים/, "nothing presents the 2029 Life Journey");
  assert.doesNotMatch(body, /\/number\/\d+"/, "never a computed number for a word expression");
});

// blocked=false only says the middleware did not refuse the request; it is not a record of the 410 (status is verified by HTTP checks).
test("the crawl log marks the old Journey request as not blocked (a supplementary signal, not a status record)", async () => {
  crawlLogs.length = 0;
  await run({ path: "/journey?from=438", ua: GOOGLEBOT });
  assert.deepEqual(crawlLogs.map(({ p_bucket, p_blocked }) => ({ p_bucket, p_blocked })), [{ p_bucket: "journey", p_blocked: false }]);
});

test("HEAD gets the 410 without a body; the trailing slash and a number expression are included", async () => {
  const head = await run({ path: `/journey?from=${GESHER}`, ua: GOOGLEBOT, method: "HEAD" });
  assert.equal(head.status, 410);
  assert.equal(await head.text(), "");
  const slash = await run({ path: "/journey/?from=0438&utm_source=x" });
  assert.equal(slash.status, 410);
  const body = await slash.text();
  assert.match(body, /href="\/number\/438"/, "a number loses its leading zeros, as on the number page");
  assert.match(body, /href="\/gematria\?q=0438"/, "the calculator gets the expression exactly as it was");
  assert.doesNotMatch(body, /utm_source/, "other parameters are not carried");
});

test("an empty, unsafe or oversized expression still gets the 410, with no expression links; markup is escaped", async () => {
  for (const from of ["", "%20%20", "x".repeat(81)]) {
    const response = await run({ path: `/journey?from=${from}`, ua: GOOGLEBOT });
    assert.equal(response.status, 410, JSON.stringify(from));
    const body = await response.text();
    assert.match(body, /href="\/gematria"/);
    assert.doesNotMatch(body, /href="\/number\//);
  }
  const hostile = await (await run({ path: `/journey?from=${encodeURIComponent('<script>alert(1)</script>"')}` })).text();
  assert.doesNotMatch(hostile, /<script>/);
  assert.match(hostile, /&lt;script&gt;/);
});

test("unchanged: /journey without from, sub-paths, /journey-beta, /2029/journey and other methods", async () => {
  assert.equal((await run({ path: "/journey", ua: GOOGLEBOT })).status, 403, "crawler on bare /journey: the expensive-path block as before");
  assert.ok(passesOn(await run({ path: "/journey" })), "browser on bare /journey: the closed page as before");
  assert.ok(passesOn(await run({ path: "/journey?other=1" })));
  assert.equal((await run({ path: `/journey/x?from=${GESHER}`, ua: GOOGLEBOT })).status, 403);
  assert.equal((await run({ path: `/journey-beta?from=${GESHER}`, ua: GOOGLEBOT })).status, 403);
  assert.ok(passesOn(await run({ path: `/journey-beta?from=${GESHER}` })));
  assert.ok(passesOn(await run({ path: `/2029/journey?from=${GESHER}` })), "the 2029 Life Journey address is untouched");
  assert.equal((await run({ path: `/journey?from=${GESHER}`, ua: GOOGLEBOT, method: "POST" })).status, 403);
  assert.ok(passesOn(await run({ path: `/journey?from=${GESHER}`, method: "POST" })));
});

test("site protections stay: a bad bot and a blocked country are refused before the 410", async () => {
  assert.equal((await run({ path: `/journey?from=${GESHER}`, ua: BAD_BOT })).status, 403);
  assert.equal((await run({ path: `/journey?from=${GESHER}`, country: "CN" })).status, 403);
  assert.equal((await run({ path: `/journey?from=${GESHER}`, ua: GOOGLEBOT, country: "CN" })).status, 410, "good crawlers pass country blocks as before");
});

test("which addresses: exact definition and the expression page parity with numberPageHref", () => {
  assert.deepEqual(oldJourneyAddress("GET", `https://sod1820.co.il/journey?from=${GESHER}`), { expression: "גשר" });
  assert.deepEqual(oldJourneyAddress("HEAD", "https://www.sod1820.co.il/journey/?from="), { expression: "" });
  for (const url of ["https://sod1820.co.il/journey", "https://sod1820.co.il/journey/a?from=1", "https://sod1820.co.il/journey-beta?from=1",
    "https://sod1820.co.il/2029/journey?from=1", "https://sod1820.co.il/journeys?from=1"]) assert.equal(oldJourneyAddress("GET", url), null, url);
  assert.equal(oldJourneyAddress("POST", "https://sod1820.co.il/journey?from=1"), null);
  assert.equal(oldJourneyExpression("  אור \n בהיר "), "אור בהיר");
  for (const expression of ["גשר", "אור בהיר", "438", "0438", "ה׳ אחד"]) {
    assert.equal(oldJourneyExpressionHref(expression), numberPageHref(expression).replace(NUMBER_PAGE_BASE, "/number"), expression);
  }
  assert.equal(oldJourneyCalculatorHref("אור בהיר"), "/gematria?q=%D7%90%D7%95%D7%A8%20%D7%91%D7%94%D7%99%D7%A8");
});
