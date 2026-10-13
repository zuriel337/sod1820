// Local UI, live anonymous public reads. No live auth or product writes.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
const pw = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const { chromium } = pw.default || pw;
const base = process.env.WORLD_STORY_BASE || "http://127.0.0.1:4175";
const out = process.env.WORLD_STORY_ARTIFACTS || "/workspace/artifacts/world-source-story-20261009";
await fs.mkdir(out, { recursive: true });
const receipt = { head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), at: new Date().toISOString(),
  environment: "local Vite; real anonymous public readers; all remote mutations blocked", cases: [], blocked: [], errors: [] };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"] });
const captain = "media:post:5112:source-region-smit-machchhar";
const anchor = "#topic-source-media-post-5112-source-region-smit-machchhar";
const sourceUrl = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/sod1820/posts/fz1073/smit-machchhar-source-20261001.jpg";
let page;
try {
  for (const width of [1440, 390]) for (const theme of ["dark", "light", "parchment"]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    await context.addInitScript((preset) => localStorage.setItem("sod-theme", preset), theme);
    let missing = false;
    await context.route("**/*", async (route) => {
      const req = route.request(), url = new URL(req.url());
      if (url.origin === base && req.isNavigationRequest() && /^\/(world|topic|post|2029\/number)\b/.test(url.pathname)) {
        const html = await context.request.get(`${base}/2029.html`);
        return route.fulfill({ contentType: "text/html", body: await html.body() });
      }
      if (missing && url.pathname === "/rest/v1/posts" && url.searchParams.get("id") === "eq.5112") {
        return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "source deliberately unavailable in test" }) });
      }
      const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/(.+)$/)?.[1];
      const read = ["GET", "HEAD", "OPTIONS"].includes(req.method()) || (url.hostname === "linswmnnkjxvweumprav.supabase.co"
        && ["gematria_api", "fn_method_profile", "gematria_method_trace", "fn_zero_scale", "posts_by_number_strict", "fn_number_lookup", "fn_number_dossier", "fn_number_journey", "number_neighbors", "fn_all_methods"].includes(rpc));
      if (!read) {
        receipt.blocked.push({ method: req.method(), path: url.pathname });
        return route.fulfill({ status: 403, contentType: "application/json", body: '{"error":"read-only browser verification"}' });
      }
      return route.continue();
    });
    page = await context.newPage();
    page.on("pageerror", (error) => receipt.errors.push(error.message));
    const capture = async (name) => page.screenshot({ path: `${out}/${name}-${theme}-${width}.png` });
    const saved = () => page.evaluate(() => JSON.parse(sessionStorage.getItem("sod_research_context_v2:guest")));
    const exactReturn = async () => {
      if (width < 700) await page.getByRole("button", { name: "פתח ניווט" }).click();
      await page.getByRole("button", { name: "חזרה מדויקת", exact: true }).filter({ visible: true }).first().click();
    };
    const sourceSection = () => page.locator("#world-plane-india");
    await page.goto(`${base}/world`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "מה מחבר את המטוס להודו?" }).waitFor({ timeout: 60000 });
    await capture("world-story");
    await page.getByRole("button", { name: "מה מחבר את המטוס להודו?" }).click();
    await sourceSection().waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('#world-plane-india img')].some((img) => img.complete && img.naturalWidth > 0));
    await sourceSection().getByText("הכיתוב והקרדיט המקוריים", { exact: true }).click();
    const originalCaption = await page.locator('[data-world-original-caption]').textContent();
    assert.match(originalCaption, /אזרח הודי/);
    await sourceSection().getByText("הכיתוב והקרדיט המקוריים", { exact: true }).click();
    await capture("world-india");
    await page.getByRole("button", { name: "פתח את תמונת המקור של הקפטן" }).click();
    await page.getByRole("dialog").waitFor();
    await capture("world-image");
    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("link", { name: "פתח מקור", exact: true }).click();
    const popup = await popupPromise;
    await popup.waitForLoadState("domcontentloaded");
    assert.equal(popup.url(), sourceUrl);
    await popup.waitForFunction(() => [...document.images].some((img) => img.complete && img.naturalWidth > 0));
    await popup.screenshot({ path: `${out}/original-${theme}-${width}.png` });
    await popup.close();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "detached" });
    assert.equal(new URL(page.url()).hash, "#world-plane-india");
    assert.equal((await saved()).selection.entityId, captain);
    assert.equal((await saved()).journey, null, "ordinary source selection is not a Path start");
    const visibleWorld = await sourceSection().boundingBox();
    assert.ok(visibleWorld.y < 700 && visibleWorld.y > -100, "return from original keeps World source visible");
    await page.getByRole("button", { name: "המשך לציר ההודי — באותה תמונה" }).click();
    await page.waitForURL(`**/topic/india-axis${anchor}`);
    const card = page.locator(`[data-source-media-id="${captain}"]`);
    await card.waitFor({ timeout: 60000 });
    await page.waitForFunction((id) => JSON.parse(sessionStorage.getItem('sod_research_context_v2:guest'))?.selection?.entityId === id, captain);
    assert.equal(await card.locator("[data-original-post-caption]").textContent(), originalCaption);
    assert.equal((await saved()).returnTo.href, "/world#world-plane-india");
    await card.locator(".sod29-canonical-media-figure").click();
    await page.getByRole("dialog").waitFor();
    assert.equal(await page.getByRole("link", { name: "פתח מקור", exact: true }).getAttribute("href"), sourceUrl);
    await page.keyboard.press("Escape");
    await capture("topic-source-returned");
    assert.equal(await card.getAttribute("data-source-selected"), "true");
    await exactReturn();
    await page.waitForURL("**/world#world-plane-india");
    await sourceSection().waitFor({ timeout: 60000 });
    await page.waitForFunction(() => { const r = document.getElementById("world-plane-india")?.getBoundingClientRect(); return r && r.top > 0 && r.top < 500; });
    assert.equal((await saved()).selection.entityId, captain);
    await capture("world-returned");
    await page.reload({ waitUntil: "domcontentloaded" });
    await sourceSection().waitFor({ timeout: 60000 });
    await page.waitForFunction(() => { const r = document.getElementById("world-plane-india")?.getBoundingClientRect(); return r && r.top > 0 && r.top < 500; });
    assert.equal((await saved()).selection.sourceRef, `post:flydubai-fz1073-363-14000-remzei-geula#source-region-smit-machchhar`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "no horizontal overflow");
    // Existing native Post region remains a separately owned visible-return gap.
    await page.getByRole("button", { name: "לקריאת פוסט המטוס" }).click();
    await page.waitForURL("**/post/flydubai-fz1073-363-14000-remzei-geula#source-region-smit-machchhar");
    await page.locator("#source-region-smit-machchhar").waitFor({ state: "attached", timeout: 60000 });
    const nativePostSourceVisible = await page.locator("#source-region-smit-machchhar").isVisible();
    await exactReturn();
    await sourceSection().waitFor({ timeout: 60000 });
    missing = true;
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByText("המקור לסיפור המטוס אינו זמין כרגע.", { exact: true }).waitFor({ timeout: 60000 });
    assert.equal(await page.locator('[data-world-source-identity]').count(), 0);
    await capture("source-unavailable");
    missing = false;
    await page.getByRole("button", { name: "נסה שוב", exact: true }).click();
    await sourceSection().waitFor({ timeout: 60000 });
    receipt.cases.push({ width, theme, status: "PASS", originalOpenedAndLoaded: true, worldExactReturn: true, topicSameSource: true,
      originalCaptionPreserved: true, reloadExact: true, unavailableFailClosedAndRetry: true, nativePostSourceVisible,
      selection: (await saved()).selection, sourceIdentity: await sourceSection().getAttribute("data-world-source-identity") });
    await fs.writeFile(`${out}/browser-receipt.json`, JSON.stringify(receipt, null, 2));
    console.log(`PASS World story ${theme} ${width}; native Post source visible=${nativePostSourceVisible}`);
    if (theme === "dark") {
      await page.evaluate(() => sessionStorage.removeItem("sod_research_context_v2:guest"));
      await page.goto(`${base}/2029/number/878`, { waitUntil: "domcontentloaded" });
      const path = page.locator('[data-number-path-continuation]');
      await path.getByRole('button', { name: 'התחל מסע מהבחירה', exact: true }).click({ timeout: 60000 });
      await page.waitForURL(`${base}/world`);
      await page.getByText('אתה בתוך מסע 878', { exact: true }).waitFor({ timeout: 60000 });
      assert.equal((await saved()).journey.root.id, '878');
      assert.equal(await page.locator('.sod29-world-source-story').count(), 0, "ordinary anchored World remains the 878 experience");
      await exactReturn();
      await page.waitForURL(`${base}/2029/number/878`);
      await path.getByRole('button', { name: 'שמירה וחידוש', exact: true }).click();
      await page.getByRole('button', { name: 'שמור מסלול', exact: true }).click();
      await page.getByText('המסלול לא עודכן', { exact: true }).waitFor();
      await capture('878-guest');
      receipt.cases.push({ width, slug: '878', status: 'PASS', worldReturn: true, guestSaveDenied: true });
    }
    await context.close();
  }
  assert.deepEqual(receipt.errors, []);
} catch (error) {
  receipt.failure = error.stack;
  if (page && !page.isClosed()) await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
  throw error;
} finally {
  await fs.writeFile(`${out}/browser-receipt.json`, JSON.stringify(receipt, null, 2));
  await browser.close();
}
