// A2 regression: /api/card timed out five times at 300 s on 2026-11-06 (the only server-side errors of that window) and
// logged "Failed to load dynamic font for ∩⊂ ... Status: 400". Two guarantees, proven against the real renderer:
//   1. the route answers within a hard deadline (504, no-store, tiny body) even when the render stalls, and
//   2. text from the query string / database can never make @vercel/og go to the network for a fallback font or emoji.
// Complements api-card-bounded-cacheable-2029.test.mjs (DEF-015: bounded reads, CDN cache only for canonical GET 200).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import React from "react";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { ImageResponse } from "@vercel/og";
import handler from "../api/card.js";
import { CARD_REPLACEMENT, CARD_TEXT_MAX, cardText, glyphCoverage } from "../api/_card-text.js";
import { CARD_DEADLINE_MS, deadlineExceededResult, renderWithinDeadline } from "../public-reading-deploy/card-deadline.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const cardSource = fs.readFileSync(new URL("../api/card.js", import.meta.url), "utf8");
const wrapperSource = fs.readFileSync(new URL("../public-reading-deploy/api/card.js", import.meta.url), "utf8");
const fontFile = fs.readFileSync(new URL("../api/_assets/heebo-800.ttf", import.meta.url));
const fontBytes = fontFile.buffer.slice(fontFile.byteOffset, fontFile.byteOffset + fontFile.byteLength);
const has = glyphCoverage(fontBytes);
const cp = (...codes) => String.fromCodePoint(...codes);
const h = React.createElement;

const SUPABASE_HOST = "https://linswmnnkjxvweumprav.supabase.co/";
const CANONICAL = "https://sod1820.co.il";
const isPng = (bytes) => Buffer.from(bytes).subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

// Replaces fetch for one test. data: (satori's wasm loaders) and file: (the embedded font and logo) behave as in
// production; the Supabase read is answered with `rows`; any other network request is recorded and answered 400 (or never
// answered when `hang` is set). Returns the list of requests that left the process for somewhere other than Supabase.
function stubNetwork(t, { rows = [], hang = false } = {}) {
  const realFetch = globalThis.fetch;
  const outside = [];
  t.mock.method(globalThis, "fetch", async (input, init) => {
    const url = String(input?.url ?? input);
    if (url.startsWith("data:")) return realFetch(input, init);
    if (url.startsWith("file:")) return new Response(fs.readFileSync(fileURLToPath(url)));
    if (url.startsWith(SUPABASE_HOST)) return new Response(JSON.stringify(rows));
    outside.push(url);
    return hang ? new Promise(() => {}) : new Response("blocked by the test", { status: 400 });
  });
  return outside;
}

// Renders `text` the way the card does (Heebo 800 as the only font) without going through the sanitiser.
const heeboCard = (text, width = 1200, height = 630) => new ImageResponse(
  h("div", { style: { width, height, display: "flex", fontFamily: "Heebo", fontSize: 30, fontWeight: 800 } }, text),
  { width, height, fonts: [{ name: "Heebo", data: fontBytes, weight: 800, style: "normal" }] },
);

// ---------------------------------------------------------------------------------------------------------------------
// 1. Glyph coverage and text sanitising
// ---------------------------------------------------------------------------------------------------------------------

