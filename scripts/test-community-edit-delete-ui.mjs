// Browser test for the community page: menu entry, page order, lazy OpenWeb, thread/remaining counts,
// author edit, soft delete (leaf / reply with children / main message with thread), admin thread hide,
// permission and server failures, and the pre-migration fallback.
// Runs the real built app (dist, from `npm run build:2029`) against an in-memory stand-in for the
// community_* functions that mirrors tests/sql/community_edit_delete_threads.sql. No live service is reached.
// Usage: PLAYWRIGHT_MODULE=/path/to/playwright node scripts/test-community-edit-delete-ui.mjs
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync, readFileSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { A, B, ADMIN, id, makeStore, semantics, sessionFor, installFakeBackend } from "./lib/community-fake-backend.mjs";

const playwright = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const { chromium } = playwright.chromium ? playwright : playwright.default;
const root = fileURLToPath(new URL("../dist/", import.meta.url)).replace(/\/$/, "");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  let file = resolve(root, "." + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + sep) || !existsSync(file) || !statSync(file).isFile()) file = resolve(root, "2029.html");
  res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
  createReadStream(file).pipe(res);
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const BASE = `http://127.0.0.1:${server.address().port}`;



const results = [];
async function scenario(name, fn) {
  try { await fn(); results.push([name, true]); console.log("PASS", name); } catch (error) { results.push([name, false]); console.log("FAIL", name, "\n   ", String(error.message).split("\n").slice(0, 6).join("\n    ")); }
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });

async function open({ as = null, rpc = "on", failDelete = false, viewport = { width: 1280, height: 900 }, theme = null, path = "/community/chat", selector = ".sod29-community-thread", shared = null, readOnlyPreview = null } = {}) {
  const context = await browser.newContext({ viewport, locale: "he-IL", permissions: ["clipboard-read", "clipboard-write"] });
  const rows = shared?.rows || makeStore(); const sem = shared?.sem || semantics(rows);
  const log = { launcher: 0, tableReads: 0, rpcCalls: [], writes: [], errors: [] };
  if (as) { const { session } = sessionFor(as); await context.addInitScript((v) => localStorage.setItem("sb-linswmnnkjxvweumprav-auth-token", JSON.stringify(v)), session); }
  if (theme) await context.addInitScript((t) => { try { localStorage.setItem("sod29-theme-preset", t); localStorage.setItem("theme-preset", t); } catch {} }, theme);
  await installFakeBackend(context, { base: BASE, rows, sem, log, rpc, failDelete });
  if (readOnlyPreview) await context.route((url) => url.origin === BASE, async (route) => {
    if (route.request().resourceType() !== "document") return route.fallback();
    const marker = readOnlyPreview === "hosted" ? "sod-preview-readonly-bootstrap" : "sod-hybrid-local-readonly";
    const html = readFileSync(resolve(root, "2029.html"), "utf8");
    return route.fulfill({ status: 200, contentType: "text/html", body: html.replace(/<head(\s[^>]*)?>/i, (head) => `${head}<script id="${marker}" type="application/json">{}</script>`) });
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => log.errors.push(error.message));
  await page.goto(`${BASE}${path}`);
  await page.waitForSelector(selector, { timeout: 15000 });
  return { page, context, rows, sem, log };
}
const shareStore = () => { const rows = makeStore(); return { rows, sem: semantics(rows) }; };
const msg = (page, text) => page.locator(".sod29-community-thread", { hasText: text }).first();
const group = (page, text) => page.locator(".sod29-community-thread-group", { has: page.locator(".sod29-community-thread", { hasText: text }) }).first();

await scenario("read-only Preview: real messages and threads remain usable without writes, claims or unavailable actions", async () => {
  for (const mode of ["local", "hosted"]) for (const as of [null, A, ADMIN]) {
    const { page, context, log } = await open({ as, readOnlyPreview: mode, viewport: { width: as === ADMIN ? 1440 : 390, height: 844 } });
    await page.getByText("תצוגה לקריאה בלבד. שליחה ושינוי הודעות אינם פעילים בפריוויו הזה.", { exact: true }).waitFor();
    assert.equal(await page.locator("#community-live-draft").isDisabled(), true);
    assert.equal(await page.getByRole("button", { name: "פרסום", exact: true }).isDisabled(), true);
    for (const name of ["עריכה", "מחיקה", "דיווח", "הסתרת השרשור", "מצא את החשבון הישן שלי"]) {
      assert.equal(await page.getByRole("button", { name, exact: true }).count(), 0, name);
    }
    const thread = group(page, "הודעת מקור של אילנה");
    await thread.getByRole("button", { name: "פתח עוד — 2 תגובות", exact: true }).click();
    await thread.getByText("תגובה של בועז", { exact: true }).waitFor();
    assert.equal(log.writes.length, 0, "a writable in-memory backend received no mutations");
    assert.equal(log.rpcCalls.some((name) => /claim/i.test(String(name))), false, "sign-in must not auto-link an account in Preview");
    assert.deepEqual(log.errors, []);
    await context.close();
  }
});

await scenario("menu: entry is ״קהילה״, keeps /community/chat, no ״צ׳אט״ — desktop and mobile", async () => {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 800 }]) {
    const { page, context } = await open({ viewport });
    const link = page.locator('a[href="/community/chat"]').first();
    if (viewport.width < 600) { const burger = page.locator(".sod29-nav-toggle, [aria-controls*=nav], button[aria-label*=תפריט]").first(); if (await burger.count()) await burger.click().catch(() => {}); }
    const labels = await page.locator('a[href="/community/chat"]').evaluateAll((els) => els.map((e) => ({ label: e.getAttribute("aria-label"), text: e.textContent.trim(), icon: e.querySelector("svg")?.getAttribute("data-icon-name"), box: e.getBoundingClientRect().height })));
    assert.ok(labels.length > 0, "no nav entry for /community/chat");
    for (const l of labels) { assert.equal(l.label, "קהילה"); assert.match(l.text, /^קהילה/); assert.equal(l.icon, "community"); }
    assert.equal(await page.getByRole("link", { name: "צ׳אט", exact: true }).count(), 0);
    await context.close();
  }
});

