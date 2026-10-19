// Browser test for the community page: menu entry, page order, lazy OpenWeb, thread/remaining counts,
// author edit, soft delete (leaf / reply with children / main message with thread), admin thread hide,
// permission and server failures, and the pre-migration fallback.
// Runs the real built app (dist, from `npm run build:2029`) against an in-memory stand-in for the
// community_* functions that mirrors tests/sql/community_edit_delete_threads.sql. No live service is reached.
// Usage: PLAYWRIGHT_MODULE=/path/to/playwright node scripts/test-community-edit-delete-ui.mjs
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

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

const A = "a0000000-0000-4000-8000-000000000001";
const B = "b0000000-0000-4000-8000-000000000002";
const ADMIN = "ad000000-0000-4000-8000-000000000003";
const profiles = { [A]: { id: A, display_name: "אילנה", username: "ilana", role: "user" }, [B]: { id: B, display_name: "בועז", username: "boaz", role: "user" }, [ADMIN]: { id: ADMIN, display_name: "מנהל", username: "admin", role: "admin" } };
const id = (n) => `c0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const T0 = Date.parse("2026-10-01T10:00:00Z");

function makeStore() {
  const rows = [];
  let tick = 0;
  const add = (n, parent, author, body, origin = "community_2029") => rows.push({ id: id(n), parent_id: parent ? id(parent) : null, author_user_id: author, author_contributor_id: null, author_name: author ? profiles[author].display_name : "חבר ותיק", title: null, body, reactions: {}, origin, status: "approved", created_at: new Date(T0 + 60000 * ++tick + 1000000000).toISOString(), edited_at: null, deleted_at: null, thread_hidden_at: null, image_url: null });
  for (let i = 0; i < 45; i++) add(200 + i, null, null, `הודעה ותיקה ${i + 1}`, "openweb"); // older than everything below, so the tested messages sit on page one
  add(1, null, A, "הודעת מקור של אילנה https://example.org/page");
  add(2, 1, B, "תגובה של בועז"); add(3, 2, A, "תגובה מקוננת של אילנה"); add(4, 1, B, "תגובה שנייה של בועז");
  add(5, null, B, "הודעה בלי תגובות של בועז");
  add(6, null, null, "הודעה היסטורית מ-OpenWeb", "openweb");
  for (let i = 0; i < 25; i++) add(100 + i, 6, null, `תגובה ותיקה ${i + 1}`, "openweb");
  return rows;
}

function semantics(rows) {
  const live = (r) => r.status === "approved" && !r.deleted_at && !r.thread_hidden_at && ["openweb", "community_2029"].includes(r.origin) && (r.body || "").trim();
  const kids = (pid) => rows.filter((r) => r.parent_id === pid);
  const hasLive = (pid, depth = 0) => depth < 64 && kids(pid).some((c) => live(c) || (c.deleted_at && !c.thread_hidden_at && hasLive(c.id, depth + 1)));
  const visible = (r) => live(r) ? "live" : (r.deleted_at && !r.thread_hidden_at && ["openweb", "community_2029"].includes(r.origin) && hasLive(r.id)) ? "tomb" : null;
  const shape = (r, kind, total) => ({ id: r.id, parent_id: r.parent_id, author_name: kind === "tomb" ? null : r.author_name, author_user_id: kind === "tomb" ? null : r.author_user_id, author_contributor_id: null, title: null, body: kind === "tomb" ? null : r.body, reactions: kind === "tomb" ? {} : r.reactions, origin: r.origin, created_at: r.created_at, edited_at: kind === "tomb" ? null : r.edited_at, is_deleted: kind === "tomb", contributor_id: null, contributor_user_id: null, contributor_display_name: null, contributor_avatar_url: null, total_count: total });
  const page = (list, offset, limit, asc, always) => {
    const sorted = list.sort((x, y) => (asc ? 1 : -1) * (x.r.created_at.localeCompare(y.r.created_at) || x.r.id.localeCompare(y.r.id)));
    return sorted.slice(offset, offset + limit).map(({ r, kind }) => shape(r, kind, offset === 0 || always ? sorted.length : null));
  };
  return {
    feed: ({ p_offset = 0, p_limit = 40, p_sort }) => page(rows.filter((r) => !r.parent_id).map((r) => ({ r, kind: visible(r) })).filter((x) => x.kind), p_offset, p_limit, p_sort === "oldest", false),
    replies: ({ p_parent, p_offset = 0, p_limit = 20 }) => page(kids(p_parent).map((r) => ({ r, kind: visible(r) })).filter((x) => x.kind), p_offset, p_limit, true, true),
    counts: ({ p_ids }) => p_ids.map((pid) => ({ parent_id: pid, reply_count: kids(pid).filter(visible).length })).filter((x) => x.reply_count),
    edit(uid, { p_id, p_body }) {
      if (!uid) throw new Error("auth required");
      const r = rows.find((x) => x.id === p_id); if (!r) throw new Error("not found");
      if (r.origin !== "community_2029" || r.author_user_id !== uid) throw new Error("not authorized");
      if (r.deleted_at || r.status !== "approved") throw new Error("not editable");
      if (!p_body.trim()) throw new Error("empty body");
      r.body = p_body.trim(); r.edited_at = new Date().toISOString(); return r.edited_at;
    },
    remove(uid, { p_id }) {
      if (!uid) throw new Error("auth required");
      const r = rows.find((x) => x.id === p_id); if (!r) throw new Error("not found");
      const admin = profiles[uid]?.role === "admin";
      if (!admin && !(r.origin === "community_2029" && r.author_user_id === uid)) throw new Error("not authorized");
      if (r.deleted_at) return "already_deleted";
      Object.assign(r, { body: null, deleted_at: new Date().toISOString(), status: "hidden" }); return "deleted";
    },
    hide(uid, { p_root }) {
      if (profiles[uid]?.role !== "admin") throw new Error("not authorized");
      const stack = [p_root]; let n = 0;
      while (stack.length) { const cur = stack.pop(); const r = rows.find((x) => x.id === cur); if (r && !r.thread_hidden_at && (r.status === "approved" || r.deleted_at)) { r.thread_hidden_at = new Date().toISOString(); if (r.status === "approved") r.status = "hidden"; n++; } kids(cur).forEach((k) => stack.push(k.id)); }
      return n;
    },
  };
}

const b64 = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
function sessionFor(uid) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const user = { id: uid, aud: "authenticated", role: "authenticated", email: "x@example.invalid", email_confirmed_at: "2026-10-13T00:00:00Z", app_metadata: {}, user_metadata: {}, identities: [], created_at: "2026-01-01T00:00:00Z" };
  return { user, session: { access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: uid, role: "authenticated", exp })}.sig`, refresh_token: "r", token_type: "bearer", expires_in: 3600, expires_at: exp, user } };
}
const subOf = (header) => { try { return JSON.parse(Buffer.from((header || "").replace(/^Bearer /, "").split(".")[1], "base64url").toString()).sub || null; } catch { return null; } };