test("coverage is read from the embedded font itself", (t) => {
  for (let c = 0x20; c <= 0x7e; c++) assert.ok(has(c), `ASCII ${c.toString(16)}`);
  for (let c = 0x05d0; c <= 0x05ea; c++) assert.ok(has(c), `Hebrew letter ${c.toString(16)}`);
  for (const c of [0xb7, 0x05be, 0x05f3, 0x05f4, 0x2013, 0x2014, 0x2019, 0x201d, 0x2026, 0x20aa]) assert.ok(has(c), `${c.toString(16)} is drawn by Heebo`);
  for (const c of [0x2229, 0x2282, 0x2192, 0x1f600, 0x6f22, 0x0639, 0x200b, 0x00ad, 0x2066, 0xfe0f, 0x0001]) assert.ok(!has(c), `${c.toString(16)} is not drawn by Heebo`);
  assert.ok(has(CARD_REPLACEMENT.codePointAt(0)), "the replacement separator is itself drawable");
  const fromView = glyphCoverage(fontFile); // a Buffer/Uint8Array view of the same bytes gives the same answer
  for (let c = 0; c <= 0xffff; c += 7) assert.equal(fromView(c), has(c));
  // A font that cannot be read degrades to ASCII + Hebrew letters, never to "everything is fine", and says so.
  const logged = [];
  t.mock.method(console, "error", (...args) => logged.push(args.join(" ")));
  for (const unreadable of [glyphCoverage(new ArrayBuffer(8)), glyphCoverage(new Uint8Array(0)), glyphCoverage(Buffer.from("not a font at all, just text"))]) {
    assert.ok(unreadable(0x41) && unreadable(0x05d0) && !unreadable(0x2229) && !unreadable(0x1f600) && !unreadable(0x00b7));
  }
  assert.equal(logged.length, 3);
  assert.match(logged[0], /font cmap could not be read/);
});

test("legitimate card text passes through unchanged", () => {
  const same = [
    "משיח", "סוד 1820", "מנוע המספרים", "חשבו כל מילה · שם · ביטוי", "הקלידו מספר או שם — וגלו את עץ הקשרים",
    "שיטת המפתח · פירוק אותיות", "צופן דילוג · דילוג 7", "ממצא · מקור · מחקר", "מה מסתתר ב\"משיח\"?", "שווה ל" + cp(0x05be) + "358",
    "מספר 358 = משיח", "sod1820.co.il", "דף חוקר · סוד 1820", "שלום" + cp(0x05b0, 0x05bc) + "ה", "מחיר 5" + cp(0x20aa), "Don" + cp(0x2019) + "t",
  ];
  for (const text of same) assert.equal(cardText(text, has), text);
});

test("characters the font cannot draw become one separator; nothing else is invented", () => {
  assert.equal(cardText("∩⊂", has), "", "the production string: nothing drawable is left");
  assert.equal(cardText("משיח ∩ גאולה", has), "משיח " + CARD_REPLACEMENT + " גאולה");
  assert.equal(cardText("משיח∩⊂גאולה", has), "משיח" + CARD_REPLACEMENT + "גאולה", "a run collapses to one separator");
  assert.equal(cardText("מספר → צורה → משמעות · מתכנס ל-1820", has), "מספר · צורה · משמעות · מתכנס ל-1820", "arrows used by api/og.js");
  assert.equal(cardText("שלום 😀 עולם", has), "שלום " + CARD_REPLACEMENT + " עולם");
  assert.equal(cardText("∩ שלום ⊂", has), "שלום", "no separator at either end");
  assert.equal(cardText("漢字", has), "");
  assert.equal(cardText(null, has), "");
  assert.equal(cardText(undefined, has), "");
});

test("blanks, controls, invisible and compatibility characters are normalised", () => {
  assert.equal(cardText("  שלום \t\n עולם\r\n", has), "שלום עולם");
  assert.equal(cardText("a" + cp(0x00a0, 0x2003, 0x3000, 0x2028) + "b", has), "a b");
  assert.equal(cardText("x" + cp(0x200b, 0x00ad, 0x2066, 0x2069, 0xfe0f, 0xfeff) + "y", has), "xy", "zero-width and bidi isolates vanish, they do not become a separator");
  assert.equal(cardText("x" + cp(0x0001, 0x0007, 0x007f) + "y", has), "x y");
  assert.equal(cardText(cp(0x200f) + "שלום" + cp(0x200e), has), cp(0x200f) + "שלום" + cp(0x200e), "LRM/RLM are in the font and stay as they were");
  assert.equal(cardText(cp(0xff21, 0xff11, 0x2460), has), "A11", "undrawable compatibility forms fold to what the font has (full-width letters, enclosed digits)");
  assert.equal(cardText(cp(0xfb01, 0xfb2a, 0x00e9), has), cp(0xfb01, 0xfb2a, 0x00e9), "characters the font has are never rewritten, Hebrew presentation forms included");
  assert.equal(cardText("a" + cp(0xd83d) + "b", has), "a" + CARD_REPLACEMENT + "b", "a lone surrogate is just another undrawable character");
});

