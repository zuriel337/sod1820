import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

// The WordPress body copy of the cover (the largest paint on many old posts) loses its imported loading="lazy"; every other image keeps it.
// Real Chromium: postReadingHtml2029 needs a real <template> parser.
test("postReadingHtml2029: only the body copy of the cover becomes eager", async () => {
  const bundle = await build({ entryPoints: ["src/lib/research/post2029ReadingProjection.js"], bundle: true, write: false, format: "iife", globalName: "__projection",
    platform: "browser", define: { "import.meta.env.VITE_PUBLIC_READING_RELEASE": '"false"' }, logLevel: "silent" });
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  try {
    const page = await browser.newPage();
    await page.setContent("<!doctype html><html><body></body></html>");
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    const out = await page.evaluate(() => {
      const cover = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/uploads/2025/08/c1a17b6b6ed632f2.webp";
      const html = `<p><img class="aligncenter size-full" loading="lazy" src="${cover}" srcset="${cover} 1070w"></p><p>text</p><img loading="lazy" src="https://example.invalid/other.webp"><img src="${cover}">`;
      const t = document.createElement("template");
      t.innerHTML = window.__projection.postReadingHtml2029(html, { coverHref: cover });
      const images = [...t.content.querySelectorAll("img")].map((img) => ({ src: img.getAttribute("src"), loading: img.getAttribute("loading") }));
      const t2 = document.createElement("template");
      t2.innerHTML = window.__projection.postReadingHtml2029(html);
      const without = [...t2.content.querySelectorAll("img")].map((img) => img.getAttribute("loading"));
      return { images, without };
    });
    assert.deepEqual(out.images.map((i) => i.loading), ["eager", "lazy", null], JSON.stringify(out.images));
    assert.deepEqual(out.without, ["lazy", "lazy", null], "without a cover address nothing changes");
  } finally { await browser.close(); }
});
