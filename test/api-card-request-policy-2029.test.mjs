// /api/card request policy, cache classes, cancellation and the no-network logo fallback (ZURIEL 18.11.2026, branch only).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { CARD_CACHE, cardRequestPolicy } from "../public-reading-deploy/card-request.js";
import { renderWithinDeadline } from "../public-reading-deploy/card-deadline.js";

const SITE = "https://sod1820.co.il";
const q = (o) => `${SITE}/api/card?${new URLSearchParams(o).toString()}`;

test("every card address the site builds, has built, or has stored is accepted, with the right cache class", () => {
  const accepted = [
    [q({ w: "משיח", sub: "כי לה' המלוכה", cap: "לקריאת הרמז המלא ←" }), "query"],          // og.js post fallback (also stored in posts)
    [q({ w: "מחשבון הגימטריה", sub: "חשבו כל מילה", cap: "בדקו", sig: "gem" }), "query"],  // og.js hand-built
    [q({ w: "סרטון", sub: "אור הגאולה · סרטון", sig: "orgeula" }), "query"],               // thumbResolve.js
    [q({ v: "unit", t: "כותרת", sub: "משנה", nums: "2026,5787,1237,1158", cap: "מפת המציאות" }), "query"], // unit card
    [q({ w: "ממצא", sub: "מאושר · מקור", cap: "קרדיט", sig: "finding" }), "query"],         // world finding
    [`${SITE}/api/card?w=${encodeURIComponent("שם")}&n=358&format=story`, "query"],          // community calculator story
    [q({ w: "משיח", n: "358" }), "query"],                                                  // word = value: no database read
    [q({ n: "358" }), "number"],                                                             // number card reads the published phrases
    [q({ n: "358", t: "כותרת" }), "number"],                                                 // t does not stop the phrase read
    [`${SITE}/api/card`, "query"],                                                           // no query: the brand card
    [q({ w: "א".repeat(375) }), "query"],                                                    // the longest post title today (375)
  ];
  for (const [url, cls] of accepted) {
    const r = cardRequestPolicy(url);
    assert.equal(r.ok, true, url); assert.equal(r.cacheClass, cls, url);
  }
});

test("old or decorated links keep their image: unknown parameters, repeated keys and unknown values are ignored, never refused", () => {
  for (const [url, ignored] of [
    [`${SITE}/api/card?n=358&fbclid=abc`, ["fbclid"]],
    [`${SITE}/api/card?w=a&w=b`, []],
    [`${SITE}/api/card?v=other&t=x`, []],
    [`${SITE}/api/card?format=square&w=x`, []],
    [`${SITE}/api/card?sig=${"x".repeat(40)}`, []],
    [`${SITE}/api/card?n=12ab`, []],
    [`${SITE}/api/card?w=x&cb=${Date.now()}&utm_source=wa`, ["cb", "utm_source"]],
  ]) {
    const r = cardRequestPolicy(url);
    assert.equal(r.ok, true, url);
    assert.deepEqual(r.ignored, ignored, url);
  }
  assert.equal(cardRequestPolicy(`${SITE}/api/card?n=12ab`).cacheClass, "query", "n that the renderer ignores does not read the database");
});

test("only an oversized request is refused", () => {
  assert.equal(cardRequestPolicy(`${SITE}/api/card?w=${"א".repeat(2001)}`).ok, false);
  assert.equal(cardRequestPolicy(`${SITE}/api/card?w=x&pad=${"x".repeat(9000)}`).ok, false);
});

test("cache classes: query cards 7 days, number cards 1 hour, both with a day of stale-while-revalidate; cards carry a purge tag", () => {
  assert.equal(CARD_CACHE.query, "public, s-maxage=604800, stale-while-revalidate=86400");
  assert.equal(CARD_CACHE.number, "public, s-maxage=3600, stale-while-revalidate=86400");
  const wrapper = fs.readFileSync(new URL("../public-reading-deploy/api/card.js", import.meta.url), "utf8");
  assert.match(wrapper, /if \(cacheable\) headers\.set\("Vercel-Cache-Tag", `api-card,api-card-\$\{policy\.cacheClass\}`\);/);
});