test("text is length-bounded", () => {
  assert.equal([...cardText("א".repeat(5000), has)].length, CARD_TEXT_MAX);
  assert.equal([...cardText("א ".repeat(5000), has)].length <= CARD_TEXT_MAX, true);
  assert.equal(cardText("אבגדה", has, 3), "אבג");
});

test("fuzz: the output is always drawable, trimmed, single-spaced and stable", () => {
  let seed = 0x2f6e2b1;
  const next = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  const pool = [0x41, 0x20, 0x05d0, 0x05e9, 0x05b0, 0x00b7, 0x2229, 0x2192, 0x1f600, 0x200b, 0x200d, 0x00ad, 0x0001, 0x00a0, 0x3000, 0xd83d, 0xfe0f, 0x6f22, 0xfb2a, 0xff21, 0x2026, 0x2066];
  for (let i = 0; i < 400; i++) {
    let s = "";
    for (let k = next() % 40; k > 0; k--) s += String.fromCodePoint(next() % 5 === 0 ? 0x20 + (next() % 0x2fff) : pool[next() % pool.length]);
    const out = cardText(s, has);
    for (const ch of out) assert.ok(has(ch.codePointAt(0)), `undrawable ${ch.codePointAt(0).toString(16)} left in ${JSON.stringify(out)} from ${JSON.stringify(s)}`);
    assert.equal(out, out.trim(), "no leading or trailing space");
    assert.ok(!/ {2}/.test(out), "no double space");
    assert.equal(cardText(out, has), out, "idempotent");
  }
});

