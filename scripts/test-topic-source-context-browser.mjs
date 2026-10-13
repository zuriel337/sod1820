// Local branch UI + live anonymous public readers. No product writes; all non-read requests
// are blocked except the existing read-only gematria RPC. Requires Vite and Playwright.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
const playwright = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const { chromium } = playwright.default || playwright;
const base = process.env.SOURCE_CONTEXT_BASE_URL || "http://127.0.0.1:4173";
const output = process.env.SOURCE_CONTEXT_ARTIFACTS || "/tmp/sod1820-source-context-browser";
await fs.mkdir(output, { recursive: true });
const fixture = JSON.parse(await fs.readFile(new URL("../test/fixtures/topic-source-context-pilot.json", import.meta.url)));
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ["--no-sandbox"] });
const receipts = { base, verifiedAt: new Date().toISOString(), deployment: "local_branch_live_anonymous_data", widths: [], blockedWrites: [], pageErrors: [], sourceReaders: [], ownerDependencies: [] };
const rail = "8940efb2-8423-4a27-a10a-d3fdd07cf595";
const shared = "5579cca1-ff12-4a9a-87ee-e32e89ca9af3";
const captain = "media:post:5112:source-region-smit-machchhar";
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    page.on("pageerror", (error) => receipts.pageErrors.push(error.message));
    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const isRead = ["GET", "HEAD", "OPTIONS"].includes(request.method())
        || (url.hostname === "linswmnnkjxvweumprav.supabase.co" && url.pathname === "/rest/v1/rpc/gematria_api");
      if (!isRead) {
        receipts.blockedWrites.push({ method: request.method(), path: url.pathname });
        return route.fulfill({ status: 403, body: "Browser verification is read-only" });
      }
      // Vite multi-page development does not implement the production /topic,/post rewrites.
      // Only the HTML entry is adapted; no data responses are mocked.
      if (url.origin === new URL(base).origin && request.isNavigationRequest() && /^\/(topic|post)\//.test(url.pathname)) {
        const response = await context.request.get(`${base}/2029.html`);
        return route.fulfill({ status: response.status(), contentType: "text/html", body: await response.body() });
      }
      return route.continue();
    });
    const cases = [];
    const openTopic = async (slug, count, hash = "") => {
      await page.goto(`${base}/topic/${slug}${hash}`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("[data-source-coverage]", { timeout: 45000 });
      assert.equal(await page.locator("[data-source-media-id]").count(), count, slug);
    };
    await openTopic("india-axis", 14);
    const captainCard = page.locator(`[data-source-media-id="${captain}"]`);
    assert.equal(await captainCard.getAttribute("data-relation-kind"), "documented_source_mention");
    assert.equal(await captainCard.locator("[data-original-post-caption]").textContent(), fixture.post.content.match(/<figcaption>([\s\S]*?)<\/figcaption>/)[1]);
    await captainCard.locator(".sod29-canonical-media-figure").click();
    await page.waitForSelector('[role="dialog"]');
    await page.waitForFunction(() => [...document.querySelectorAll('[role="dialog"] img')].some((img) => img.complete && img.naturalWidth > 0));
    const captainHref = page.url();
    assert.match(captainHref, /#topic-source-media-post-5112-source-region-smit-machchhar$/);
    assert.ok(await page.locator('[role="dialog"] img').evaluateAll((images) => images.some((img) => img.src.endsWith("smit-machchhar-source-20261001.jpg"))));
    await page.keyboard.press("Escape");
    await page.waitForSelector('[role="dialog"]', { state: "detached" });
    await page.waitForSelector(`[data-source-media-id="${captain}"][data-source-selected="true"]`);
    assert.equal(await captainCard.getAttribute("data-source-selected"), "true");
    const selectedContext = await page.evaluate(() => JSON.parse(sessionStorage.getItem("sod_research_context_v2:guest")));
    assert.equal(selectedContext.selection.sourceRef, "post:flydubai-fz1073-363-14000-remzei-geula#source-region-smit-machchhar");
    assert.match(selectedContext.dimensions.surfaceFocus.reason, /אזרח הודי/);
    assert.equal(selectedContext.journey, null);
    await page.screenshot({ path: path.join(output, `india-captain-${width}.png`) });
    await captainCard.getByRole("link", { name: "פתח את הפוסט המקורי" }).click();
    await page.waitForURL(/\/post\/flydubai-fz1073.*#source-region-smit-machchhar$/);
    await page.waitForSelector("#source-region-smit-machchhar", { state: "attached", timeout: 45000 });
    assert.ok((await page.locator("#source-region-smit-machchhar").textContent()).includes("סמיט"));
    receipts.ownerDependencies.push({ width, owner: "Posts", region: "source-region-smit-machchhar", visible: await page.locator("#source-region-smit-machchhar").isVisible(), status: "locator_exists_visible_region_reopen_not_certified" });
    await page.goBack({ waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-source-selected="true"]', { timeout: 45000 });
    assert.equal(page.url(), captainHref);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-source-selected="true"]', { timeout: 45000 });
    assert.equal(await page.locator('[data-source-selected="true"]').getAttribute("data-source-media-id"), captain);
    cases.push("India 13 public gallery sources + captain; full image; post link retaining source locator; back + reload exact card");

    await openTopic("hodu", 1, `#topic-source-${rail}`);
    await page.waitForFunction((id) => JSON.parse(sessionStorage.getItem("sod_research_context_v2:guest"))?.selection?.entityId === id, rail);
    const topicContext = await page.evaluate(() => JSON.parse(sessionStorage.getItem("sod_research_context_v2:guest")));
    assert.equal(topicContext.dimensions.readingFocus, undefined);
    assert.deepEqual(topicContext.dimensions.surfaceFindings, [], "previous Post connections cannot appear as source context in Hodu");
    const railCard = page.locator("[data-source-media-id]");
    assert.equal(await railCard.locator("details").count(), 2);
    for (const details of await railCard.locator("details").all()) await details.locator("summary").click();
    const captions = await railCard.locator("[data-original-caption]").evaluateAll((els) => els.map((el) => [el.dataset.originalCaption, el.textContent]));
    for (const [id, text] of captions) assert.equal(text, fixture.images.find((row) => row.id === id).description);
    const galleryLinks = await railCard.locator('a[href^="/archive?"]').evaluateAll((els) => els.map((el) => el.getAttribute("href")));
    assert.deepEqual(galleryLinks, ["/archive?tab=galleries&gal=28", "/archive?tab=galleries&gal=54"]);
    assert.match(await railCard.innerText(), /ההופעות אינן ראיות עצמאיות/);
    await railCard.locator(".sod29-canonical-media-figure").click();
    await page.waitForSelector('[role="dialog"]');
    await page.keyboard.press("Escape");
    await page.waitForSelector('[role="dialog"]', { state: "detached" });
    cases.push("Hodu one source, two original gallery placements/captions, full image");
    await page.screenshot({ path: path.join(output, `hodu-${width}.png`) });

    await openTopic("1237", 6, `#topic-source-${shared}`);
    assert.equal(await page.locator('[data-source-selected="true"]').getAttribute("data-source-media-id"), `media:gallery_image:${shared}`);
    const coverageCard = page.locator(`[data-source-media-id="media:gallery_image:${shared}"]`);
    assert.match(await coverageCard.locator(".sod29-topic-source-reason").textContent(), /1237/);
    await coverageCard.locator("summary").click();
    assert.match(await coverageCard.innerText(), /נגזר מתיקייה/);
    await coverageCard.getByRole("link", { name: "המקור הבא בציר" }).click();
    await page.waitForFunction((id) => document.querySelector('[data-source-selected="true"]')?.dataset.sourceMediaId === `media:gallery_image:${id}`, "3fbb81ba-002f-417b-be1b-6eed1feba3c8");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `no horizontal overflow at ${width}`);
    cases.push("1237 six sources, shared identity/different explanation, derived-date label, next-source exact anchor");
    await page.screenshot({ path: path.join(output, `1237-${width}.png`) });
    if (width === 1440) {
      receipts.sourceReaders = await page.evaluate(async () => {
        const { fetchTopicSourceContext } = await import("/src/lib/research/entityHubProjection.js");
        return Promise.all(["india-axis", "hodu", "1237"].map(async (topicSlug) => {
          const data = await fetchTopicSourceContext({ topicSlug });
          return { topicSlug, coverage: data.coverage, sources: data.items.map((item) => ({ mediaId: item.mediaId, sourceIdentity: item.sourceIdentity, contextRelations: item.contextRelations, reopen: item.reopen })) };
        }));
      });
    }
    receipts.widths.push({ width, cases });
    await context.close();
  }
  assert.deepEqual(receipts.pageErrors, []);
  console.log(JSON.stringify({ status: "PASS", widths: receipts.widths, sourceReaders: receipts.sourceReaders.map(({ topicSlug, coverage }) => ({ topicSlug, coverage })), blockedWriteCount: receipts.blockedWrites.length, output }, null, 2));
} catch (error) {
  receipts.error = error.stack;
  console.error(error);
  process.exitCode = 1;
} finally {
  await fs.writeFile(path.join(output, "receipt.json"), JSON.stringify(receipts, null, 2));
  await browser.close();
}