await scenario("workspace nav item no longer shares the community icon", async () => {
  const { page, context } = await open();
  const icons = await page.locator(".sod29-nav-link").evaluateAll((els) => els.map((e) => [e.textContent.trim(), e.querySelector("svg")?.getAttribute("data-icon-name")]));
  const community = icons.find(([t]) => t.startsWith("קהילה")); const personal = icons.find(([t]) => t.startsWith("אזור משתמשים"));
  assert.equal(community?.[1], "community"); if (personal) assert.equal(personal[1], "personal");
  await context.close();
});

await scenario("page order: new community on top, ״הצ׳אט הוותיק״ at the bottom; single h1; OpenWeb loads only near the bottom", async () => {
  const { page, context, log } = await open();
  assert.equal(log.launcher, 0, "OpenWeb launcher must not load on entry");
  assert.equal(await page.locator("h1").count(), 1, "exactly one h1");
  const top = await page.locator("#community-new-chat").evaluate((el) => el.getBoundingClientRect().top + scrollY);
  const legacy = await page.locator("#legacy-chat").evaluate((el) => el.getBoundingClientRect().top + scrollY);
  assert.ok(top < legacy, "legacy chat must be below the new community");
  assert.equal(await page.locator("#legacy-chat h2").innerText(), "הצ׳אט הוותיק");
  assert.equal(await page.locator("#legacy-chat").getAttribute("data-openweb-loaded"), "false");
  assert.equal(await page.locator('[data-spotim-module="conversation"]').count(), 0);
  await page.locator("#legacy-chat").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector("#legacy-chat")?.dataset.openwebLoaded === "true", null, { timeout: 5000 });
  await page.waitForFunction(() => document.querySelector('[data-spotim-module="conversation"]'));
  await page.waitForTimeout(300);
  assert.ok(log.launcher >= 1, "launcher should load once the reader is near");
  assert.equal(await page.locator("#community-new-chat .sod29-community-composer").count(), 1);
  await context.close();
});

await scenario("deep link #legacy-chat opens the OpenWeb history immediately", async () => {
  const context = await browser.newContext({ locale: "he-IL" });
  const hits = { launcher: 0 };
  await context.route("**/*", (route) => { const u = new URL(route.request().url()); if (u.origin === BASE) return route.fallback(); if (u.host === "launcher.spot.im") { hits.launcher++; return route.fulfill({ status: 200, contentType: "application/javascript", body: "" }); } if (u.host === "linswmnnkjxvweumprav.supabase.co") return route.fulfill({ status: 200, contentType: "application/json", body: "[]" }); return route.abort(); });
  const page = await context.newPage();
  await page.goto(`${BASE}/community/chat#legacy-chat`);
  await page.waitForSelector('[data-spotim-module="conversation"]', { timeout: 10000 });
  assert.ok(hits.launcher >= 1);
  await context.close();
});

