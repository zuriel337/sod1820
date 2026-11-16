// The Storage client loads on the first upload (shell budget, 16.11.2026). In production the only upload a signed-in member can make is a
// Community attachment (the worker admits exactly that path), so this is the upload proven here, in a real Chromium with the BUILT
// public-reading artifact, its real service worker and the real Supabase client (all hosts mapped to the local fixture; no live traffic):
//  1. the page does not download the Storage client; the first send with a file downloads it once, the file reaches Storage with the
//     member's own session under community/<member>/, and the message carries its public address;
//  2. a failed download of the Storage client: no upload and no message leave; the application's existing chunk recovery reloads once,
//     the text draft is restored and asks for the file again, and the next send succeeds;
//  3. a second failure in the same build: no reload loop, the composer says the send failed and keeps the draft; a retry in the same page
//     either fails again without a new request (Chromium 153 keeps a failed module address until the page reloads), and then the person's
//     reload recovers, or asks again and succeeds in place (the adapter keeps no failed load); never a half-sent message.
// Run `node scripts/build-public-reading-production.mjs` first.   node --test test/community-first-upload-lazy-storage-2029.browser.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { startFixture, dist } from "./helpers/authBrowserFixture.mjs";

const require = createRequire(import.meta.url);
let pw; for (const name of ["playwright", "@playwright/test"]) { try { pw = require(name); break; } catch { /* optional tooling */ } }
assert.ok(pw, "the upload acceptance requires the pinned browser; never skip.");
const executablePath = process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH;
const manifest = JSON.parse(readFileSync(join(dist, ".vite/manifest.json"), "utf8"));
const STORAGE_CHUNK = "/" + manifest["node_modules/@supabase/storage-js/dist/index.mjs"].file;
const API = "https://linswmnnkjxvweumprav.supabase.co";
const PNG = readFileSync(new URL("../public/crown-icon.png", import.meta.url));
const PROFILES = { mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }, desktop: { viewport: { width: 1280, height: 900 } } };
const FAILED = "השליחה או העלאת הקובץ נכשלה. הקבצים שנבחרו נשמרו בטיוטה לניסיון חוזר.";
const sleep = ms => new Promise(done => setTimeout(done, ms));

async function withMember(profile, chunkAnswer, run) {
  const uploads = [], published = [], seen = [];
  let member;
  const fixture = await startFixture({
    asset: ({ path }) => path === STORAGE_CHUNK ? chunkAnswer() : null,
    supabase: async ({ url, method, headers, body }) => {
      const path = url.pathname;
      seen.push(`${method} ${path}`);
      const upload = /^\/storage\/v1\/object\/gallery\/community\/([0-9a-f-]{36})\/([0-9a-f-]{36})\.png$/.exec(path);
      if (upload && method === "POST") {
        uploads.push({ owner: upload[1], name: upload[2], authorization: headers.authorization || "", upsert: headers["x-upsert"] || "", type: headers["content-type"] || "", bytes: body.length });
        return { body: { Key: path.replace("/storage/v1/object/", ""), Id: upload[2] } };
      }
      if (path === "/rest/v1/rpc/add_contribution") { published.push(JSON.parse(body.toString("utf8"))); return { body: JSON.stringify("22222222-2222-4222-8222-000000000001") }; }   // the new id, as PostgREST answers it (a JSON string)
      if (path === "/rest/v1/users") return { body: headers.accept?.includes("application/vnd.pgrst.object+json") ? { id: member?.id, display_name: "בודק העלאה", role: "member" } : [{ id: member?.id, display_name: "בודק העלאה", role: "member" }] };
      if (path === "/rest/v1/rpc/community_feed_page" || path === "/rest/v1/rpc/community_staff_user_ids_v1" || path === "/rest/v1/research_contributions") return { body: [] };
      if (path === "/rest/v1/rpc/community_thread_updates") return { body: [] };
      return null;
    },
  });
  const browser = await pw.chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
  try {
    member = fixture.auth.newUser("upload.member@example.invalid", true, "fixture-password");
    const response = await fixture.auth.handle(new Request(`${API}/auth/v1/token?grant_type=password`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: member.email, password: "fixture-password" }) }));
    assert.equal(response.status, 200);
    const session = await response.json();
    const context = await browser.newContext({ ...PROFILES[profile], ignoreHTTPSErrors: true, locale: "he-IL", serviceWorkers: "allow" });
    // the stored session, as after a sign-in (set once: a reload must find the same session, not a fresh copy over a newer one)
    await context.addInitScript(session => { if (!sessionStorage.getItem("fixture-session-set")) { localStorage.setItem("sb-linswmnnkjxvweumprav-auth-token", JSON.stringify(session)); sessionStorage.setItem("fixture-session-set", "1"); } }, session);
    const page = await context.newPage();
    const errors = [], consoleLines = []; page.on("pageerror", error => errors.push(String(error.message)));
    page.on("console", message => { if (["error", "warning"].includes(message.type())) consoleLines.push(message.text().slice(0, 300)); });
    try {
      await open(page, fixture);
      await run({ page, fixture, uploads, published, member, session, errors });
    } catch (error) {
      // what the person saw and what reached the servers, for the CI log
      const statuses = await page.locator(".sod29-community-composer [role=status], .sod29-community-composer [role=alert]").allInnerTexts().catch(() => []);
      console.log(JSON.stringify({ statuses, uploads: uploads.length, published: published.length, chunk: chunkRequests(fixture), supabase: seen.slice(-25), errors, console: consoleLines.slice(-15) }, null, 1));
      throw error;
    }
    await context.close();
  } finally { await browser.close(); await fixture.close(); }
}

