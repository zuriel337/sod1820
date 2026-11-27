// ZURIEL 27.11.2026, post 5144: the ONE save indicator, in a real Chromium against the BUILT public-reading artifact (real service worker, real Supabase client,
// the fixture's in-memory Auth + a research RPC that is compare-and-set like production). Nothing leaves the machine and nothing is written to production.
// For each screen (320, 390, 1440, Pixel 7) it proves:
//   1. server ack before success  - while the server has not answered the button says "saving" and never "saved"; only the receipt confirms; save -> reload -> reopen restores the saved item and the server keeps ONE copy;
//   2. full browser store         - CLOUD FIRST stage 2: a full store no longer stops the save; it reaches the account from memory, is confirmed only by the server's receipt, writes no automatic history,
//                                   and survives reload/reopen; with the server down it waits in memory (page warns before closing), "פינוי ושמירה" frees only abandoned reading journals, then it is confirmed;
//   3. retry after a failure      - a failed request leaves the item on the device, the same button retries, and only then is it confirmed;
//   4. conflict (409)             - the person is offered ONE explicit re-apply that confirms against the server, and nothing is deleted;
//   and, in every failure state, that the button, the extra buttons and the status stay INSIDE the screen and are not clipped by the post header (RTL).
// Run `node scripts/build-public-reading-production.mjs` first.   node --test --test-concurrency=1 test/personal-save-indicator-2029.browser.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { startFixture } from "./helpers/authBrowserFixture.mjs";
import { applyResearchOps, emptyResearchState } from "../src/lib/research/researchSyncState.js";

const require = createRequire(import.meta.url);
let pw; for (const name of ["playwright", "@playwright/test"]) { try { pw = require(name); break; } catch { /* optional tooling */ } }
assert.ok(pw, "the save-indicator acceptance requires the pinned browser; never skip.");
const executablePath = process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH;
const SLUG = "mah-kore-wild-animals-hyena-jackals-boar";
const PATH = "/post/" + SLUG;
const PARAGRAPH = n => `<p>פסקה ${n}: מה קורה כשהחיות מגיעות אל העיר, והקורא מגלה שהמציאות מדברת בשפת המספרים, צעד אחר צעד, עד התמונה המלאה והברורה של הדברים.</p>`;
const ROW = { id: 5144, wp_id: null, slug: SLUG, source: "ai", link: null, title: "פלישת חיות הבר: צבוע במודיעין, תנים בתל אביב וחזיר בר בחיפה | מה קורה הבורא", excerpt: "פוסט של האתר.",
  author: "SOD1820", date: "2026-11-16T20:00:00+00:00", modified: "2026-11-16T20:05:00+00:00", tags: ["מה קורה"], categories: ["רמזים"], image_url: null,
  content: [1, 2, 3, 4, 5, 6].map(PARAGRAPH).join("\n") };
const PROFILES = [["320", { viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }], ["390", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }],
  ["1440", { viewport: { width: 1440, height: 900 } }], ["Pixel 7", { ...pw.devices["Pixel 7"] }]];
const sleep = ms => new Promise(done => setTimeout(done, ms));