await scenario("counts: ״פתח עוד — N תגובות״ opens in place, hides again, remaining counts for replies and feed", async () => {
  const { page, context } = await open();
  const g1 = group(page, "הודעת מקור של אילנה");
  const toggle = g1.getByRole("button", { name: "פתח עוד — 2 תגובות" });
  await toggle.waitFor();
  await toggle.click();
  await g1.getByText("תגובה של בועז").waitFor();
  const order = await g1.locator(".sod29-community-thread").evaluateAll((els) => els.map((e) => e.textContent));
  assert.ok(order[0].includes("הודעת מקור") && order[1].includes("תגובה של בועז"), "replies sit under the message, in thread order");
  await g1.getByRole("button", { name: "הסתר תגובות" }).first().click();
  await g1.getByText("תגובה של בועז").waitFor({ state: "hidden" });
  await g1.getByRole("button", { name: "פתח עוד — 2 תגובות" }).waitFor();
  // nested: the reply has its own direct count (1), not the thread total
  await g1.getByRole("button", { name: "פתח עוד — 2 תגובות" }).click();
  await g1.getByRole("button", { name: "פתח עוד — תגובה אחת" }).waitFor();
  // paged replies: 25 direct replies, 20 per page
  const old = group(page, "הודעה היסטורית מ-OpenWeb");
  await old.getByRole("button", { name: "פתח עוד — 25 תגובות" }).click();
  const more = old.getByRole("button", { name: "עוד תגובות — 5 נותרו" });
  await more.waitFor();
  await more.click();
  await old.getByText("תגובה ותיקה 25").waitFor();
  assert.equal(await old.getByRole("button", { name: /עוד תגובות/ }).count(), 0);
  // feed: 48 roots, 40 per page
  await page.getByRole("button", { name: /עוד הודעות — 8 נותרו/ }).waitFor();
  await page.getByRole("button", { name: /עוד הודעות — 8 נותרו/ }).click();
  await page.getByText("הגעתם לסוף השיחות.").waitFor();
  await context.close();
});

await scenario("guest sees no edit/delete/hide controls", async () => {
  const { page, context } = await open();
  assert.equal(await page.getByRole("button", { name: "עריכה" }).count() + await page.getByRole("button", { name: "מחיקה" }).count() + await page.getByRole("button", { name: "הסתרת השרשור" }).count(), 0);
  await context.close();
});

await scenario("regular user: edit/delete only on own community messages; none on others or historical OpenWeb", async () => {
  const { page, context } = await open({ as: A });
  const mine = msg(page, "הודעת מקור של אילנה");
  await mine.getByRole("button", { name: "עריכה" }).waitFor();
  await mine.getByRole("button", { name: "מחיקה" }).waitFor();
  assert.equal(await mine.getByRole("button", { name: "הסתרת השרשור" }).count(), 0, "no admin hide for a regular user");
  for (const other of ["הודעה בלי תגובות של בועז", "הודעה היסטורית מ-OpenWeb", "הודעה ותיקה 1"]) {
    const m = msg(page, other); assert.equal(await m.getByRole("button", { name: /עריכה|מחיקה/ }).count(), 0, other);
  }
  await context.close();
});