const results = [];
async function scenario(name, fn) {
  try { await fn(); results.push([name, true]); console.log("PASS", name); } catch (error) { results.push([name, false]); console.log("FAIL", name, "\n   ", String(error.message).split("\n").slice(0, 6).join("\n    ")); }
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });

async function open({ as = null, rpc = "on", failDelete = false, viewport = { width: 1280, height: 900 }, theme = null } = {}) {
  const context = await browser.newContext({ viewport, locale: "he-IL" });
  const rows = makeStore(); const sem = semantics(rows);
  const log = { launcher: 0, tableReads: 0, rpcCalls: [], writes: [], errors: [] };
  if (as) { const { session } = sessionFor(as); await context.addInitScript((v) => localStorage.setItem("sb-linswmnnkjxvweumprav-auth-token", JSON.stringify(v)), session); }
  if (theme) await context.addInitScript((t) => { try { localStorage.setItem("sod29-theme-preset", t); localStorage.setItem("theme-preset", t); } catch {} }, theme);
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === BASE) return route.fallback();
    if (url.host === "launcher.spot.im") { log.launcher++; return route.fulfill({ status: 200, contentType: "application/javascript", body: "" }); }
    if (url.host !== "linswmnnkjxvweumprav.supabase.co") return route.abort();
    const req = route.request(); const uid = subOf(req.headers()["authorization"]) || null;
    const json = (data, status = 200, headers = {}) => route.fulfill({ status, contentType: "application/json", headers, body: JSON.stringify(data) });
    const path = url.pathname;
    if (path === "/auth/v1/user") return json(sessionFor(uid || A).user);
    if (path === "/rest/v1/users") { const ids = (url.searchParams.get("id") || "").replace(/^in\.\(|\)$/g, "").split(","); const hit = (uid && profiles[uid] ? [profiles[uid]] : []).concat(ids.filter((x) => profiles[x] && x !== uid).map((x) => profiles[x])); return json(hit); }
    if (path === "/rest/v1/site_flags") return json([]);
    if (path.startsWith("/rest/v1/rpc/community_")) {
      const fn = path.split("/").pop(); const args = req.postDataJSON() || {};
      log.rpcCalls.push(fn);
      if (rpc === "missing") return json({ code: "PGRST202", message: "Could not find the function public." + fn, details: null, hint: null }, 404);
      try {
        if (fn === "community_feed_page") return json(sem.feed(args));
        if (fn === "community_replies_page") return json(sem.replies(args));
        if (fn === "community_reply_counts") return json(sem.counts(args));
        if (fn === "community_edit_message") { log.writes.push(fn); return json(sem.edit(uid, args)); }
        if (fn === "community_delete_message") { log.writes.push(fn); if (failDelete) return json({ code: "XX000", message: "boom", details: null, hint: null }, 500); return json(sem.remove(uid, args)); }
        if (fn === "community_hide_thread") { log.writes.push(fn); return json(sem.hide(uid, args)); }
      } catch (error) { return json({ code: "P0001", message: error.message, details: null, hint: null }, 400); }
    }
    if (path === "/rest/v1/research_contributions") {
      log.tableReads++;
      const parent = url.searchParams.get("parent_id"); const desc = (url.searchParams.get("order") || "").includes("created_at.desc"); const list = rows.filter((r) => r.status === "approved" && r.body && (parent === "is.null" ? !r.parent_id : parent?.startsWith("eq.") ? r.parent_id === parent.slice(3) : parent?.startsWith("in.") ? parent.slice(4, -1).split(",").includes(r.parent_id) : true)).sort((x, y) => (desc ? -1 : 1) * (x.created_at.localeCompare(y.created_at) || x.id.localeCompare(y.id)));
      const range = req.headers()["range"] || "0-39"; const [a, z] = range.split("-").map(Number);
      return json(list.slice(a, z + 1), 200, { "content-range": `${a}-${a + Math.max(0, Math.min(list.length - a, z - a + 1) - 1)}/${list.length}` });
    }
    if (path === "/rest/v1/contributors") return json([]);
    if (path.startsWith("/rest/v1/rpc/")) return json(null);
    return json([]);
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => log.errors.push(error.message));
  await page.goto(`${BASE}/community/chat`);
  await page.waitForSelector(".sod29-community-thread", { timeout: 15000 });
  return { page, context, rows, log };
}
const msg = (page, text) => page.locator(".sod29-community-thread", { hasText: text }).first();
const group = (page, text) => page.locator(".sod29-community-thread-group", { has: page.locator(".sod29-community-thread", { hasText: text }) }).first();

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