// The research RPC the page really calls: revision compare-and-set, idempotent by batch id, with switches a scenario flips.
function researchServer() {
  const s = { state: emptyResearchState(), revision: 0, receipts: new Map(), applies: [], hold: null, failNext: 0, conflictNext: 0, snapshots: 0 };
  s.snap = () => ({ ...s.state, revision: s.revision });
  s.handle = async ({ url, body }) => {
    if (url.pathname === "/rest/v1/users") return { body: { id: url.searchParams.get("id")?.slice(3), role: "member", tier: "member" } };
    if (url.pathname === "/rest/v1/posts" && /slug|wp_id|id=/.test(url.search) && !/order=|limit=(?:[2-9]|\d\d)/.test(url.search)) return { body: [ROW] };
    if (url.pathname.endsWith("/research_state_snapshot_v1")) { s.snapshots += 1; return { body: s.snap() }; }
    if (url.pathname.endsWith("/research_state_apply_ops_v1")) {
      const q = JSON.parse(body); s.applies.push(q.p_batch_id);
      if (s.hold) await s.hold;
      if (s.failNext > 0) { s.failNext -= 1; return { status: 503, body: { message: "temporarily unavailable" } }; }
      if (s.conflictNext > 0) { s.conflictNext -= 1; return { status: 409, body: { code: "PT409", message: "RESEARCH_SYNC_CONFLICT", details: null, hint: null } }; }
      const receipt = s.receipts.get(q.p_batch_id);
      if (receipt) return { body: { ok: true, replayed: true, batch_id: q.p_batch_id, applied_revision: receipt, snapshot: s.snap() } };
      s.state = applyResearchOps(s.state, q.p_ops); s.revision += 1; s.receipts.set(q.p_batch_id, s.revision);
      return { body: { ok: true, batch_id: q.p_batch_id, applied_revision: s.revision, snapshot: s.snap() } };
    }
    return null;
  };
  s.posts = () => s.state.saved.filter(x => x.type === "post");
  return s;
}

// A browser store that can be made full for real: setItem throws QuotaExceededError when the total would pass window.__limit.
const quotaScript = () => {
  // The limit survives a reload (it lives in sessionStorage), so "full store -> reload -> reopen" is real.
  try { const kept = sessionStorage.getItem("__sod_test_limit"); if (kept) window.__limit = Number(kept); } catch { /* optional */ }
  const original = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    if (this === window.localStorage && typeof window.__limit === "number") {
      let used = 0; for (let i = 0; i < localStorage.length; i += 1) { const k = localStorage.key(i); if (k !== key) used += k.length + (localStorage.getItem(k) || "").length; }
      if (used + key.length + String(value).length > window.__limit) throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    }
    return original.call(this, key, value);
  };
};

// Fills the browser store for real: abandoned reading journals (no owner, passive history only) beside the account state, and a journal that holds a real save which must survive.
const fillStore = (page, key, principal, room = 700) => page.evaluate(({ key, principal, room }) => {
  const passive = i => ({ batch_id: `b${i}`, ops: [{ kind: "history_add", op_id: `o${i}`, entity: { id: `post:${i}`, type: "post", title: "t", ref: `s${i}`, link: "/p", metadata: {}, t: i } }] });
  for (let i = 0; i < 14; i += 1) localStorage.setItem(`${key}:pending:old${i}`, JSON.stringify({ principal, revision: 3, queue: [passive(i), passive(i + 100)], inflight: null }));
  localStorage.setItem(`${key}:pending:precious`, JSON.stringify({ principal, revision: 3, inflight: null, queue: [{ batch_id: "keep", ops: [{ kind: "item_upsert", op_id: "k1", bucket: "library", entity: { id: "number:7", type: "number", title: "7", ref: "7", link: "/number/7", metadata: {}, addedAt: 1 } }] }] }));
  let used = 0; for (let i = 0; i < localStorage.length; i += 1) { const k = localStorage.key(i); used += k.length + localStorage.getItem(k).length; }
  window.__limit = used + room;   // the browser store is now full: the account state record no longer fits
  sessionStorage.setItem("__sod_test_limit", String(window.__limit));
  return used;
}, { key, principal, room });
const fxOrigin = page => new URL(page.url()).origin;
const journalsLeft = (page, key) => page.evaluate(key => Object.keys(localStorage).filter(k => k.startsWith(key + ":pending:")), key);
// A real beforeunload event: the page asks the browser to confirm only while a save exists solely in memory.
const unloadWarns = page => page.evaluate(() => { const e = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; });

