// Smaller images for the article (ZURIEL 16.11.2026): copies of the SAME stored image from the Storage render endpoint (resize=contain: never
// cropped; the endpoint does not enlarge past the original, measured 16.11.2026: width=4000 of a 1440×1920 original returned 1440×1920), offered
// only where the markup reserves the image's size, so the choice of file never moves the text. The original stays the src.
import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { postArticleImages2029, postImageRenditionSet2029, POST_IMAGE_RENDITION_WIDTHS } from "../src/lib/research/postArticleCore2029.js";

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