await scenario("edit: editor with existing text, cancel keeps it, save marks ״נערך״ and keeps link and thread position", async () => {
  const { page, context, rows } = await open({ as: A });
  const g1 = group(page, "הודעת מקור של אילנה");
  await g1.getByRole("button", { name: "פתח עוד — 2 תגובות" }).click();
  const mine = page.locator(`#message-${id(1)}`);
  await mine.getByRole("button", { name: "עריכה" }).click();
  const box = page.getByRole("textbox", { name: "עריכת ההודעה" });
  assert.match(await box.inputValue(), /הודעת מקור של אילנה https:\/\/example\.org\/page/);
  await box.fill("שונה בביטול");
  await page.getByRole("button", { name: "ביטול" }).click();
  await mine.getByText("הודעת מקור של אילנה").waitFor();
  assert.equal(await mine.locator(".sod29-community-edited").count(), 0);
  await mine.getByRole("button", { name: "עריכה" }).click();
  await box.fill("הודעת מקור מתוקנת https://example.org/page");
  await page.getByRole("button", { name: "שמירה" }).click();
  await mine.getByText("הודעת מקור מתוקנת").waitFor();
  await mine.locator(".sod29-community-edited", { hasText: "נערך" }).waitFor();
  assert.ok(await mine.locator('a[href="https://example.org/page"]').count() >= 1, "link preserved");
  assert.equal(await page.locator(`.sod29-community-thread-group:has(#message-${id(1)})`).getByText("תגובה של בועז").count(), 1, "replies stay under the edited message");
  const r = rows.find((x) => x.id === id(1)); assert.equal(r.parent_id, null); assert.ok(r.edited_at);
  await context.close();
});

await scenario("edit: server refusal shows an error and keeps the editor and original text", async () => {
  const { page, context, rows } = await open({ as: A });
  const mine = msg(page, "הודעת מקור של אילנה");
  await mine.getByRole("button", { name: "עריכה" }).click();
  rows.find((x) => x.id === id(1)).author_user_id = B; // ownership changes server-side after the page rendered
  await page.getByRole("textbox", { name: "עריכת ההודעה" }).fill("ניסיון עריכה");
  await page.getByRole("button", { name: "שמירה" }).click();
  await page.getByRole("alert").filter({ hasText: "אין לך הרשאה" }).waitFor();
  assert.equal(await page.getByRole("textbox", { name: "עריכת ההודעה" }).inputValue(), "ניסיון עריכה");
  await context.close();
});

await scenario("delete leaf message: removed after confirmation, feed offset/remaining stay consistent", async () => {
  const { page, context, rows } = await open({ as: B });
  const m = msg(page, "הודעה בלי תגובות של בועז");
  await m.getByRole("button", { name: "מחיקה" }).click();
  await page.getByRole("alertdialog").waitFor();
  await page.getByRole("alertdialog").getByRole("button", { name: "ביטול" }).click();
  assert.equal(rows.find((x) => x.id === id(5)).deleted_at, null, "cancel deletes nothing");
  await m.getByRole("button", { name: "מחיקה" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "מחיקה" }).click();
  await page.getByText("הודעה בלי תגובות של בועז").waitFor({ state: "hidden" });
  assert.equal(await page.locator(".sod29-community-deleted").count(), 0, "no tombstone for a leaf");
  assert.ok(rows.find((x) => x.id === id(5)).deleted_at);
  await page.getByRole("button", { name: /עוד הודעות — 7 נותרו/ }).waitFor();
  await context.close();
});

await scenario("delete reply that has answers: its text disappears, ״ההודעה נמחקה״ stays, the answer remains readable", async () => {
  const { page, context, rows } = await open({ as: B });
  const g1 = group(page, "הודעת מקור של אילנה");
  await g1.getByRole("button", { name: "פתח עוד — 2 תגובות" }).click();
  const reply = msg(page, "תגובה של בועז");
  await reply.getByRole("button", { name: "מחיקה" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "מחיקה" }).click();
  await g1.locator(".sod29-community-deleted", { hasText: "ההודעה נמחקה" }).waitFor();
  assert.equal(await page.getByText("תגובה של בועז").count(), 0, "deleted text is gone from the page");
  await g1.getByRole("button", { name: "פתח עוד — תגובה אחת" }).click();
  await g1.getByText("תגובה מקוננת של אילנה").waitFor();
  assert.equal(rows.find((x) => x.id === id(3)).deleted_at, null, "child reply untouched");
  await context.close();
});

await scenario("delete main message with a thread: tombstone in the feed, thread still opens and reads", async () => {
  const { page, context, rows } = await open({ as: A });
  const mine = msg(page, "הודעת מקור של אילנה");
  await mine.getByRole("button", { name: "מחיקה" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "מחיקה" }).click();
  const g1 = page.locator(".sod29-community-thread-group").filter({ has: page.locator(".sod29-community-deleted") }).first();
  await g1.locator(".sod29-community-deleted", { hasText: "ההודעה נמחקה" }).waitFor();
  assert.equal(await page.getByText("הודעת מקור של אילנה").count(), 0);
  await g1.getByRole("button", { name: "פתח עוד — 2 תגובות" }).click();
  await g1.getByText("תגובה של בועז").waitFor();
  await g1.getByText("תגובה שנייה של בועז").waitFor();
  assert.ok(rows.find((x) => x.id === id(1)).deleted_at && rows.every((r) => !(r.parent_id === id(1)) || !r.deleted_at));
  await context.close();
});

