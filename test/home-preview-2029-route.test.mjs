// HOME_LAYOUT_PREVIEW_V1 — the Home layout preview stays isolated: own route in the 2029 document,
// noindex, unlinked from public navigation, palette-owned colors, existing readers only.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("src/pages/HomePreview2029Page.jsx", "utf8");
const css = fs.readFileSync("src/pages/homePreview2029.css", "utf8");
const app = fs.readFileSync("src/App2029.jsx", "utf8");
const config = JSON.parse(fs.readFileSync("vercel.json", "utf8"));

test("preview route is served by the 2029 document with noindex", () => {
  assert.match(app, /<Route path="\/2029\/home-preview" element={<HomePreview2029Page \/>} \/>/);
  assert.ok(config.rewrites.some((row) => row.source === "/2029/home-preview" && row.destination === "/2029.html"));
  const headers = config.headers.find((row) => row.source === "/2029/home-preview");
  assert.ok(headers?.headers.some((header) => header.key === "X-Robots-Tag" && /noindex/.test(header.value)));
  assert.match(page, /noindex: true/);
});

test("preview is not linked from existing public surfaces", () => {
  for (const file of ["src/pages/Home2029Page.jsx", "src/components/experience2029/SystemFrame2029.jsx", "src/pages/HomeNewPage.jsx"]) {
    assert.ok(!fs.readFileSync(file, "utf8").includes("/2029/home-preview"), `${file} links the preview`);
  }
});

test("colors come from the palette owner, not page-local values", () => {
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(css, /rgba?\(/);
  assert.match(page, /use2029Palette\(\)/);
  assert.match(page, /setThemePreset/);
});

test("reads only through existing readers and never writes", () => {
  assert.doesNotMatch(page, /\.(insert|update|upsert|delete|rpc)\(/);
  assert.doesNotMatch(page, /from "\.\.\/lib\/supabase\.js";[\s\S]*\bsupabase\.from\(/);
  for (const reader of ["getLatestPostCards", "getTzofonStories", "getHomeVideos", "fetchHome2029Projection"]) {
    assert.match(page, new RegExp(reader));
  }
});
