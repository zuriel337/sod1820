// Smaller images for the article (ZURIEL 16.11.2026): copies of the SAME stored image from the Storage render endpoint (resize=contain: never
// cropped; the endpoint does not enlarge past the original, measured 16.11.2026: width=4000 of a 1440×1920 original returned 1440×1920), offered
// only where the markup reserves the image's size, so the choice of file never moves the text. The original stays the src.
import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { postArticleImages2029, postImageRenditionSet2029, postArticleImageOriginals2029, postImageFactsFor2029, POST_IMAGE_RENDITION_WIDTHS } from "../src/lib/research/postArticleCore2029.js";

const STORE = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/uploads/2025/08/a.jpg";
const run = (html, options) => { const { window } = new JSDOM("<!doctype html><body></body>"); globalThis.document = window.document;
  try { const t = window.document.createElement("template"); t.innerHTML = postArticleImages2029(html, options); return t.content; } finally { delete globalThis.document; } };

test("a stored image with a reserved size gets width-bounded copies of itself; the original stays its source", () => {
  const set = postImageRenditionSet2029(STORE);
  assert.deepEqual(set.split(", ").map(entry => entry.split(" ")[1]), POST_IMAGE_RENDITION_WIDTHS.map(width => `${width}w`));
  for (const entry of set.split(", ")) assert.match(entry, /^https:\/\/linswmnnkjxvweumprav\.supabase\.co\/storage\/v1\/render\/image\/public\/media\/uploads\/2025\/08\/a\.jpg\?width=\d+&quality=80&resize=contain \d+w$/);
  const root = run(`<p><img src="${STORE}" width="750" height="500" srcset="${STORE} 750w" sizes="(max-width: 750px) 100vw, 750px" alt="x"></p>`, { cover: "https://c" });
  const image = root.querySelector("img");
  assert.equal(image.getAttribute("src"), STORE, "the original stays the source");
  assert.equal(image.getAttribute("srcset"), set);
  assert.equal(image.getAttribute("sizes"), "(max-width: 760px) min(calc(100vw - 68px), 750px), min(680px, 750px)", "never drawn wider than authored");
  assert.equal(image.getAttribute("loading"), "lazy"); assert.equal(image.getAttribute("decoding"), "async");
  assert.equal(image.getAttribute("width"), "750"); assert.equal(image.getAttribute("height"), "500"); assert.equal(image.getAttribute("alt"), "x");
});

test("animations, vector images, other hosts and images without a reserved size keep the original only", () => {
  for (const html of [`<img src="${STORE.replace(".jpg", ".gif")}" width="10" height="10">`, `<img src="${STORE.replace(".jpg", ".svg")}" width="10" height="10">`,
    '<img src="https://example.com/a.jpg" width="10" height="10">', `<img src="${STORE}">`, `<img src="${STORE}" width="10">`, `<img src="${STORE}?v=1" width="10" height="10">`]) {
    const image = run(html, {}).querySelector("img");
    assert.equal(image.hasAttribute("srcset"), false, html); assert.equal(image.hasAttribute("loading"), false, html);
  }
});

test("without a cover the first body image keeps its authored loading; with a cover every body image waits for the reader", () => {
  const html = `<p><img src="${STORE}" width="10" height="10"></p><p><img src="${STORE.replace("a.jpg", "b.jpg")}" width="10" height="10"></p>`;
  assert.deepEqual([...run(html, {}).querySelectorAll("img")].map(node => node.getAttribute("loading")), [null, "lazy"]);
  assert.deepEqual([...run(html, { cover: STORE }).querySelectorAll("img")].map(node => node.getAttribute("loading")), ["lazy", "lazy"]);
});

// With the original's real width known (scripts/scan-article-image-facts.mjs; 16.11.2026: 85% of 120 sampled originals are 1,270 px wide or less,
// so their "1080" and "1600" copies were the original re-encoded, sometimes heavier), copies are offered only where they are clearly smaller and
// the original itself is the widest candidate at its real width.
const widths = set => set.split(", ").map(entry => entry.split(" ")[1]);
test("with the original's width known: copies only up to 85% of it, the original itself the widest candidate at its real width", () => {
  assert.deepEqual(widths(postImageRenditionSet2029(STORE, { [STORE]: 1024 })), ["480w", "768w", "1024w"]);
  assert.equal(postImageRenditionSet2029(STORE, { [STORE]: 1024 }).split(", ").at(-1), `${STORE} 1024w`, "the widest is the original, not a re-encoded copy");
  assert.deepEqual(widths(postImageRenditionSet2029(STORE, { [STORE]: [2400, 1600, 512000] })), ["480w", "768w", "1080w", "1600w", "2400w"], "a [width, height, bytes] fact");
  assert.deepEqual(widths(postImageRenditionSet2029(STORE, { [STORE]: 903 })), ["480w", "903w"], "768 is not clearly smaller than 903");
  assert.equal(postImageRenditionSet2029(STORE, { [STORE]: 560 }), "", "too small for any copy: the original alone");
  assert.deepEqual(widths(postImageRenditionSet2029(STORE, { "https://other": 500 })), POST_IMAGE_RENDITION_WIDTHS.map(width => `${width}w`), "no fact: as before");
  assert.deepEqual(widths(postImageRenditionSet2029(STORE, { [STORE]: 0 })), POST_IMAGE_RENDITION_WIDTHS.map(width => `${width}w`), "an unreadable fact: as before");
});