await scenario("delete failure from the server keeps the message and shows an error", async () => {
  const { page, context } = await open({ as: B, failDelete: true });
  const m = msg(page, "הודעה בלי תגובות של בועז");
  await m.getByRole("button", { name: "מחיקה" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "מחיקה" }).click();
  await page.getByRole("alertdialog").getByRole("alert").waitFor();
  await m.getByText("הודעה בלי תגובות של בועז").waitFor();
  await context.close();
});

await scenario("admin: can delete others, hide a whole thread after explicit confirmation; regular user cannot", async () => {
  const { page, context, rows } = await open({ as: ADMIN });
  const rowsBefore = rows.length;
  const g1 = group(page, "הודעת מקור של אילנה");
  const root = msg(page, "הודעת מקור של אילנה");
  await root.getByRole("button", { name: "מחיקה" }).waitFor();
  assert.equal(await root.getByRole("button", { name: "עריכה" }).count(), 0, "admin does not edit other people's messages");
  await root.getByRole("button", { name: "הסתרת השרשור" }).click();
  await page.getByRole("alertdialog", { name: /להסתיר את כל השרשור/ }).waitFor();
  assert.equal(rows.find((x) => x.id === id(1)).thread_hidden_at, null, "nothing hidden before confirming");
  await page.getByRole("alertdialog").getByRole("button", { name: "הסתרת השרשור" }).click();
  await page.getByText("הודעת מקור של אילנה").waitFor({ state: "hidden" });
  assert.ok(rows.filter((r) => [id(1), id(2), id(3), id(4)].includes(r.id)).every((r) => r.thread_hidden_at), "root and all replies hidden");
  assert.equal(rows.length, rowsBefore, "no row physically removed");
  await context.close();
});

await scenario("before the migration is applied: reads fall back to the table, and no edit/delete controls appear", async () => {
  const { page, context, log } = await open({ as: A, rpc: "missing" });
  await page.getByText("הודעת מקור של אילנה").waitFor();
  assert.ok(log.tableReads > 0, "legacy reads used");
  assert.equal(await page.getByRole("button", { name: /עריכה|מחיקה|הסתרת השרשור/ }).count(), 0);
  await page.getByRole("button", { name: /פתח עוד — 2 תגובות/ }).first().click();
  await page.getByText("תגובה של בועז").waitFor();
  await context.close();
});

await scenario("themes: day / parchment / night keep the page free of horizontal overflow (desktop + mobile)", async () => {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 800 }]) {
    const { page, context } = await open({ as: A, viewport });
    await page.getByRole("button", { name: "פתח עוד — 2 תגובות" }).first().click();
    await page.locator(`#message-${id(1)}`).getByRole("button", { name: "עריכה" }).click();
    for (const label of ["יום", "קלף", "לילה"]) {
      const choice = page.locator(".sod29-theme-options button", { hasText: label }).first();
      if (!(await choice.isVisible())) { const trigger = page.locator(".sod29-theme-trigger").first(); if (await trigger.count()) await trigger.click().catch(() => {}); }
      if (await choice.isVisible()) await choice.click();
      await page.waitForTimeout(100);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 1, `${label} ${viewport.width}px overflow ${overflow}`);
      if (process.env.SHOTS_DIR) await page.screenshot({ path: `${process.env.SHOTS_DIR}/community-${label}-${viewport.width}.png`, clip: { x: 0, y: 0, width: viewport.width, height: Math.min(viewport.height, 900) } });
    }
    await context.close();
  }
});

await scenario("targets: manage/toggle/more controls are at least 44px tall", async () => {
  const { page, context } = await open({ as: A, viewport: { width: 390, height: 800 } });
  const sizes = await page.locator(".sod29-community-replies-toggle, .sod29-community-manage-action, .sod29-community-load").evaluateAll((els) => els.map((e) => [e.textContent.trim(), Math.round(e.getBoundingClientRect().height)]));
  assert.ok(sizes.length > 0);
  for (const [text, h] of sizes) assert.ok(h >= 44, `${text} is ${h}px`);
  await context.close();
});


