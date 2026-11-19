// Run after npm run build. The compiled public gallery and its selectors run normally.
// The tiny VP9-in-MP4 fixture also decodes in Chromium builds without H.264.
import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import { chromium } from "playwright";

const origin = "https://gallery.test";
const storage = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/";
const videoUrl = storage + "fixture/original.mp4";
const gallery = { id: "10000000-0000-4000-8000-000000000087", wp_gallery_id: 87, name: "גלריית בדיקה" };
const rows = ["סרטון", "תמונה", "תמונה נוספת"].map((name, index) => ({
  id: `10000000-0000-4000-8000-00000000000${index}`, gallery_id: gallery.id, wp_gallery_id: 87,
  ordering: index, name, image_url: storage + index + ".png", published: 1, min_tier: 0,
  curator_hidden: false, source: "update",
  ocr_meta: index === 0 ? { video_url: videoUrl } : index === 2 ? { video_url: "https://external.test/video.mp4" } : {},
}));

for (const width of [390, 1440]) {
  test(`gallery plays public video on demand at ${width}px`, async () => {
    const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH });
    try {
      const page = await browser.newPage({ viewport: { width, height: 900 }, serviceWorkers: "block" });
      let mediaRequests = 0;
      await page.route("**/*", async route => {
        const url = new URL(route.request().url());
        if (url.href === videoUrl) {
          mediaRequests++;
          return route.fulfill({ path: resolve("test/fixtures/media/gallery-playback.mp4"), contentType: "video/mp4" });
        }
        if (url.href.startsWith(storage)) return route.fulfill({
          contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="320"/>',
        });
        if (url.pathname.startsWith("/rest/v1/")) {
          const table = url.pathname.split("/").pop();
          return route.fulfill({ json: table === "gallery_images" ? rows : table === "galleries" ? [gallery] : [] });
        }
        if (url.origin !== origin) return route.abort();
        if (url.pathname === "/world") return route.fulfill({ path: resolve("dist/2029.html") });
        if (/^\/(assets|fonts|brand)\//.test(url.pathname)) return route.fulfill({ path: resolve("dist", "." + url.pathname) });
        return route.fulfill({ status: 404, body: "" });
      });
      const href = `${origin}/world?view=gallery&gallery=87&image=${rows[0].id}#gallery-source-${rows[0].id}`;
      await page.goto(href);
      const card = page.locator(`[data-gallery-image-id="${rows[0].id}"]`);
      const play = card.getByRole("button", { name: "הפעלת הסרטון · סרטון" });
      await play.waitFor({ timeout: 15000 });
      for (const row of rows.slice(1)) {
        const photo = page.locator(`[data-gallery-image-id="${row.id}"]`);
        assert.equal(await photo.locator("a.g29-canvas").getAttribute("href"), row.image_url);
      }
      assert.equal(await card.locator("video").count(), 0);
      assert.equal(mediaRequests, 0);
      if (width === 390) await play.click();
      else await play.press("Enter");
      const video = card.locator("video");
      assert.equal(await video.getAttribute("src"), videoUrl);
      await page.waitForFunction(() => {
        const player = document.querySelector(".g29-video-player video");
        return player?.controls && player.playsInline && !player.paused && player.currentTime > 0;
      }, null, { timeout: 10000 });
      assert.ok(mediaRequests > 0);
      assert.equal(page.url(), href);
    } finally {
      await browser.close();
    }
  });
}
