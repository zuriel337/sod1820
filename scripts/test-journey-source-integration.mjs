// Real branch UI + anonymous production READS; all personal RPCs use disposable
// PostgreSQL via localRpc. Synthetic auth fixture is never sent to production.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { localRpc, sql, TEST_USER, OTHER_USER } from "./journey-source-test-db.mjs";
const pw = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const { chromium } = pw.default || pw;
const base = "http://127.0.0.1:4174";
const out = process.env.JOURNEY_ARTIFACTS || "/workspace/artifacts/journey-source-integration-20261009";
await fs.mkdir(out, { recursive: true });
const receipt = { head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), testedAt: new Date().toISOString(),
  environment: "local UI; live anonymous source/method reads; synthetic auth; actual disposable PostgreSQL17 RPCs", cases: [], rpc: [], blocked: [], errors: [] };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"] });
const captain = "media:post:5112:source-region-smit-machchhar";
const shared = "media:gallery_image:5579cca1-ff12-4a9a-87ee-e32e89ca9af3";
const jwt = (uid) => [Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"), Buffer.from(JSON.stringify({ sub: uid, role: "authenticated", exp: Math.floor(Date.now()/1000)+3600 })).toString("base64url"), "fixture-only"].join(".");
const session = (uid) => ({ access_token: jwt(uid), refresh_token: "local-fixture-only", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now()/1000)+3600, user: { id: uid, aud: "authenticated", role: "authenticated", email: "fixture@example.invalid", app_metadata: {}, user_metadata: {} } });
const savedContext = (page) => page.evaluate((uid) => JSON.parse(sessionStorage.getItem(`sod_research_context_v2:user:${uid}`)), TEST_USER);
let currentPage;
try {
  for (const width of [1440, 390]) {
    for (const [slug, media] of [["india-axis", captain], ["1237", shared]]) {
      await sql("truncate public.research_path_revisions, public.research_paths, public.user_research, public.research_items cascade;");
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
      const state = { principal: TEST_USER, missing: false, ai: 0 };
      await context.addInitScript((auth) => {
        if (!localStorage.getItem("fixture-auth-seeded")) {
          localStorage.setItem("sb-linswmnnkjxvweumprav-auth-token", JSON.stringify(auth));
          localStorage.setItem("fixture-auth-seeded", "1");
        }
      }, session(TEST_USER));
      await context.route("**/*", async (route) => {
        const req = route.request(), url = new URL(req.url()), method = req.method();
        const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
        if (url.origin === base && req.isNavigationRequest() && /^\/(topic|post|world|2029\/number)\b/.test(url.pathname)) {
          const html = await context.request.get(`${base}/2029.html`);
          return route.fulfill({ contentType: "text/html", body: await html.body() });
        }
        if (url.hostname === "linswmnnkjxvweumprav.supabase.co") {
          if (url.pathname.startsWith("/auth/v1/")) return json(url.pathname.endsWith("/user") ? session(state.principal || TEST_USER).user : {});
          if (url.pathname === "/rest/v1/users") return json({ id: state.principal, tier: "member", role: "user", display_name: "בדיקה מבודדת" });
          const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/(.+)$/)?.[1];
          if (["research_state_snapshot_v1", "research_state_apply_ops_v1", "fn_research_path_append_v1", "fn_research_path_resume_v1"].includes(rpc)) {
            try {
              const data = await localRpc(rpc, req.postDataJSON(), state.principal);
              receipt.rpc.push({ width, slug, rpc, ok: data.ok, pathId: data.path_id, revision: data.revision_no, principal: state.principal });
              return json(data);
            } catch (err) { receipt.rpc.push({ rpc, rejected: err.message }); return json({ code: "42501", message: err.message }, 403); }
          }
          if (state.missing && ["/rest/v1/topic_cards_public", "/rest/v1/gallery_images", "/rest/v1/posts"].includes(url.pathname)) return json([]);
          const read = ["GET", "HEAD", "OPTIONS"].includes(method) || ["gematria_api", "fn_method_profile", "gematria_method_trace", "fn_zero_scale", "posts_by_number_strict", "fn_number_lookup", "fn_number_dossier", "fn_number_journey", "number_neighbors", "fn_all_methods"].includes(rpc);
          if (read && !url.pathname.startsWith("/functions/")) {
            // Public source reads use the existing public anon key, never fixture JWT.
            const headers = { ...req.headers(), authorization: `Bearer ${req.headers().apikey || ""}` };
            return route.continue({ headers });
          }
          if (url.pathname.startsWith("/functions/")) state.ai++;
          receipt.blocked.push({ method, path: url.pathname });
          return json({ error: "isolated test: external writes/AI disabled" }, 503);
        }
        if (!["GET", "HEAD", "OPTIONS"].includes(method)) { receipt.blocked.push({ method, path: url.pathname }); return json({}, 403); }
        return route.continue();
      });
      const page = await context.newPage(); currentPage = page;
      page.on("pageerror", (e) => receipt.errors.push(e.message));
      await page.goto(`${base}/topic/${slug}`, { waitUntil: "domcontentloaded" });
      const card = page.locator(`[data-source-media-id="${media}"]`);
      await card.waitFor({ timeout: 60000 });
      await card.locator(".sod29-canonical-media-figure").click();
      await page.waitForSelector('[role="dialog"]'); await page.keyboard.press("Escape");
      await page.waitForSelector('[data-source-selected="true"]');
      const source = await savedContext(page);
      assert.ok(source?.selection?.sourceRef, "real Source envelope selected");
      assert.equal(source.journey, null);
      const sourceHref = new URL(page.url()).pathname + new URL(page.url()).hash;
      await page.screenshot({ path: `${out}/${slug}-source-${width}.png` });
      await page.locator('a[href="/2029/number/1237"]').first().click();
      await page.waitForSelector('[data-number-path-continuation]');
      await page.waitForFunction((uid) => JSON.parse(sessionStorage.getItem(`sod_research_context_v2:user:${uid}`))?.subject?.type === "number", TEST_USER);
      assert.equal((await savedContext(page)).returnTo?.href, sourceHref, "actual Topic link preserves selected source");
      const input = page.getByRole("textbox", { name: "חפש מילה ביטוי או מספר", exact: true });
      await input.fill("תורת הצופן"); await input.press("Enter");
      await page.waitForURL(/focus=/, { timeout: 45000 });
      const method = page.locator('.sod29-number-v10-method-card').filter({ has: page.locator('span', { hasText: /^מילוי$/ }) }).first();
      await method.waitFor({ timeout: 45000 });
      const panel = page.locator('[data-number-path-continuation]');
      await panel.getByRole("button", { name: "התחל מסע מהבחירה", exact: true }).click();
      const started = await savedContext(page);
      assert.equal(started.journey.pendingSteps.length, 2);
      assert.equal(started.journey.pendingSteps[0].selection.sourceRef, source.selection.sourceRef);
      await method.click();
      await page.waitForFunction((uid) => JSON.parse(sessionStorage.getItem(`sod_research_context_v2:user:${uid}`))?.selection?.method === "מילוי", TEST_USER);
      await panel.getByRole("button", { name: "הוסף את הבחירה למסע", exact: true }).click();
      assert.equal((await savedContext(page)).journey.pendingSteps.length, 3);
      await page.screenshot({ path: `${out}/${slug}-number-${width}.png` });
      await panel.getByRole("button", { name: "שמירה וחידוש", exact: true }).click();
      await page.getByRole("button", { name: "שמור מסלול", exact: true }).click();
      await page.waitForSelector('[data-research-path-resume="available"]');
      const stored = await localRpc("fn_research_path_resume_v1", { p_path_id: null });
      assert.equal(stored.steps[0].selection.sourceRef, source.selection.sourceRef);
      assert.equal(stored.representation.context.returnTo.href, sourceHref);
      assert.equal(stored.steps.length, 3);
      assert.equal(stored.representation.context.access, undefined);
      const foreign = await localRpc("fn_research_path_resume_v1", { p_path_id: stored.path_id }, OTHER_USER);
      assert.equal(foreign.ok, false, "private Path rejected for other principal");
      await page.screenshot({ path: `${out}/${slug}-saved-${width}.png` });
      state.principal = null; // expired/rejected auth at the actual RPC boundary
      await page.getByRole("button", { name: "שמור מסלול", exact: true }).click();
      await page.getByText("המסלול לא עודכן", { exact: true }).waitFor();
      assert.equal((await localRpc("fn_research_path_resume_v1", { p_path_id: stored.path_id })).revision_no, stored.revision_no);
      state.principal = TEST_USER;
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.locator('[data-number-path-continuation]').getByRole("button", { name: "שמירה וחידוש", exact: true }).click();
      await page.getByRole("button", { name: "המשך מהמסלול השמור", exact: true }).click();
      await page.keyboard.press("Escape");
      await page.waitForFunction((uid) => JSON.parse(sessionStorage.getItem(`sod_research_context_v2:user:${uid}`))?.journey?.revisionNo === 1, TEST_USER);
      assert.equal((await savedContext(page)).selection.method, "מילוי");
      if (width === 390) {
        const beforeAi = await savedContext(page);
        await page.getByRole("button", { name: "✦ שאל את רזיאל", exact: true }).first().click();
        await page.waitForSelector('[role="dialog"]');
        const aiRequest = page.waitForResponse((response) => response.url().includes('/functions/v1/') && response.status() === 503);
        await page.getByRole('textbox', { name: 'שאלה לרזיאל', exact: true }).fill('מה מחבר את הבחירה למקור?');
        await page.getByRole('textbox', { name: 'שאלה לרזיאל', exact: true }).press('Enter');
        await aiRequest;
        await page.waitForTimeout(250);
        await page.screenshot({ path: `${out}/${slug}-ai-unavailable-${width}.png` });
        await page.keyboard.press("Escape");
        assert.equal((await savedContext(page)).returnTo.href, beforeAi.returnTo.href);
        assert.equal((await savedContext(page)).journey.id, beforeAi.journey.id);
      }
      state.missing = true;
      await page.getByRole("button", { name: "חזרה למקור שנבחר בטופיק", exact: true }).click();
      await page.getByText("המקור אינו זמין כעת. הבחירה והמסע נשמרו; אפשר לנסות שוב.", { exact: true }).waitFor();
      assert.ok(page.url().includes("/number/1237"));
      state.missing = false;
      await page.getByRole("button", { name: "חזרה למקור שנבחר בטופיק", exact: true }).click();
      await page.waitForURL(`${base}${sourceHref}`);
      await page.waitForSelector('[data-source-selected="true"]', { timeout: 45000 });
      assert.equal(await page.locator('[data-source-selected="true"]').getAttribute("data-source-media-id"), media);
      assert.equal((await savedContext(page)).selection.sourceRef, source.selection.sourceRef);
      // Let the existing smooth scroll/layout transition settle before certifying
      // the visible return, rather than accepting only the URL/hash.
      await page.waitForTimeout(700);
      const returnedBounds = await page.locator('[data-source-selected="true"]').boundingBox();
      assert.ok(returnedBounds && returnedBounds.y < 800 && returnedBounds.y + returnedBounds.height > 100, "selected source is in the visible viewport after return");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: `${out}/${slug}-returned-${width}.png` });
      receipt.cases.push({ width, slug, sourceRef: source.selection.sourceRef, sourceHref, pathId: stored.path_id, revision: stored.revision_no, steps: stored.steps, status: "PASS", privateOtherPrincipal: foreign });
      if (slug === "1237") {
        // Real auth event switches the provider to its guest principal; no live logout.
        await page.evaluate(async () => { const { supabase } = await import('/src/lib/supabase.js'); await supabase.auth.signOut({ scope: 'local' }); });
        state.principal = null;
        await page.goto(`${base}/2029/number/878`, { waitUntil: "domcontentloaded" });
        const preset = page.locator('[data-number-path-continuation]');
        await preset.getByRole('button', { name: 'התחל מסע מהבחירה', exact: true }).click({ timeout: 60000 });
        await page.waitForURL(`${base}/world`);
        await page.getByText('אתה בתוך מסע 878', { exact: true }).waitFor({ timeout: 60000 });
        await page.waitForTimeout(700); // existing World/frame entrance must finish before opening its menu
        const guest = () => page.evaluate(() => JSON.parse(sessionStorage.getItem('sod_research_context_v2:guest')));
        assert.equal((await guest()).journey.root.id, '878');
        if (width === 390) {
          await page.getByRole('button', { name: 'פתח ניווט', exact: true }).click();
          await page.locator('#sod29-mobile-navigation').getByRole('button', { name: 'חזרה מדויקת', exact: true }).click();
        } else await page.locator('button[aria-label="חזרה מדויקת"]:visible').first().click({ timeout: 45000 });
        await page.waitForURL(`${base}/2029/number/878`);
        await preset.getByRole('button', { name: 'שמירה וחידוש', exact: true }).click();
        const beforeGuestSave = await sql('select count(*) from research_paths');
        await page.getByRole('button', { name: 'שמור מסלול', exact: true }).click();
        await page.getByText('המסלול לא עודכן', { exact: true }).waitFor();
        assert.equal(await sql('select count(*) from research_paths'), beforeGuestSave);
        await page.screenshot({ path: `${out}/878-guest-${width}.png` });
        receipt.cases.push({ width, slug: '878', status: 'PASS', worldReturn: true, guestSaveDenied: true });
      }
      await context.close();
    }
  }
  assert.deepEqual(receipt.errors, []);
  receipt.status = "PASS";
} catch (error) {
  receipt.status = "FAIL"; receipt.error = error.stack; process.exitCode = 1;
  if (currentPage && !currentPage.isClosed()) {
    await currentPage.screenshot({ path: `${out}/failure.png` });
    await fs.writeFile(`${out}/failure-context.json`, JSON.stringify(await currentPage.evaluate(() => ({ url: location.href, session: Object.fromEntries(Object.entries(sessionStorage).filter(([k]) => k.startsWith("sod_research"))), text: document.body.innerText })), null, 2));
  }
  console.error(error);
} finally {
  await fs.writeFile(`${out}/browser-receipt.json`, JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({ status: receipt.status, cases: receipt.cases.length, rpc: receipt.rpc.length, blocked: receipt.blocked.length, out }));
  await browser.close();
}
