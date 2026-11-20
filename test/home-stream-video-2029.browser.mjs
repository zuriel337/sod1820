// Run after VITE_HOME_2029_ENABLED=true VITE_PUBLIC_FOUNDATION_PREVIEW=true npm run build.
// Compiled home with anonymous fixture reads and a decodable local video.
import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

const id = "b83221ae-53bc-59f4-8cb6-158c852db7af";
const origin = "https://home.test";
const media = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/fixture/";
const video = media + "original.mp4";
const date = "2026-11-19T10:00:00Z";
const gallery = { id, wp_gallery_id: 87, name: "בדיוק היום לפני 36 שנה. ביבי והרבי.", image_url: media + "poster.jpg",
  source: "update", published: 1, min_tier: 0, curator_hidden: false, stream_at: date, created_at: date, video };
const post = { id: 5107, slug: "fixture-map", title: "פרסום מפת המציאות", status: "publish", date,
  modified: date, content: "", excerpt: "", tags: ["מפת המציאות"], categories: [], source: "site", image_url: media + "map.jpg" };

for (const width of [390, 1440]) {
  test(`home stream feature layout and playback at ${width}px`, async () => {
    const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH });
    try {
      const page = await browser.newPage({ viewport: { width, height: 900 }, serviceWorkers: "block" });
      let downloads = 0;
      let visible = true;
      await page.route("**/*", async route => {
        const url = new URL(route.request().url());
        if (url.href === video) {
          downloads++;
          return route.fulfill({ path: resolve("test/fixtures/media/gallery-playback.mp4"), contentType: "video/mp4" });
        }
        if (url.href.startsWith(media)) return route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"/>' });
        if (url.pathname.startsWith("/rest/v1/")) {
          const table = url.pathname.split("/").pop();
          const featured = table === "gallery_images" && url.searchParams.get("id") === "eq." + id;
          return route.fulfill({ json: featured ? (visible ? [gallery] : []) : table === "posts" ? [post] : [] });
        }
        if (url.origin !== origin) return route.abort();
        const file = resolve("dist", url.pathname === "/" ? "2029.html" : "." + url.pathname);
        if (existsSync(file)) return route.fulfill({ path: file });
        return route.fulfill({ status: 404, body: "" });
      });
      await page.goto(origin);
      const card = page.locator(".h29-stream-video");
      const play = card.getByRole("button", { name: "הפעלת הסרטון · " + gallery.name });
      await play.waitFor({ timeout: 20000 });
      const map = page.locator(".h29-pinlead");
      const [mapBox, cardBox] = await Promise.all([map.boundingBox(), card.boundingBox()]);
      assert.ok(mapBox && cardBox);
      if (width === 390) assert.ok(cardBox.y >= mapBox.y + mapBox.height - 1);
      else assert.ok(Math.abs(cardBox.y - mapBox.y) < 2 && cardBox.x + cardBox.width <= mapBox.x + 1);
      assert.ok((await card.getByRole("link").getAttribute("href")).includes(id));
      assert.equal(downloads, 0);
      if (width === 390) await play.click();
      else await play.press("Enter");
      await page.waitForFunction(() => {
        const player = document.querySelector(".h29-stream-video video");
        return player?.controls && player.playsInline && !player.paused && player.currentTime > 0;
      });
      assert.ok(downloads > 0);
      if (width === 390) assert.ok((await card.locator("video").boundingBox()).width >= cardBox.width - 2);
      visible = false;
      const reread = page.waitForResponse(response => new URL(response.url()).searchParams.get("id") === "eq." + id);
      await page.reload();
      await reread;
      await page.locator(".h29-stream-slot").waitFor({ state: "detached" });
      assert.equal(await card.count(), 0);
      assert.ok(await page.locator(".h29-pinlead").isVisible());
    } finally { await browser.close(); }
  });
}