async function open(page, fixture) {
  await page.goto(fixture.origin + "/community/chat", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => navigator.serviceWorker.controller && !window.__bootstrapFailure, null, { timeout: 40000 });
  await composer(page).waitFor({ timeout: 30000 });
  await page.waitForFunction(() => document.querySelector("#community-live-draft")?.getAttribute("aria-disabled") === "false", null, { timeout: 20000 });
}
const composer = page => page.locator("#community-live-draft");
const notice = page => page.locator('.sod29-community-composer .sod29-community-status[role="status"]');
const sendButton = page => page.locator(".sod29-community-composer-actions .sod29-community-primary");
const chunkRequests = fixture => fixture.state.assets.filter(entry => entry.path === STORAGE_CHUNK);
async function write(page, text) { await composer(page).click(); await page.keyboard.type(text); }
async function attach(page) { await page.locator('.sod29-community-composer input[type="file"]').setInputFiles({ name: "crown.png", mimeType: "image/png", buffer: PNG }); await page.locator(".sod29-community-attachment-list li").first().waitFor({ timeout: 10000 }); }

for (const profile of Object.keys(PROFILES)) {
  test(`[${profile}] first upload: the Storage client arrives on the first send, once; the file and the message carry the member's own identity`, { timeout: 150000 }, async () => {
    await withMember(profile, () => null, async ({ page, fixture, uploads, published, member, session, errors }) => {
      assert.equal(chunkRequests(fixture).length, 0, "the page does not download the Storage client");
      await write(page, "הודעה עם תמונה");
      await attach(page);
      assert.equal(chunkRequests(fixture).length, 0, "choosing a file does not download it either");
      await sendButton(page).click();
      await notice(page).filter({ hasText: "ההודעה פורסמה." }).waitFor({ timeout: 30000 });
      assert.equal(chunkRequests(fixture).length, 1, "the first send downloaded the Storage client once");
      assert.equal(uploads.length, 1);
      assert.equal(uploads[0].owner, member.id, "the file is stored under the member's own folder");
      assert.equal(uploads[0].authorization, `Bearer ${session.access_token}`, "the upload carries the member's session, not the anonymous key");
      assert.equal(uploads[0].upsert, "false"); assert.match(uploads[0].type, /^multipart\/form-data;/); assert.ok(uploads[0].bytes > PNG.length);
      assert.equal(published.length, 1);
      assert.ok(published[0].p_body.includes(`${API}/storage/v1/object/public/gallery/community/${member.id}/${uploads[0].name}.png`), "the message carries the file's public address, exactly as the real client builds it");
      // a second message with a file: the client is already here
      await write(page, "הודעה שנייה"); await attach(page); await sendButton(page).click();
      const deadline = Date.now() + 20000; while (published.length < 2 && Date.now() < deadline) await sleep(100);
      assert.equal(published.length, 2); assert.equal(uploads.length, 2);
      assert.equal(chunkRequests(fixture).length, 1, "the second upload did not download it again");
      assert.deepEqual(errors, []);
    });
  });
}