async function withPost(profile, run) {
  const srv = researchServer();
  const fx = await startFixture({ supabase: srv.handle });
  const browser = await pw.chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: fx.chromiumArgs, env: fx.browserEnv });
  try {
    const context = await browser.newContext({ ...profile, ignoreHTTPSErrors: true, locale: "he-IL", serviceWorkers: "allow" });
    await context.addInitScript(quotaScript);
    const page = await context.newPage();
    const errors = []; page.on("pageerror", error => errors.push(String(error.message)));
    const email = "save.indicator@example.invalid", user = fx.auth.newUser(email, true);
    await page.goto(fx.origin + "/login?returnTo=" + encodeURIComponent(PATH));
    await page.getByRole("textbox", { name: "כתובת מייל" }).fill(email);
    const sent = page.waitForResponse(r => new URL(r.url()).pathname === "/auth/v1/otp" && r.status() === 200);
    await page.getByRole("button", { name: "שלחו לי קוד כניסה" }).click(); await sent;
    await page.getByRole("textbox", { name: "קוד כניסה מהמייל" }).fill(fx.auth.lastCode(email));
    await page.getByRole("button", { name: /כניסה לחשבון/ }).click();
    await page.waitForURL(u => u.pathname === PATH, { timeout: 30000 });
    await page.waitForSelector(".post-action-bar [data-personal-save]", { timeout: 30000 });
    await run({ page, srv, user, errors, key: `sod_research_v2:user:${user.id}` });
  } finally { await browser.close(); await fx.close(); }
}
const root = page => page.locator(".post-action-bar [data-personal-save]");
const phaseOf = page => root(page).getAttribute("data-save-phase");
const saveLabel = page => root(page).locator("[data-save-action=save]").getAttribute("aria-label");
const status = async page => (await root(page).locator("small[role=status]").count()) ? (await root(page).locator("small[role=status]").innerText()) : "";
const phaseIs = (page, want) => page.waitForFunction(w => document.querySelector(".post-action-bar [data-personal-save]")?.getAttribute("data-save-phase") === w, want, { timeout: 15000 });

// Every control the save adds is on screen, and neither the header nor any ancestor clips it (RTL: logical edges).
async function assertInsideAndUnclipped(page, label) {
  const result = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth, out = [];
    const bar = document.querySelector(".post-action-bar"), nodes = [bar, ...bar.querySelectorAll("[data-personal-save] button, [data-personal-save] small, .post-reading-action-row .r29-btn")];
    for (const el of nodes) {
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      const name = (el.getAttribute("data-save-action") || el.tagName.toLowerCase() + "." + String(el.className).slice(0, 24));
      if (r.left < -1 || r.right > vw + 1) out.push([name, "outside the screen", Math.round(r.left), Math.round(r.right), vw]);
      for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
        const cs = getComputedStyle(a); if ((cs.overflowX === "visible" && cs.overflowY === "visible") || a.matches("body,#root")) continue;
        const ar = a.getBoundingClientRect();
        if (r.left < ar.left - 1 || r.right > ar.right + 1 || r.top < ar.top - 1 || r.bottom > ar.bottom + 1) out.push([name, "clipped by", a.className.toString().slice(0, 40), cs.overflowX + "/" + cs.overflowY]);
      }
      if (el.tagName === "SMALL" && getComputedStyle(el).position === "absolute") out.push([name, "absolutely placed status"]);
    }
    if (document.documentElement.scrollWidth > vw + 1) out.push(["page", "sideways scroll", document.documentElement.scrollWidth, vw]);
    return out;
  });
  assert.deepEqual(result, [], `${label}: the save control must stay inside the screen and unclipped`);
}