await scenario("undo: ״ביטול מחיקה״ brings a deleted message (and a leaf root) back; hidden thread undo for admin", async () => {
  const { page, context, rows } = await open({ as: B });
  const m = msg(page, "הודעה בלי תגובות של בועז");
  await m.getByRole("button", { name: "מחיקה" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "מחיקה" }).click();
  await page.getByText("הודעה בלי תגובות של בועז").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "ביטול מחיקה" }).click();
  await page.getByText("הודעה בלי תגובות של בועז").waitFor();
  assert.equal(rows.find((x) => x.id === id(5)).deleted_at, null);
  await context.close();
  const admin = await open({ as: ADMIN });
  await admin.page.locator(`#message-${id(1)}`).getByRole("button", { name: "הסתרת השרשור" }).click();
  await admin.page.getByRole("alertdialog").getByRole("button", { name: "הסתרת השרשור" }).click();
  await admin.page.getByRole("button", { name: "ביטול הסתרה" }).click();
  await admin.page.getByText("הודעת מקור של אילנה").waitFor();
  assert.ok(admin.rows.filter((r) => [id(1), id(2), id(3), id(4)].includes(r.id)).every((r) => !r.thread_hidden_at));
  await admin.context.close();
});

await scenario("edited label shows how long ago; admin sees previous versions, regular users do not", async () => {
  const shared = shareStore();
  const author = await open({ as: A, shared });
  const mine = author.page.locator(`#message-${id(1)}`);
  await mine.getByRole("button", { name: "עריכה" }).click();
  await author.page.getByRole("textbox", { name: "עריכת ההודעה" }).fill("גרסה חדשה");
  await author.page.getByRole("button", { name: "שמירה" }).click();
  await mine.locator(".sod29-community-edited", { hasText: "נערך עכשיו" }).waitFor();
  assert.equal(await mine.getByRole("button", { name: "היסטוריית עריכות" }).count(), 0, "author gets no history control");
  await author.context.close();
  const other = await open({ as: B, shared });
  assert.equal(await other.page.locator(`#message-${id(1)}`).getByRole("button", { name: "היסטוריית עריכות" }).count(), 0);
  await other.context.close();
  const admin = await open({ as: ADMIN, shared });
  await admin.page.locator(`#message-${id(1)}`).getByRole("button", { name: "היסטוריית עריכות" }).click();
  const history = admin.page.getByRole("group", { name: "היסטוריית עריכות" });
  await history.getByText("הודעת מקור של אילנה https://example.org/page").waitFor();
  await history.getByRole("button", { name: "סגירה" }).click();
  await admin.context.close();
});

await scenario("message link: copy button, deep link shows the message with its ancestors, bad link is handled", async () => {
  const { page, context } = await open({ as: A });
  await page.locator(`#message-${id(3)}`).waitFor({ state: "detached" }).catch(() => {});
  await page.locator(`#message-${id(1)}`).getByRole("button", { name: "קישור" }).click();
  await page.locator(`#message-${id(1)}`).getByRole("status").filter({ hasText: /הקישור הועתק|message=/ }).waitFor();
  await context.close();
  const deep = await open({ path: `/community/chat?message=${id(3)}`, selector: ".sod29-community-focus" });
  const focus = deep.page.locator(".sod29-community-focus");
  await focus.getByText("הודעת מקור של אילנה").waitFor();
  await focus.getByText("תגובה של בועז").waitFor();
  await focus.getByText("תגובה מקוננת של אילנה").waitFor();
  await focus.getByRole("button", { name: "סגירה" }).click();
  await focus.waitFor({ state: "detached" });
  await deep.context.close();
  const bad = await open({ path: `/community/chat?message=${id(999)}` });
  await bad.page.getByText("ההודעה שביקשת כבר לא זמינה.").waitFor();
  assert.equal(await bad.page.locator(".sod29-community-focus").count(), 0);
  await bad.context.close();
});

