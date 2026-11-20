import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { retiredCollectionContinuation } from "../public-reading-deploy/api/public-document.js";
import { firstWordsFamily2029, firstWordsFacts2029, firstWordsHtml2029, withFirstWords2029, FIRST_WORDS_MAX_BYTES } from "../public-reading-deploy/first-words.js";

// First words: a public page that is not a Post carries its own heading, statement and links in the document (ZURIEL 20.11.2026).
// Synthetic sources only; no network.
const json = value => new Response(JSON.stringify(value), { status: 200, headers: { "Content-Type": "application/json" } });
function source(routes, calls = []) {
  return async (url, init = {}) => {
    const { pathname, search } = new URL(url);
    calls.push({ path: pathname + decodeURIComponent(search), authorization: init.headers?.Authorization, method: init.method || "GET" });
    for (const [pattern, answer] of routes) if (pattern.test(pathname + decodeURIComponent(search))) return typeof answer === "function" ? answer() : json(answer);
    return new Response("[]", { status: 404 });
  };
}

test("only the named public families have first words; a query string, a private or an unknown address has none", () => {
  assert.deepEqual(firstWordsFamily2029("/number/787"), { kind: "number", value: 787 });
  assert.deepEqual(firstWordsFamily2029("/number/" + encodeURIComponent("נטע")), { kind: "phrase", phrase: "נטע" });
  assert.deepEqual(firstWordsFamily2029("/gematria/"), { kind: "gematria" });
  assert.deepEqual(firstWordsFamily2029("/community/calculator"), { kind: "community-calculator" });
  assert.deepEqual(firstWordsFamily2029("/codes"), { kind: "codes" });
  assert.equal(firstWordsFamily2029("/codes/מחקר"), null);
  for (const path of ["/", "/2029/me/profile", "/number/0", "/number/1234567890123", "/post/x", "/number/%E0%A4%A", "/journey"]) assert.equal(firstWordsFamily2029(path), null, path);
});

test("a number page lists only verified published phrases, its published posts and a way back to the calculator", async () => {
  const calls = [];
  const fetchImpl = source([
    [/gematria_words\?ragil=eq\.787/, [{ phrase: "תשפז" }, { phrase: "אשם תלוי" }, { phrase: "תשפז" }]],
    [/number_anchors/, [{ fact: "787 = תשפ״ז", hint: null }]],
    [/rpc\/posts_by_number_strict/, [{ slug: "flight-1073", title: "טיסה 1073", date: "2026-09-30T20:15:36Z", wp_id: 37044 }]],
    [/posts\?slug=in/, [{ id: 9, slug: "flight-1073", wp_id: 37044, source: "ai", link: null, title: "טיסה <b>1073</b>", date: "2026-09-30T20:15:36Z" }]],
  ], calls);
  const html = firstWordsHtml2029(await firstWordsFacts2029("/number/787", { fetchImpl }));
  assert.match(html, /<main class="sod29-first-words" data-first-words="number"><h1>787 בגימטריה<\/h1>/);
  assert.match(html, /2 ביטויים מאומתים/);
  assert.match(html, new RegExp(`href="/number/${encodeURIComponent("אשם תלוי")}"`));
  assert.match(html, /href="\/post\/flight-1073">טיסה 1073<\/a> <span>30\.09\.2026<\/span>/);
  assert.match(html, /href="\/gematria"/);
  const words = calls.find(call => call.path.includes("gematria_words"));
  assert.match(words.path, /is_verified=eq\.true&is_published=eq\.true/);
  assert.ok(calls.every(call => /^Bearer /.test(call.authorization)));
});

test("a phrase gets words only when it is a verified published row; free text creates nothing", async () => {
  const fetchImpl = source([
    [/gematria_words\?phrase=eq\.נטע/, [{ phrase: "נטע", ragil: 129 }]],
    [/gematria_words\?ragil=eq\.129/, [{ phrase: "נטע" }, { phrase: "עונג" }]],
    [/gematria_words\?phrase=eq\./, []],
  ]);
  const html = firstWordsHtml2029(await firstWordsFacts2029("/number/" + encodeURIComponent("נטע"), { fetchImpl }));
  assert.match(html, /<h1>נטע בגימטריה = 129<\/h1>/);
  assert.match(html, /href="\/number\/129">129<\/a>/);
  assert.match(html, new RegExp(`href="/number/${encodeURIComponent("עונג")}">עונג</a>`));
  assert.doesNotMatch(html, new RegExp(`<li><a href="/number/${encodeURIComponent("נטע")}"`));
  assert.equal(firstWordsHtml2029(await firstWordsFacts2029("/number/" + encodeURIComponent("שם פרטי שהוקלד"), { fetchImpl })), "");
  assert.equal(await firstWordsFacts2029("/number/787", { search: "focus=x", fetchImpl }), null);
});