for (const [name, profile] of PROFILES) {
  test(`[${name}] server ack before success; save -> reload -> reopen restores one copy`, { timeout: 150000 }, async () => {
    await withPost(profile, async ({ page, srv, errors }) => {
      assert.equal(await phaseOf(page), "idle");
      let release; srv.hold = new Promise(done => { release = done; });
      await root(page).locator("[data-save-action=save]").click();
      await page.waitForFunction(() => document.querySelector(".post-action-bar [data-personal-save]")?.getAttribute("data-save-phase") === "saving");
      for (let i = 0; i < 6 && srv.applies.length === 0; i += 1) await sleep(300);
      assert.equal(srv.applies.length, 1, "the request reached the server and is waiting for its answer");
      // the server has NOT answered: nothing may say "saved"
      assert.equal(await phaseOf(page), "saving");
      assert.doesNotMatch(await saveLabel(page), /✓|ברשימת השמורים/);
      assert.doesNotMatch(await status(page), /נשמר באזור האישי|✓/);
      assert.equal(await root(page).locator("[data-save-action=save]").isDisabled(), true, "no second save while one is in flight");
      await assertInsideAndUnclipped(page, "saving");
      release(); srv.hold = null;
      await phaseIs(page, "confirmed");
      assert.match(await saveLabel(page), /ברשימת השמורים/);
      assert.equal(srv.posts().length, 1, "the server holds the item");
      // reload -> reopen: the saved item is restored, the button syncs it with one click, and the server still holds exactly one copy
      await page.reload(); await page.waitForSelector(".post-action-bar [data-personal-save]", { timeout: 30000 });
      assert.equal(await root(page).locator("[data-save-action=save]").getAttribute("aria-pressed"), "true", "the saved item is restored after reload");
      assert.notEqual(await phaseOf(page), "failed");
      await root(page).locator("[data-save-action=save]").click();
      await phaseIs(page, "confirmed");
      assert.equal(srv.posts().length, 1, "no duplicate on the server");
      await assertInsideAndUnclipped(page, "confirmed after reopen");
      assert.deepEqual(errors, []);
    });
  });

  test(`[${name}] full browser store: the save still reaches the account, is confirmed only by the receipt, writes no automatic history, nothing on the device is touched, and it survives reload/reopen`, { timeout: 150000 }, async () => {
    await withPost(profile, async ({ page, srv, user, key, errors }) => {
      const principal = `user:${user.id}`;
      assert.ok(await fillStore(page, key, principal, 80) > 0);
      const before = await journalsLeft(page, key);
      let release; srv.hold = new Promise(done => { release = done; });
      await root(page).locator("[data-save-action=save]").click();
      for (let i = 0; i < 10 && srv.applies.length === 0; i += 1) await sleep(300);
      assert.equal(srv.applies.length, 1, "the request left although the browser store is full");
      // the server has NOT answered: still "saving", never "saved", and the page warns before it is closed (the item exists only in this tab)
      assert.equal(await phaseOf(page), "saving");
      assert.doesNotMatch(await saveLabel(page), /✓|ברשימת השמורים/);
      assert.equal(await unloadWarns(page), true, "closing the tab now would lose the save: the browser is asked to confirm");
      release(); srv.hold = null;
      await phaseIs(page, "confirmed");
      assert.equal(srv.posts().length, 1, "the account holds the item");
      assert.equal(srv.state.history.length, 0, "saving wrote no automatic personal history");
      assert.match(await status(page), /נשמר באזור האישי בחשבון/);
      assert.equal(await unloadWarns(page), false, "nothing left that only memory holds: no warning");
      assert.deepEqual(await journalsLeft(page, key), before, "no journal of the device was dropped or added: the existing research is untouched");
      await assertInsideAndUnclipped(page, "full store confirmed");
      // reload -> reopen with the store STILL full (not even the account state record fits on the device): the account restores the item, and a second click is idempotent
      assert.equal(await page.evaluate(() => typeof window.__limit), "number");
      await page.reload(); await page.waitForSelector(".post-action-bar [data-personal-save]", { timeout: 30000 });
      assert.equal(await page.evaluate(() => typeof window.__limit), "number", "the browser store is still full after the reload");
      await page.goto(fxOrigin(page) + "/2029/me/research");
      await page.waitForFunction(() => Number(document.querySelector("[data-research-state-source] [data-count-for=saved] b")?.textContent) === 1, null, { timeout: 30000 });
      assert.equal(srv.posts().length, 1, "the account holds exactly one copy, and the personal area reads it from the account");
      await page.goto(fxOrigin(page) + PATH); await page.waitForSelector(".post-action-bar [data-personal-save]", { timeout: 30000 });
      await root(page).locator("[data-save-action=save]").click();
      await phaseIs(page, "confirmed");
      assert.equal(srv.posts().length, 1, "no duplicate on the server");
      assert.ok((await journalsLeft(page, key)).includes(`${key}:pending:precious`), "a journal holding an explicit save is never cleared");
      await assertInsideAndUnclipped(page, "full store reopened");
      assert.deepEqual(errors, []);
    });
  });

  test(`[${name}] full browser store and the server does not answer: waits in memory as failed (never saved), "פינוי ושמירה" frees only reading journals, then it is confirmed`, { timeout: 150000 }, async () => {
    await withPost(profile, async ({ page, srv, user, key, errors }) => {
      const principal = `user:${user.id}`;
      await fillStore(page, key, principal);
      srv.failNext = 1;
      await root(page).locator("[data-save-action=save]").click();
      await root(page).locator("[data-save-action=reclaim]").waitFor({ timeout: 15000 });
      assert.equal(await phaseOf(page), "failed");
      assert.doesNotMatch(await saveLabel(page), /✓/);
      const text = await status(page);
      assert.match(text, /השרת לא אישר את השמירה/);
      assert.match(text, /זיכרון הלשונית/, "tells where the item waits");
      assert.doesNotMatch(text, /לא נשלחה לחשבון/, "it WAS sent; the server did not answer");
      assert.equal(srv.posts().length, 0);
      assert.equal(await unloadWarns(page), true, "still only in this tab's memory");
      await assertInsideAndUnclipped(page, "full store, server down");
      await root(page).locator("[data-save-action=reclaim]").click();
      await phaseIs(page, "confirmed");
      assert.equal(srv.posts().length, 1, "after the retry the account holds the item, once");
      const left = await journalsLeft(page, key);
      assert.ok(left.includes(`${key}:pending:precious`), "a journal holding an explicit save is never cleared");
      assert.equal(left.filter(k => /:pending:old\d+$/.test(k)).length, 0, "only the abandoned reading journals were freed");
      assert.equal(await unloadWarns(page), false);
      assert.deepEqual(errors, []);
    });
  });

  test(`[${name}] retry after a failed request: item stays on the device, the same button retries, then it is confirmed`, { timeout: 150000 }, async () => {
    await withPost(profile, async ({ page, srv, errors }) => {
      srv.failNext = 1;
      await root(page).locator("[data-save-action=save]").click();
      await phaseIs(page, "failed");
      assert.doesNotMatch(await saveLabel(page), /✓/);
      assert.match(await status(page), /השרת לא אישר את השמירה/);
      assert.equal(srv.posts().length, 0);
      assert.equal(await root(page).locator("[data-save-action=save]").getAttribute("aria-pressed"), "true", "the item is kept on the device");
      await assertInsideAndUnclipped(page, "failed request");
      await root(page).locator("[data-save-action=save]").click();
      await phaseIs(page, "confirmed");
      assert.equal(srv.posts().length, 1);
      assert.deepEqual(errors, []);
    });
  });

  test(`[${name}] conflict (409): one explicit re-apply confirms against the server and nothing is deleted`, { timeout: 150000 }, async () => {
    await withPost(profile, async ({ page, srv, errors }) => {
      srv.conflictNext = 1;
      await root(page).locator("[data-save-action=save]").click();
      await root(page).locator("[data-save-action=resolve]").waitFor({ timeout: 15000 });
      assert.equal(await phaseOf(page), "failed");
      const text = await status(page);
      assert.match(text, /לא נמחק דבר/);
      assert.doesNotMatch(text, /באזור האישי/, "no promise of a screen that does not exist");
      assert.equal(srv.posts().length, 0);
      await assertInsideAndUnclipped(page, "conflict");
      await root(page).locator("[data-save-action=resolve]").click();
      await phaseIs(page, "confirmed");
      assert.equal(srv.posts().length, 1);
      assert.equal(await page.evaluate(key => Object.keys(localStorage).some(k => k.includes(":conflict:")), `sod_research_v2:user:`), true, "the disputed batch is kept as a copy");
      assert.deepEqual(errors, []);
    });
  });
}