await scenario("archive search: finds messages beyond the loaded page, shows remaining count, opens the thread context", async () => {
  const { page, context } = await open();
  assert.equal(await page.getByRole("button", { name: /חיפוש בכל הארכיון/ }).count(), 0, "no archive button before typing");
  await page.getByRole("searchbox").fill("ותיקה 1");
  await page.getByRole("button", { name: /חיפוש בכל הארכיון/ }).click();
  await page.getByText(/תוצאות ל״ותיקה 1״/).waitFor();
  const results = page.locator(".sod29-community-archive-results");
  await results.getByText("תגובה ותיקה 19", { exact: true }).waitFor();
  assert.equal(await results.locator(".sod29-community-thread").count(), 20, "first page of results");
  await results.getByRole("button", { name: "עוד תוצאות — 2 נותרו" }).click();
  await results.getByText("הודעה ותיקה 1", { exact: true }).waitFor();
  assert.equal(await results.locator(".sod29-community-thread").count(), 22);
  await results.getByRole("button", { name: /הצגה בהקשר השרשור/ }).first().click();
  await page.locator(".sod29-community-focus").waitFor();
  await results.getByRole("button", { name: "חזרה לשיחות" }).click();
  await page.locator(".sod29-community-archive-results").waitFor({ state: "detached" });
  await context.close();
});

await scenario("report and admin panel: report as a reader; admin deletes from the queue, restores from ״הוסרו לאחרונה״, hides a thread and restores it", async () => {
  const shared = shareStore();
  const guest = await open({ shared });
  assert.equal(await guest.page.getByRole("button", { name: "דיווח" }).count(), 0);
  assert.equal(await guest.page.getByText("ניהול הקהילה").count(), 0);
  await guest.context.close();
  const author = await open({ as: A, shared });
  assert.equal(await author.page.locator(`#message-${id(1)}`).getByRole("button", { name: "דיווח" }).count(), 0, "no report on own message");
  assert.equal(await author.page.getByText("ניהול הקהילה").count(), 0, "no admin panel for a regular user");
  await author.context.close();
  const reader = await open({ as: B, shared });
  await reader.page.locator(`#message-${id(1)}`).getByRole("button", { name: "דיווח" }).click();
  await reader.page.getByLabel("סיבה").selectOption("abuse");
  await reader.page.getByLabel(/הערה/).fill("תוכן פוגעני");
  await reader.page.getByRole("button", { name: "שליחת הדיווח" }).click();
  await reader.page.getByText("הדיווח נשלח למנהלים. תודה.").waitFor();
  await reader.context.close();

  const admin = await open({ as: ADMIN, shared });
  const page = admin.page;
  await page.getByText(/ניהול הקהילה/).first().click();
  const panel = page.locator(".sod29-community-admin");
  await panel.getByText("פגיעה או הטרדה").waitFor();
  await panel.getByText("הערה: תוכן פוגעני").waitFor();
  await panel.getByRole("button", { name: "מחיקת ההודעה" }).click();
  await panel.getByText("אין דיווחים פתוחים.").waitFor();
  await page.locator(".sod29-community-deleted").first().waitFor();
  assert.ok(admin.rows.find((x) => x.id === id(1)).deleted_at);
  const removed = panel.locator("section[aria-label='הוסרו לאחרונה']");
  await removed.getByText("הודעה שנמחקה").waitFor();
  await removed.getByRole("button", { name: "שחזור" }).first().click();
  await page.locator(`#message-${id(1)}`).getByText("הודעת מקור של אילנה").waitFor();
  assert.equal(admin.rows.find((x) => x.id === id(1)).deleted_at, null);
  // hide the thread, then restore it from the same list
  await page.locator(`#message-${id(1)}`).getByRole("button", { name: "הסתרת השרשור" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "הסתרת השרשור" }).click();
  await removed.getByText("שרשור שהוסתר").waitFor();
  await removed.getByRole("button", { name: "שחזור" }).first().click();
  await page.locator(`#message-${id(1)}`).getByText("הודעת מקור של אילנה").waitFor();
  assert.ok(admin.rows.filter((r) => [id(1), id(2), id(3), id(4)].includes(r.id)).every((r) => !r.thread_hidden_at && !r.deleted_at));
  await admin.context.close();
});

