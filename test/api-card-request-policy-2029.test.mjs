// /api/card request policy, cache classes, cancellation and the no-network logo fallback (ZURIEL 18.11.2026, branch only).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { CARD_CACHE, cardRequestPolicy } from "../public-reading-deploy/card-request.js";
import { renderWithinDeadline } from "../public-reading-deploy/card-deadline.js";

const SITE = "https://sod1820.co.il";
const q = (o) => `${SITE}/api/card?${new URLSearchParams(o).toString()}`;

test("every card address the site builds is accepted, with the right cache class", () => {
  const accepted = [
    [q({ w: "משיח", sub: "כי לה' המלוכה", cap: "לקריאת הרמז המלא ←" }), "query"],          // og.js post fallback
    [q({ w: "מחשבון הגימטריה", sub: "חשבו כל מילה", cap: "בדקו", sig: "gem" }), "query"],  // og.js hand-built
    [q({ w: "סרטון", sub: "אור הגאולה · סרטון", sig: "orgeula" }), "query"],               // thumbResolve.js
    [q({ v: "unit", t: "כותרת", sub: "משנה", nums: "2026,5787,1237,1158", cap: "מפת המציאות" }), "query"], // unit card
    [q({ w: "ממצא", sub: "מאושר · מקור", cap: "קרדיט", sig: "finding" }), "query"],         // world finding
    [`${SITE}/api/card?w=${encodeURIComponent("שם")}&n=358&format=story`, "query"],          // community calculator story
    [q({ w: "משיח", n: "358" }), "query"],                                                  // word = value: no database read
    [q({ n: "358" }), "number"],                                                             // number card reads the published phrases
    [`${SITE}/api/card`, "query"],                                                           // no query: the brand card
  ];
  for (const [url, cls] of accepted) assert.deepEqual(cardRequestPolicy(url), { ok: true, cacheClass: cls }, url);
});

test("anything the site never builds is refused before any work", () => {
  for (const url of [
    `${SITE}/api/card?n=358&fbclid=abc`,
    `${SITE}/api/card?w=a&w=b`,
    `${SITE}/api/card?v=other&t=x`,
    `${SITE}/api/card?format=square&w=x`,
    `${SITE}/api/card?sig=${"x".repeat(40)}`,
    `${SITE}/api/card?n=12ab`,
    `${SITE}/api/card?w=${"א".repeat(601)}`,
    `${SITE}/api/card?cb=${Date.now()}`,
  ]) assert.equal(cardRequestPolicy(url).ok, false, url);
});

test("cache classes: query cards 7 days, number cards 1 hour, both with a day of stale-while-revalidate", () => {
  assert.equal(CARD_CACHE.query, "public, s-maxage=604800, stale-while-revalidate=86400");
  assert.equal(CARD_CACHE.number, "public, s-maxage=3600, stale-while-revalidate=86400");
});

test("the public wrapper refuses a foreign parameter with a tiny no-store 400 and never calls the renderer", () => {
  const wrapper = fs.readFileSync(new URL("../public-reading-deploy/api/card.js", import.meta.url), "utf8");
  const refuse = wrapper.indexOf("cardRequestPolicy(url)");
  const render = wrapper.indexOf("renderWithinDeadline(() => handler(req))");
  assert.ok(refuse > 0 && render > refuse, "the policy runs before the render");
  assert.match(wrapper, /status: 400, headers: \{ "Content-Type": "text\/plain; charset=utf-8", "Cache-Control": "no-store"/);
  assert.match(wrapper, /CARD_CACHE\[policy\.cacheClass\]/);
  assert.match(wrapper, /Server-Timing/);
});

test("a render that misses the deadline is cancelled, not left running", async () => {
  let cancelled = null;
  const never = new ReadableStream({ pull() { return new Promise(() => {}); }, cancel(reason) { cancelled = reason; } });
  const t0 = Date.now();
  const result = await renderWithinDeadline(async () => new Response(never, { status: 200 }), 50);
  assert.equal(result, null);
  assert.ok(Date.now() - t0 < 1000);
  await new Promise((r) => setTimeout(r, 10));
  assert.ok(cancelled instanceof Error, "the body stream received cancel()");
});

test("renderer: no emoji stand-in for the logo (it would fetch a twemoji at render time)", () => {
  const card = fs.readFileSync(new URL("../api/card.js", import.meta.url), "utf8");
  assert.doesNotMatch(card, /'👑'\)/, "no 👑 text node in the tree");
});

test("renderer: with the logo missing, a real render completes with no network read beyond the database", async () => {
  const realFetch = globalThis.fetch;
  const external = [];
  globalThis.fetch = async (u, o) => {
    const s = String(u);
    if (s.startsWith("file:")) {
      if (s.endsWith("logo.png")) throw new Error("logo load failed");
      return new Response(fs.readFileSync(new URL(s)));
    }
    if (s.startsWith("data:")) return realFetch(u, o);
    external.push(s);
    if (s.includes("supabase.co")) return Response.json([{ phrase: "משיח" }]);
    return new Promise(() => {}); // a font or emoji host would hang
  };
  try {
    const { default: handler } = await import(`../api/card.js?logo-fail=${Date.now()}`);
    const result = await renderWithinDeadline(() => handler(new Request(`${SITE}/api/card?n=358`)), 8000);
    assert.ok(result, "rendered before the deadline");
    assert.equal(result.status, 200);
    assert.ok(result.body.byteLength > 10000, "a real PNG");
    assert.deepEqual(external.filter((s) => !s.includes("supabase.co")), [], "no font or emoji host was contacted");
  } finally {
    globalThis.fetch = realFetch;
  }
});