test("the public wrapper refuses only oversized requests, before the renderer, and reports the phases separately", () => {
  const wrapper = fs.readFileSync(new URL("../public-reading-deploy/api/card.js", import.meta.url), "utf8");
  const refuse = wrapper.indexOf("cardRequestPolicy(url)");
  const render = wrapper.indexOf("renderWithinDeadline(() => handler(req), CARD_DEADLINE_MS, progress)");
  assert.ok(refuse > 0 && render > refuse, "the size check runs before the render");
  assert.match(wrapper, /status: 400, headers: \{ "Content-Type": "text\/plain; charset=utf-8", "Cache-Control": "no-store"/);
  assert.match(wrapper, /Server-Timing", `response;dur=\$\{progress\.responseMs \?\? 0\}, body;dur=\$\{progress\.bodyMs \?\? 0\}, total;dur=\$\{totalMs\}`/);
});

test("phases: the response object arrives long before the body; both are measured", async () => {
  const progress = {};
  const body = new ReadableStream({ async start(c) { await new Promise((r) => setTimeout(r, 120)); c.enqueue(new Uint8Array(1000)); c.close(); } });
  const result = await renderWithinDeadline(async () => new Response(body, { status: 200 }), 5000, progress);
  assert.equal(result.status, 200);
  assert.ok(progress.bodyMs >= 100, `body complete at ${progress.bodyMs} ms`);
  assert.ok(progress.bodyMs - progress.responseMs >= 80, `response object at ${progress.responseMs} ms, body at ${progress.bodyMs} ms: a 200 object exists before its body`);
  assert.equal(progress.bytes, 1000);
});

test("cancel boundary: a lost race stops our waiting and releases the body, but does NOT stop work already running in start()", async () => {
  // Shaped like @vercel/og 0.11.1: the whole render runs in start(), and the stream has no cancel hook.
  let innerFetchAborted = false, renderFinishedAt = null, enqueueAfterCancelThrew = false;
  const innerFetch = new AbortController();
  innerFetch.signal.addEventListener("abort", () => { innerFetchAborted = true; });
  const body = new ReadableStream({
    async start(c) {
      await new Promise((r) => setTimeout(r, 150)); // the render (and any read it started) keeps going
      renderFinishedAt = Date.now();
      try { c.enqueue(new Uint8Array(10)); c.close(); } catch { enqueueAfterCancelThrew = true; }
    },
  });
  const t0 = Date.now();
  const progress = {};
  const result = await renderWithinDeadline(async () => new Response(body, { status: 200 }), 40, progress);
  assert.equal(result, null, "504 at the deadline");
  assert.ok(Date.now() - t0 < 120, "the caller stopped waiting at the deadline");
  assert.ok(progress.responseMs < 40 && progress.bodyMs === undefined, "the response object existed; the body never completed");
  await new Promise((r) => setTimeout(r, 200));
  assert.ok(renderFinishedAt, "the render itself was NOT stopped: it ran to its end");
  assert.equal(innerFetchAborted, false, "a read started inside the render was NOT aborted");
  assert.equal(enqueueAfterCancelThrew, true, "its output was discarded: the released body refused it");
});

test("cancel reaches a stream that has a cancel hook (pull-based), so the boundary is the renderer's, not ours", async () => {
  let cancelled = null;
  const never = new ReadableStream({ pull() { return new Promise(() => {}); }, cancel(reason) { cancelled = reason; } });
  const result = await renderWithinDeadline(async () => new Response(never, { status: 200 }), 30);
  assert.equal(result, null);
  await new Promise((r) => setTimeout(r, 10));
  assert.ok(cancelled instanceof Error);
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