await scenario("auto link: a signed-in account matching an old author is linked once, with a notice; guests and the missing migration stay silent", async () => {
  const shared = shareStore();
  const first = await open({ as: B, shared });
  await first.page.locator("#legacy-claim").getByText(/קישרנו אליו 3 הודעות/).waitFor();
  await first.page.reload(); await first.page.waitForSelector(".sod29-community-thread");
  await first.page.waitForTimeout(500);
  assert.equal(await first.page.getByText(/מצאנו את החשבון שלך/).count(), 0, "attempted once per tab session");
  assert.equal(first.log.rpcCalls.filter((c) => c === "claim_by_email").length, 1, "one claim call across the reload");
  await first.context.close();
  const second = await open({ as: B, shared });
  await second.page.waitForTimeout(600);
  assert.equal(await second.page.getByText(/מצאנו את החשבון שלך/).count(), 0, "already linked: no repeated notice");
  await second.context.close();
  const guest = await open({ shared });
  await guest.page.waitForTimeout(400);
  assert.equal(guest.log.rpcCalls.filter((c) => c === "claim_by_email").length, 0, "guests never call it");
  await guest.context.close();
  const old = await open({ as: A, rpc: "missing" });
  await old.page.waitForTimeout(500);
  assert.equal(await old.page.getByText(/מצאנו את החשבון שלך/).count(), 0);
  assert.deepEqual(old.log.errors, []);
  await old.context.close();
});

await scenario("legacy claim card: guest sees it and is sent to the sign-in; dismiss persists; link from the old chat reopens it; signed-in results", async () => {
  const guest = await open();
  const card = guest.page.locator("#legacy-claim");
  await card.getByRole("heading", { name: "היית בצ׳אט הוותיק?" }).waitFor();
  await card.getByRole("button", { name: "מצא את החשבון הישן שלי" }).click();
  await guest.page.waitForFunction(() => document.activeElement?.id === "community-sign-in-email");
  assert.equal(guest.log.rpcCalls.filter((c) => c === "claim_by_email").length, 0, "guest never calls the server");
  await card.getByRole("button", { name: "לא רלוונטי" }).click();
  await card.waitFor({ state: "detached" });
  await guest.page.reload(); await guest.page.waitForSelector(".sod29-community-thread");
  assert.equal(await guest.page.locator("#legacy-claim").count(), 0, "dismissal persists");
  await guest.page.locator("#legacy-chat").scrollIntoViewIfNeeded();
  await guest.page.getByRole("link", { name: /קח את החשבון שלך/ }).click();
  await guest.page.locator("#legacy-claim").waitFor();
  await guest.context.close();

  const shared = shareStore();
  const linked = await open({ as: B, shared });
  await linked.page.locator("#legacy-claim[data-legacy-claim='claimed']").waitFor();
  await linked.page.locator("#legacy-claim").getByText(/קישרנו אליו 3 הודעות/).waitFor();
  await linked.context.close();

  const owner = await open({ as: A, shared });
  await owner.page.waitForTimeout(500);
  assert.equal(await owner.page.locator("#legacy-claim").count(), 0, "signed-in reader with nothing to show sees no card");
  await owner.page.goto(`${BASE}/community/chat#legacy-claim`); await owner.page.waitForSelector("#legacy-claim");
  await owner.page.locator("#legacy-claim").getByRole("button", { name: "מצא את החשבון הישן שלי" }).click();
  await owner.page.locator("#legacy-claim[data-legacy-claim='has_contributor']").waitFor();
  await owner.context.close();

  const none = await open({ as: ADMIN, shared });
  await none.page.goto(`${BASE}/community/chat#legacy-claim`); await none.page.waitForSelector("#legacy-claim");
  await none.page.locator("#legacy-claim").getByRole("button", { name: "מצא את החשבון הישן שלי" }).click();
  await none.page.locator("#legacy-claim[data-legacy-claim='no_match']").getByText(/לא מצאנו חשבון ישן/).waitFor();
  assert.ok(await none.page.locator("#legacy-claim a[href^='mailto:']").count() >= 1, "support route offered");
  await none.context.close();

  const old = await open({ as: B, rpc: "missing", shared: shareStore() });
  await old.page.goto(`${BASE}/community/chat#legacy-claim`); await old.page.waitForSelector("#legacy-claim");
  await old.page.locator("#legacy-claim").getByRole("button", { name: "מצא את החשבון הישן שלי" }).click();
  await old.page.locator("#legacy-claim[data-legacy-claim='unavailable']").waitFor();
  await old.context.close();
});

await scenario("no page errors in any run", async () => {
  const { page, context, log } = await open({ as: A });
  await page.waitForTimeout(300);
  assert.deepEqual(log.errors, []);
  await context.close();
});

await browser.close(); server.close();
const failed = results.filter(([, ok]) => !ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