test("in the article: a small original keeps no set (an authored one is dropped) but still waits for the reader; facts reach every image", () => {
  const B = STORE.replace("a.jpg", "b.jpg");
  const html = `<p><img src="${STORE}" width="750" height="500" srcset="${STORE} 750w" sizes="750px"></p><p><img src="${B}" width="400" height="300"></p>`;
  const [a, b] = run(html, { cover: "https://c", facts: { [STORE]: 1200, [B]: 400 } }).querySelectorAll("img");
  assert.deepEqual(widths(a.getAttribute("srcset")), ["480w", "768w", "1200w"]);
  assert.equal(a.getAttribute("sizes"), "(max-width: 760px) min(calc(100vw - 68px), 750px), min(680px, 750px)");
  assert.equal(b.hasAttribute("srcset"), false); assert.equal(b.hasAttribute("sizes"), false);
  assert.equal(b.getAttribute("loading"), "lazy"); assert.equal(b.getAttribute("decoding"), "async"); assert.equal(b.getAttribute("src"), B);
});

test("the originals copies apply to (cover and reserved-size Storage images), and the facts of exactly those", () => {
  const { window } = new JSDOM("<!doctype html><body></body>"); globalThis.document = window.document;
  try {
    const B = STORE.replace("a.jpg", "b.jpg"), C = STORE.replace("a.jpg", "c.jpg");
    const html = `<img src="${B}" width="10" height="10"><img src="${STORE.replace(".jpg", ".gif")}" width="10" height="10"><img src="https://example.com/x.jpg" width="1" height="1"><img src="${C}">`;
    assert.deepEqual(postArticleImageOriginals2029(html, STORE), [STORE, B]);
    assert.deepEqual(postArticleImageOriginals2029(html, "https://example.com/cover.jpg"), [B]);
  } finally { delete globalThis.document; }
  assert.deepEqual(postImageFactsFor2029([STORE, "https://x"], { [STORE]: [1024, 683, 151000], "https://y": [10, 10, 1] }), { [STORE]: 1024 });
});

// Centred media (ZURIEL 25.11.2026): a block that holds only media is marked, so post2029-reading.css centres it; words, lists and floats are not.
test("a block of media alone is a centred media row; a paragraph with words, a list and a nested block are not", () => {
  const root = run(`<p id="one"><img src="${STORE}" width="387" height="1024"></p>`
    + `<p id="pair"><a href="#"><img src="${STORE}" width="105" height="187"></a>&nbsp; <img src="${STORE}" width="387" height="187"></p>`
    + `<p id="video"><iframe src="https://www.youtube.com/embed/x"></iframe></p>`
    + `<p id="words">שמע ישראל <img src="${STORE}" width="10" height="10"></p>`
    + `<div id="outer"><p>טקסט</p><img src="${STORE}" width="10" height="10"></div>`
    + `<ul><li id="item"><img src="${STORE}" width="10" height="10"></li></ul>`, { cover: "c" });
  const marked = id => root.querySelector("#" + id).getAttribute("data-post-media-row");
  assert.equal(marked("one"), "true"); assert.equal(marked("pair"), "true", "side-by-side images stay one row"); assert.equal(marked("video"), "true");
  assert.equal(marked("words"), null, "a paragraph with words keeps its alignment");
  assert.equal(marked("outer"), null, "a block that holds other blocks is not a media row");
  assert.equal(marked("item"), "true");
  assert.equal(root.querySelectorAll("[data-post-media-row]").length, 4);
});

test("media at the top of the article, with no block around it, is its own centred row", () => {
  const root = run(`<img id="bare" src="${STORE}" width="387" height="1024"><a id="linked" href="#"><img src="${STORE}" width="10" height="10"></a><p>מילים</p>`, { cover: "c" });
  assert.equal(root.querySelector("#bare").getAttribute("data-post-media-row"), "true");
  assert.equal(root.querySelector("#linked").getAttribute("data-post-media-row"), "true");
  assert.equal(root.querySelector("p").hasAttribute("data-post-media-row"), false);
});

test("an image between words with no block around it stays in their line", () => {
  const root = run(`שמע <img id="inline" src="${STORE}" width="10" height="10"> ישראל`, {});
  assert.equal(root.querySelector("#inline").hasAttribute("data-post-media-row"), false);
});