test("api/card.js sends every query-provided string through the sanitiser", () => {
  assert.doesNotMatch(cardSource, /searchParams\.get\(\s*['"](w|t|sub|cap)['"]\s*\)/, "w, t, sub and cap are read through text() only");
  assert.match(cardSource, /const text = \(name\) => cardText\(searchParams\.get\(name\), has\)/);
  assert.match(cardSource, /\.map\(\(x\) => cardText\(x\.phrase, has\)\)/, "phrases from the database are sanitised too");
  assert.doesNotMatch(cardSource, /index\.html/, "the stale 'falls to index.html' comment is gone");
});

// ---------------------------------------------------------------------------------------------------------------------
// 2. The real renderer never goes to the network for a glyph
// ---------------------------------------------------------------------------------------------------------------------

const HOSTILE = [
  ["the production string", "∩⊂"],
  ["set notation in a sentence", "משיח ∩ גאולה ⊂ עולם"],
  ["arrows (api/og.js uses them in a caption)", "מספר → צורה → משמעות"],
  ["emoji, ZWJ sequence and flag", "😀 שלום 👨‍👩‍👧 🇮🇱"],
  ["CJK, Arabic, Thai, Devanagari", "漢字 العربية ไทย हिन्दी"],
  ["math and symbols", "∑∫√∞≠≈ ⊕⊗ ☃★♥"],
  ["combining marks and compatibility forms", "a" + cp(0x0301) + "e" + cp(0x0308) + " " + cp(0x01c6) + " " + cp(0xfb01) + " " + cp(0xff21)],
  ["invisible and control characters", "x" + cp(0x200b, 0x00ad, 0x2066, 0xfe0f, 0x0001, 0x0007) + "z"],
  ["bidi marks around Hebrew", cp(0x200f) + "שלום" + cp(0x200e)],
  ["thousands of characters", "מ∩".repeat(3000)],
].map(([name, value]) => [name, encodeURIComponent(value)]);
// A lone surrogate cannot be written in a URL; a client that sends its UTF-8 bytes (CESU style) reaches the route as U+FFFD.
HOSTILE.push(["ill-formed UTF-8", "a%ED%A0%BDb%ED%B8%80c"]);

test("a card with hostile text still renders as a PNG and never asks for a fallback font or emoji", async (t) => {
  const outside = stubNetwork(t);
  t.mock.method(console, "error", () => {});
  for (const [name, v] of HOSTILE) {
    for (const query of [`w=${v}&sub=${v}&cap=${v}`, `w=${v}&n=358`, `t=${v}&format=story`, `n=358`]) {
      const res = await handler(new Request(`${CANONICAL}/api/card?${query}`));
      const body = new Uint8Array(await res.arrayBuffer());
      assert.equal(res.status, 200, name);
      assert.equal(res.headers.get("content-type"), "image/png", name);
      assert.ok(isPng(body), `${name}: PNG signature`);
    }
  }
  assert.deepEqual(outside, [], "no request left the process for a font or an emoji");
});

test("phrases read from the database are sanitised before they reach the renderer", async (t) => {
  const outside = stubNetwork(t, { rows: [{ phrase: "∩⊂" }, { phrase: "😀" }, { phrase: "שלום" + cp(0x200b) + "עולם" }, { phrase: "משיח → גאולה" }, { phrase: "  " }] });
  t.mock.method(console, "error", () => {});
  const res = await handler(new Request(`${CANONICAL}/api/card?n=358`));
  assert.equal(res.status, 200);
  assert.ok(isPng(new Uint8Array(await res.arrayBuffer())));
  assert.deepEqual(outside, []);
});

test("every glyph the font has can be drawn without a fallback request", async (t) => {
  const outside = stubNetwork(t);
  t.mock.method(console, "error", () => {});
  const drawable = [];
  for (let c = 0; c <= 0xffff; c++) if (has(c)) drawable.push(String.fromCodePoint(c));
  assert.ok(drawable.length > 400, "the cmap was read");
  const res = heeboCard(drawable.join(""));
  assert.ok(isPng(new Uint8Array(await res.arrayBuffer())));
  assert.deepEqual(outside, [], "what cmap says is drawable is what satori draws without help");
});

// Negative control: the instrument above must be able to see the failure. Different glyphs than the cases above, because
// @vercel/og memoises each fallback lookup per process.
test("control: undrawable glyphs DO make @vercel/og go to the network when nothing sanitises them", async (t) => {
  const outside = stubNetwork(t);
  t.mock.method(console, "error", () => {});
  const samples = { symbols: "∪⊃", emoji: "🎉", cjk: "日本", arabic: "ش", zeroWidth: cp(0x2060) };
  for (const [name, glyphs] of Object.entries(samples)) {
    outside.length = 0;
    await heeboCard("א" + glyphs + "ב").arrayBuffer();
    assert.ok(outside.some((url) => /fonts\.googleapis\.com|cdn\.jsdelivr\.net/.test(url)), `${name}: expected a fallback font or emoji request, saw ${JSON.stringify(outside)}`);
  }
});

// ---------------------------------------------------------------------------------------------------------------------
// 3. The deadline
// ---------------------------------------------------------------------------------------------------------------------

test("the deadline is about 10 s, far below the platform's 300 s", () => {
  assert.ok(CARD_DEADLINE_MS >= 5_000 && CARD_DEADLINE_MS <= 20_000, String(CARD_DEADLINE_MS));
  assert.match(wrapperSource, /renderWithinDeadline\(\(\) => handler\(req\)\)/);
});

test("root cause: ImageResponse returns 200 before it has rendered, so the deadline has to include the body", async (t) => {
  stubNetwork(t, { hang: true });
  t.mock.method(console, "error", () => {});
  const stuck = () => heeboCard("א" + cp(0x222e, 0x222f) + "ב"); // a symbol: satori asks for a fallback font, the request never answers
  const response = stuck();
  assert.equal(response.status, 200, "headers are already there...");
  assert.equal(response.headers.get("content-type"), "image/png");
  const started = Date.now();
  assert.equal(await renderWithinDeadline(async () => stuck(), 250), null, "...but the body is not, and the deadline still fires");
  assert.ok(Date.now() - started < 2_000);
});

test("the real handler, stalled on its database read, is cut off at the deadline", async (t) => {
  stubNetwork(t, { hang: false });
  const realFetch = globalThis.fetch;
  t.mock.method(globalThis, "fetch", (input, init) => (String(input?.url ?? input).startsWith(SUPABASE_HOST) ? new Promise(() => {}) : realFetch(input, init)));
  assert.equal(await renderWithinDeadline(() => handler(new Request(`${CANONICAL}/api/card?n=358`)), 250), null);
});

test("renderWithinDeadline: finished renders come back whole, failures before the deadline reject, late failures are ignored", async (t) => {
  const done = await renderWithinDeadline(async () => new Response("png-bytes", { status: 200, headers: { "Content-Type": "image/png" } }), 1_000);
  assert.equal(done.status, 200);
  assert.equal(done.headers.get("content-type"), "image/png");
  assert.equal(Buffer.from(done.body).toString(), "png-bytes");

  await assert.rejects(renderWithinDeadline(async () => { throw new Error("render failed"); }, 1_000), /render failed/);
  await assert.rejects(renderWithinDeadline(async () => new Response(new ReadableStream({ start(c) { c.error(new Error("stream failed")); } })), 1_000), /stream failed/);

  const unhandled = [];
  const onUnhandled = (reason) => unhandled.push(reason);
  process.on("unhandledRejection", onUnhandled);
  t.after(() => process.off("unhandledRejection", onUnhandled));
  const late = await renderWithinDeadline(async () => new Response(new ReadableStream({ start(c) { setTimeout(() => c.error(new Error("too late")), 80); } })), 20);
  assert.equal(late, null);
  await new Promise((resolve) => setTimeout(resolve, 200));
  assert.deepEqual(unhandled, [], "a render that fails after the deadline was lost is not an unhandled rejection");
});

test("renderWithinDeadline uses the default deadline and never leaves its timer behind", async (t) => {
  const realSet = globalThis.setTimeout;
  const realClear = globalThis.clearTimeout;
  const started = [];
  const cleared = [];
  t.mock.method(globalThis, "setTimeout", (fn, ms, ...rest) => { const handle = realSet(fn, ms, ...rest); started.push({ handle, ms }); return handle; });
  t.mock.method(globalThis, "clearTimeout", (handle) => { cleared.push(handle); return realClear(handle); });
  await renderWithinDeadline(async () => new Response("ok"));
  await assert.rejects(renderWithinDeadline(async () => { throw new Error("x"); }), /x/);
  const timers = started.filter((s) => s.ms === CARD_DEADLINE_MS);
  assert.equal(timers.length, 2, "the default deadline is CARD_DEADLINE_MS");
  for (const { handle } of timers) assert.ok(cleared.includes(handle), "timer cleared on success and on failure");
});

test("the 504 answer is tiny, plain text", async () => {
  const answer = deadlineExceededResult();
  assert.equal(answer.status, 504);
  assert.equal(answer.headers.get("content-type"), "text/plain; charset=utf-8");
  assert.ok(answer.body.byteLength > 0 && answer.body.byteLength < 100);
});

// The public-reading edge wrapper, with a stubbed renderer, run on fake timers.
async function wrapperWith(innerSource) {
  const { outputFiles } = await build({
    stdin: { contents: "export { default } from './public-reading-deploy/api/card.js';", resolveDir: root, loader: "js" },
    platform: "neutral", format: "esm", bundle: true, write: false, logLevel: "silent",
    plugins: [{ name: "stub", setup(b) {
      b.onResolve({ filter: /api[/\\]card\.js$/ }, (a) => (a.importer.endsWith("public-reading-deploy/api/card.js") ? { path: "inner", namespace: "stub" } : undefined));
      b.onResolve({ filter: /authorization\.js$/ }, () => ({ path: "auth", namespace: "stub" }));
      b.onLoad({ filter: /.*/, namespace: "stub" }, (a) => (a.path === "inner"
        ? { loader: "js", contents: innerSource }
        : { loader: "js", contents: `export const CANONICAL_ORIGIN='${CANONICAL}';export const deploymentAuthorized=()=>true;export const publicReadingOriginAllowed=o=>['${CANONICAL}','https://preview.invalid'].includes(o);` }));
    } }],
  });
  return (await import("data:text/javascript;base64," + Buffer.from(outputFiles[0].text).toString("base64"))).default;
}

const settledFlag = (promise) => {
  const state = { settled: false };
  promise.then(() => { state.settled = true; }, () => { state.settled = true; });
  return state;
};
const flush = () => new Promise((resolve) => setImmediate(resolve));

const STALLED_BODY = `export default async () => new Response(new ReadableStream({ start() {} }), { status: 200, headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000' } });`;
const NEVER_RETURNS = `export default () => new Promise(() => {});`;

for (const [label, inner] of [["headers sent, body never arrives (what ImageResponse does)", STALLED_BODY], ["handler never returns", NEVER_RETURNS]]) {
  test(`wrapper answers 504 no-store at the deadline: ${label}`, async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const logged = [];
    t.mock.method(console, "error", (...args) => { if (String(args[0]).startsWith("api/card:")) logged.push(args.join(" ")); }); // not Node's own MockTimers warning
    const wrapper = await wrapperWith(inner);
    for (const method of ["GET", "HEAD"]) {
      const pending = wrapper(new Request(`${CANONICAL}/api/card?w=${encodeURIComponent("∩⊂")}`, { method }));
      const state = settledFlag(pending);
      t.mock.timers.tick(CARD_DEADLINE_MS - 1);
      await flush();
      assert.equal(state.settled, false, "still waiting one millisecond before the deadline");
      t.mock.timers.tick(1);
      const res = await pending;
      assert.equal(res.status, 504);
      assert.equal(res.headers.get("Cache-Control"), "no-store", "an error is never cached, canonical origin or not");
      assert.equal(res.headers.get("X-Robots-Tag"), "noindex, nofollow, noarchive");
      assert.equal(res.headers.get("Content-Type"), "text/plain; charset=utf-8");
      const text = await res.text();
      if (method === "HEAD") assert.equal(text, "");
      else assert.ok(text.length > 0 && text.length < 100, "tiny body");
    }
    assert.equal(logged.length, 2, JSON.stringify(logged));
    assert.match(logged[0], /api\/card: render exceeded 10000 ms/);
  });
}

test("wrapper: a render that finishes in time is unchanged, including the DEF-015 CDN cache", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const logged = [];
  t.mock.method(console, "error", (...args) => { if (String(args[0]).startsWith("api/card:")) logged.push(args); });
  const wrapper = await wrapperWith(`export default async () => new Response(new ReadableStream({ start(c) { setTimeout(() => { c.enqueue(new Uint8Array([137, 80, 78, 71])); c.close(); }, ${CARD_DEADLINE_MS - 1_000}); } }), { status: 200, headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000' } });`);
  for (const [method, cache, bytes] of [["GET", "public, s-maxage=3600, stale-while-revalidate=86400", [137, 80, 78, 71]], ["HEAD", "no-store", []]]) {
    const pending = wrapper(new Request(`${CANONICAL}/api/card?w=x`, { method }));
    await flush(); // the renderer has started and registered its own timer
    t.mock.timers.tick(CARD_DEADLINE_MS - 1_000);
    const res = await pending;
    assert.equal(res.status, 200, method);
    assert.equal(res.headers.get("Content-Type"), "image/png");
    assert.equal(res.headers.get("Cache-Control"), cache, method);
    assert.deepEqual([...new Uint8Array(await res.arrayBuffer())], bytes, method);
  }
  t.mock.timers.tick(CARD_DEADLINE_MS * 3);
  await flush();
  assert.deepEqual(logged, [], "the deadline timer was cleared; nothing fires after a finished render");
});