test("the calculators read picked phrases only from the one activity reader, never label them as searches, and stay whole without it", async () => {
  const recent = [{ phrase: "אור", ragil: 207, created_at: "2026-11-01" }];
  const without = firstWordsHtml2029(await firstWordsFacts2029("/community/calculator", { fetchImpl: source([[/gematria_words/, recent], [/rpc\/research_pulse_2029/, () => new Response("{}", { status: 404 })]]) }));
  assert.match(without, /<h1>מחשבון גימטריה חינם<\/h1>/);
  assert.match(without, /שאלות נפוצות/);
  assert.match(without, new RegExp(`href="/number/${encodeURIComponent("אור")}">אור</a> <span>= 207</span>`));
  assert.doesNotMatch(without, /ביטויים נבחרים/);
  const calls = [];
  const withPulse = firstWordsHtml2029(await firstWordsFacts2029("/gematria", { fetchImpl: source([[/gematria_words/, recent],
    [/rpc\/research_pulse_2029/, { version: 1, hours: 168, phrases: [{ phrase: "משיח", value: 358, events: 9 }] }]], calls) }));
  assert.match(withPulse, /<h2>ביטויים נבחרים השבוע<\/h2><ul><li><a href="\/number\/[^"]+">משיח<\/a> <span>= 358<\/span>/);
  assert.ok(!calls.some(call => /gematria_wall|search_log|visitor_events/.test(call.path)), "no second statistics source");
  assert.doesNotMatch(withPulse, /חיפש|חיפוש/, "approved picked phrases are never presented as searches");
  // Without the reader's own seven-day window the block names no period.
  const noPeriod = firstWordsHtml2029(await firstWordsFacts2029("/gematria", { fetchImpl: source([[/gematria_words/, recent],
    [/rpc\/research_pulse_2029/, { version: 1, hours: 24, phrases: [{ phrase: "משיח", value: 358, events: 9 }] }]]) }));
  assert.match(noPeriod, /<h2>ביטויים נבחרים<\/h2>/);
  assert.doesNotMatch(noPeriod, /השבוע/);
  const wrong = firstWordsHtml2029(await firstWordsFacts2029("/gematria", { fetchImpl: source([[/gematria_words/, recent], [/rpc\/research_pulse_2029/, { version: 2, phrases: [{ phrase: "x", value: 1 }] }]]) }));
  assert.doesNotMatch(wrong, /ביטויים נבחרים/);
});

test("words are escaped, bounded, and a failing source leaves no words", async () => {
  const html = firstWordsHtml2029({ kind: "taxonomy", taxonomyKind: "category", label: 'סוד <החשמל> "x"', posts: [{ slug: "a", source: "ai", title: "<script>alert(1)</script>כותרת", date: "2026-01-02" }] });
  assert.doesNotMatch(html.replace(/^<style>.*?<\/style>/, ""), /<script|<החשמל>/);
  assert.match(html, /href="\/post\/a">alert\(1\) כותרת<\/a>/);
  assert.equal(firstWordsHtml2029({ kind: "codes", codes: Array.from({ length: 4000 }, (_, i) => ({ slug: "צופן-" + i, title: "צופן ארוך מאוד " + i })) }), "");
  assert.ok(FIRST_WORDS_MAX_BYTES <= 24000);
  assert.equal(await firstWordsFacts2029("/number/787", { fetchImpl: async () => { throw new Error("down"); } }), null);
  assert.equal(await firstWordsFacts2029("/number/787", { fetchImpl: async () => new Response("{}", { status: 500 }) }), null);
  assert.equal(firstWordsHtml2029(null), "");
});

test("the words enter the real opening shell once, after its status line, and nothing else in the document moves", async () => {
  const shell = await readFile(new URL("../2029.html", import.meta.url), "utf8");
  const fragment = firstWordsHtml2029({ kind: "topic", topic: { title: "45 — התדר", subtitle: "מ״ה", highlight_numbers: [45] } });
  const out = withFirstWords2029(shell, fragment);
  assert.equal(out.state, "served");
  assert.equal(out.html.replace(fragment, ""), shell);
  assert.match(out.html, /role="status">פותח את העמוד<\/span><style>[^<]*<\/style><main class="sod29-first-words" data-first-words="topic">/);
  assert.equal(withFirstWords2029(out.html, fragment).html, out.html, "never twice");
  assert.deepEqual(withFirstWords2029(shell, ""), { html: shell, state: "none" });
  assert.equal(withFirstWords2029("<html></html>", fragment).state, "no-slot");
});

test("the retired lessons archive continues once at the collection that holds its posts; nothing else is redirected", () => {
  const target = encodeURI("/category/סוד-החשמל");
  for (const path of ["/category/שיעורי-שמע-סוד-החשמל", "/category/שיעורי-שמע-סוד-החשמל/", encodeURI("/category/שיעורי-שמע-סוד-החשמל"), "/category/שיעורי-שמע-סוד-החשמל/page/11"])
    assert.equal(retiredCollectionContinuation(path), target, path);
  for (const path of ["/category/סוד-החשמל", "/שיעורי-שמע-סוד-החשמל", "/category/שיעורי-שמע-סוד-החשמל/x", "/category/%E0%A4%A", "/category/toString"])
    assert.equal(retiredCollectionContinuation(path), null, path);
  assert.equal(retiredCollectionContinuation("/category/שיעורי-שמע-סוד-החשמל", "q=x"), null);
});