test("[mobile] one failed download of the Storage client: nothing leaves, one reload keeps the text, the next send succeeds", { timeout: 180000 }, async () => {
  let failures = 1;
  await withMember("mobile", () => failures-- > 0 ? { status: 503, body: "synthetic chunk outage" } : null, async ({ page, fixture, uploads, published }) => {
    const documentsBefore = fixture.state.documents;
    await write(page, "טיוטה שנשמרת");
    await attach(page);
    const reloaded = page.waitForEvent("load", { timeout: 30000 });
    await sendButton(page).click();
    await reloaded;
    assert.equal(fixture.state.documents, documentsBefore + 1, "exactly one automatic reload");
    assert.equal(new URL(page.url()).pathname, "/community/chat", "the same address");
    assert.equal(uploads.length, 0, "no file left during the failure"); assert.equal(published.length, 0, "no message without its file");
    await composer(page).waitFor({ timeout: 30000 });
    await page.locator(".sod29-community-draft-state").filter({ hasText: "טיוטת הטקסט שוחזרה. יש לצרף קבצים מחדש." }).waitFor({ timeout: 20000 });
    assert.match(await composer(page).innerText(), /טיוטה שנשמרת/, "the text survived the reload");
    await page.waitForFunction(() => document.querySelector("#community-live-draft")?.getAttribute("aria-disabled") === "false", null, { timeout: 20000 });
    await attach(page);
    await sendButton(page).click();
    await notice(page).filter({ hasText: "ההודעה פורסמה." }).waitFor({ timeout: 30000 });
    assert.deepEqual(chunkRequests(fixture).map(entry => entry.status), [503, 200]);
    assert.equal(uploads.length, 1); assert.equal(published.length, 1);
    assert.match(published[0].p_body, /טיוטה שנשמרת/);
    await sleep(1500); assert.equal(fixture.state.documents, documentsBefore + 1, "no reload loop");
  });
});

test("[mobile] a second failure in the same build: no reload loop, the composer says so and keeps the draft; the person's reload recovers", { timeout: 210000 }, async () => {
  let failures = 2;
  await withMember("mobile", () => failures-- > 0 ? { status: 503, body: "synthetic chunk outage" } : null, async ({ page, fixture, uploads, published }) => {
    const documentsBefore = fixture.state.documents;
    await write(page, "טיוטה עקשנית"); await attach(page);
    const reloaded = page.waitForEvent("load", { timeout: 30000 });
    await sendButton(page).click();
    await reloaded; await composer(page).waitFor({ timeout: 30000 });
    await page.waitForFunction(() => document.querySelector("#community-live-draft")?.getAttribute("aria-disabled") === "false", null, { timeout: 20000 });
    await attach(page);
    await sendButton(page).click();
    await notice(page).filter({ hasText: FAILED }).waitFor({ timeout: 30000 });
    await sleep(1500);
    assert.equal(fixture.state.documents, documentsBefore + 1, "the single automatic reload of this build is spent; no second one");
    assert.equal(uploads.length, 0); assert.equal(published.length, 0);
    assert.equal(await page.locator(".sod29-community-attachment-list li").count(), 1, "the chosen file stays in the draft");
    assert.match(await composer(page).innerText(), /טיוטה עקשנית/);
    // A retry in the same page (the network is back). Chromium 153 keeps a failed module address until the page reloads, so the retry fails
    // again without a new request; an engine that asks again recovers in place. Either is acceptable; a reload, a lost draft or a half-sent
    // message is not.
    await sendButton(page).click();
    const settle = Date.now() + 10000;
    while (published.length === 0 && Date.now() < settle) await sleep(100);
    await sleep(1000);
    assert.equal(fixture.state.documents, documentsBefore + 1, "a retry never reloads the page");
    if (chunkRequests(fixture).length === 2) {
      assert.equal(uploads.length, 0); assert.equal(published.length, 0);
      await notice(page).filter({ hasText: FAILED }).waitFor({ timeout: 10000 });
      // the person reloads; the text comes back, the file is attached again, the send succeeds
      await page.reload({ waitUntil: "domcontentloaded" }); await composer(page).waitFor({ timeout: 30000 });
      await page.waitForFunction(() => document.querySelector("#community-live-draft")?.getAttribute("aria-disabled") === "false", null, { timeout: 20000 });
      assert.match(await composer(page).innerText(), /טיוטה עקשנית/);
      await attach(page); await sendButton(page).click();
    }
    await notice(page).filter({ hasText: "ההודעה פורסמה." }).waitFor({ timeout: 30000 });
    assert.deepEqual(chunkRequests(fixture).map(entry => entry.status), [503, 503, 200]);
    assert.equal(uploads.length, 1); assert.equal(published.length, 1);
    assert.match(published[0].p_body, /טיוטה עקשנית/);
  });
});
