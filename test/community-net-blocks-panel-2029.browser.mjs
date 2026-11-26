// Real Chromium test of the simplified community moderation (ZURIEL 26.11.2026). The REAL page module (LiveMessage, SearchHit, the lazy staff module) and the REAL
// community and Royal stylesheets are bundled with esbuild; only the Supabase client (createClient) and the auth hook are replaced by recorders, so no network is used.
// Checks: moderation sits ON the message, two separate actions with exact payloads, 44px targets, no overflow (desktop and phone), search replies open IN PLACE
// without navigation and without losing the scroll position, the active-blocks panel lifts a block, and nothing appears when the RPCs do not exist.
import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "esbuild";
import assert from "node:assert/strict";
const { chromium } = createRequire(import.meta.url)("playwright");
const root = resolve(new URL("..", import.meta.url).pathname);
const dir = mkdtempSync(join(tmpdir(), "netblocks-"));
const shots = process.env.SHOTS || resolve(".shots-community-net-blocks"); mkdirSync(shots, { recursive: true });
const clientStub = `
const handler = name => ({ then: (res) => { const calls = (window.__calls ||= []); return Promise.resolve().then(() => res), undefined; } });
function builder(name, args) {
  window.__calls.push([name, args]);
  const r = window.__responses[name];
  const result = r && r.error ? { data: null, error: r.error } : { data: typeof r === 'function' ? r(args) : (r ?? []), error: null };
  const b = { select() { return b; }, abortSignal() { return b; }, then(res, rej) { return Promise.resolve(result).then(res, rej); } };
  return b;
}
const deep = () => new Proxy(function () {}, { get: (_, k) => k === 'then' ? undefined : k === 'data' ? [] : deep(), apply: () => deep() });
const client = new Proxy({ rpc: (name, args) => builder(name, args) }, { get: (t, k) => k in t ? t[k] : (k === 'then' ? undefined : deep()) });
export const createClient = () => client;
`;
const authStub = `import React from 'react'; export const useAuth = () => ({ user: { id: 'u-staff' }, isAdmin: true, canModerateGuests: true, loading: false, verified: true, profile: null }); export const AuthProvider = ({ children }) => children; export const AuthContext = React.createContext(null);`;
writeFileSync(join(dir, "entry.jsx"), `import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { LiveMessageForTest as LiveMessage, SearchHitForTest as SearchHit, guestModerationHolderForTest as holder } from ${JSON.stringify(join(root, "src/components/community2029/CommunityLive2029.jsx"))};
import Panel from ${JSON.stringify(join(root, "src/components/community2029/CommunityNetBlocksPanel2029.jsx"))};
const row = id => ({ id, parentId: null, authorName: 'אורח', authorKey: null, authorUserId: null, linkedUserId: null, avatarUrl: null, title: null, body: 'הודעת אורח ' + id, reactions: {}, origin: 'community_2029', createdAt: '2026-11-26T10:00:00Z', editedAt: null, isDeleted: false });
function App() {
  const [v, setV] = React.useState(0);
  const items = new Map((window.__items || []).map(i => [i.id, i]));
  holder.current = { items, changed: () => { window.__changed = (window.__changed || 0) + 1; setV(x => x + 1); } };
  const common = { accountProfiles: {}, onReply: () => {}, replyCounts: {}, onRepliesLoaded: () => {}, refreshToken: 0, onReplyCountKnown: () => {} };
  return <MemoryRouter><div className="sod29-community" dir="rtl" style={{ maxWidth: 760, margin: '0 auto', padding: 16 }}>
    <Panel version={v} onChanged={() => { window.__changed = (window.__changed || 0) + 1; }} />
    <div style={{ height: 1200 }} data-spacer>spacer</div>
    <div data-feed><LiveMessage row={row('m1')} accountProfiles={{}} onReply={() => {}} formatDate={d => d} /></div>
    <div data-guest-pending><LiveMessage row={row('m3')} accountProfiles={{}} onReply={() => {}} formatDate={d => d} /></div>
    <div data-search><SearchHit row={row('5a1e0000-0000-4000-8000-000000000001')} {...common} /></div>
  </div></MemoryRouter>;
}
createRoot(document.getElementById('root')).render(<App />);`);
const plugin = { name: "stubs", setup(b) {
  b.onResolve({ filter: /^@supabase\/supabase-js$/ }, () => ({ path: "sb", namespace: "stub" }));
  b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: clientStub, loader: "js", resolveDir: root }));
  b.onResolve({ filter: /AuthContext\.jsx$/ }, () => ({ path: "auth", namespace: "authstub" }));
  b.onLoad({ filter: /.*/, namespace: "authstub" }, () => ({ contents: authStub, loader: "jsx", resolveDir: root }));
} };
await build({ entryPoints: [join(dir, "entry.jsx")], bundle: true, format: "iife", outfile: join(dir, "app.js"), jsx: "automatic", loader: { ".css": "css", ".woff2": "empty", ".png": "empty", ".webp": "empty", ".svg": "empty", ".jpg": "empty" }, plugins: [plugin], logLevel: "error", define: { "process.env.NODE_ENV": '"production"', "import.meta.env": "{ \"VITE_INTEGRATED_PREVIEW\": \"false\" }" }, nodePaths: [join(root, "node_modules")] });
writeFileSync(join(dir, "index.html"), `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="app.css"><style>:root{--s29-ink:#f5f0e8;--s29-line-strong:#8a7a55;--community-input:#14101d;--s29-focus-ring:#d9b15f;--s29-font-ui:system-ui}body{background:#0c0818;color:#f5f0e8;font:16px system-ui;margin:0}</style></head><body><div id="root"></div><script src="app.js"></script></body></html>`);
const url = "file://" + join(dir, "index.html");
const items = [
  { id: "m1", created_at: "2026-11-26T10:00:00Z", author_name: "אורח", body: "x", status: "approved", reviewed: true, can_block: true, network_blocked: false },
  { id: "m3", created_at: "2026-11-26T11:00:00Z", author_name: "אורח", body: "y", status: "approved", reviewed: false, can_block: true, network_blocked: false },
].map(i => ({ id: i.id, status: i.status, canBlock: i.can_block, networkBlocked: i.network_blocked }));
const blocks = [{ id: "b1", state: "active", duration_kind: "d3", duration: "d3", created_at: "2026-11-26T09:00:00Z", expires_at: "2026-11-29T09:00:00Z", reason: "הטרדה חוזרת של אורח", created_by_name: "אמילי", by: "אמילי", linked_messages: 2 }];
const reply = (id, parent) => ({ id, parent_id: parent, author_name: "חבר", body: "תגובה " + id, reactions: {}, origin: "community_2029", created_at: "2026-11-26T12:00:00Z", total_count: 2 });
const browser = await chromium.launch();
let failures = 0; const ok = (cond, msg) => { if (cond) console.log("PASS", msg); else { failures++; console.log("FAIL", msg); } };
async function open(viewport, responses, shownItems = items) {
  const ctx = await browser.newContext({ viewport, locale: "he-IL" }); const page = await ctx.newPage();
  const errors = []; page.on("pageerror", e => errors.push(String(e)));
  await page.addInitScript(([r, it]) => { window.__calls = []; window.__responses = r; window.__items = it; }, [responses, shownItems]);
  await page.goto(url); await page.waitForSelector("[data-feed] article"); return { page, ctx, errors };
}
const live = { community_net_blocks_list_v1: blocks, community_guest_hide_v1: null, community_guest_block_from_message_v1: "new-block", community_net_block_lift_v1: null,
  community_replies_page: [reply("6b2e0000-0000-4000-8000-000000000001", "5a1e0000-0000-4000-8000-000000000001"), reply("6b2e0000-0000-4000-8000-000000000002", "5a1e0000-0000-4000-8000-000000000001")] };
// 1) feature not applied: no moderation row, no panel
{ const { page, ctx } = await open({ width: 1440, height: 900 }, { community_net_blocks_list_v1: { error: { code: "PGRST202", message: "Could not find the function" } } }, []);
  await page.waitForTimeout(300);
  ok(await page.locator("[data-guest-moderation], [data-net-blocks-panel]").count() === 0, "not applied: no moderation row and no panel (no error shown)");
  await ctx.close(); }
for (const [name, viewport] of [["desktop", { width: 1440, height: 900 }], ["phone", { width: 390, height: 844 }]]) {
  const { page, ctx, errors } = await open(viewport, live);
  await page.waitForSelector('[data-guest-moderation="m1"]');
  ok(await page.locator("[data-guest-moderation]").count() === 2, `${name}: moderation rides on each guest message (two here), nowhere else`);
  const m1 = page.locator('[data-guest-moderation="m1"]'), m3 = page.locator('[data-guest-moderation="m3"]');
  ok((await m1.innerText()).includes("הסתרת הודעה") && (await m1.innerText()).includes("חסימת כתיבה"), `${name}: a reviewed message offers hide and block, as two buttons`);
  ok((await m3.innerText()).includes("חסימת כתיבה"), `${name}: the block action is also offered on a guest message that was published but not yet reviewed`);
  ok(await page.locator("[data-recent-guest]").count() === 0 && !(await page.locator("body").innerText()).includes("הודעות אורח אחרונות"), `${name}: no extra list of messages anywhere`);
  // panel: collapsed one-liner, lift in place
  const toggle = page.locator("[data-net-blocks-panel] .sod29-community-pending-toggle");
  ok((await toggle.innerText()).includes("חסימות כתיבה פעילות · 1"), `${name}: one concentrated panel of active blocks`);
  // blocking
  await m1.getByRole("button", { name: "חסימת כתיבה" }).click();
  const confirm = m1.locator(".r29-btn.is-primary");
  ok(await confirm.isDisabled(), `${name}: confirm is disabled until a duration and a reason exist`);
  ok(await m1.locator('[role="radio"]').count() === 3 && (await m1.innerText()).includes("חסימה לצמיתות מושבתת"), `${name}: three durations; permanent shown as disabled`);
  await m1.locator('[role="radio"]', { hasText: "3 ימים" }).click();
  await m1.locator("textarea").fill("הטרדה חוזרת ונשנית של אורח");
  ok(await confirm.isEnabled(), `${name}: confirm enables with a duration and a reason`);
  const heights = await m1.locator(".r29-btn, .r29-check, .sod29-community-manage-action").evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().height)));
  ok(heights.every(h => h >= 44), `${name}: every moderation target is at least 44px high (${heights.join(",")})`);
  const over = await page.evaluate(() => { const w = window.innerWidth; const els = [...document.querySelectorAll(".sod29-community *")].filter(e => e.getBoundingClientRect().right > w + 1 || e.getBoundingClientRect().left < -1); return els.slice(0, 5).map(e => e.tagName + "." + String(e.className).slice(0, 50)); });
  ok(over.length === 0, `${name}: nothing wider than the viewport ${over.join(" | ")}`);
  await m1.scrollIntoViewIfNeeded(); await page.screenshot({ path: join(shots, `moderation-block-form-${name}.png`) });
  await confirm.click();
  await page.waitForFunction(() => window.__calls.some(c => c[0] === "community_guest_block_from_message_v1"));
  let calls = await page.evaluate(() => window.__calls);
  ok(JSON.stringify(calls.find(c => c[0] === "community_guest_block_from_message_v1")[1]) === JSON.stringify({ p_message_id: "m1", p_duration: "d3", p_reason: "הטרדה חוזרת ונשנית של אורח" }), `${name}: the block call carries exactly the message, duration and reason`);
  ok(!calls.some(c => c[0] === "community_guest_hide_v1"), `${name}: blocking never hides the message`);
  ok((await page.evaluate(() => window.__changed || 0)) >= 1, `${name}: the feed is told to refresh`);
  // hiding
  await m1.getByRole("button", { name: "הסתרת הודעה" }).click();
  await m1.locator("textarea").fill("הודעה פוגענית וברורה");
  await m1.locator(".r29-btn.is-primary").click();
  await page.waitForFunction(() => window.__calls.some(c => c[0] === "community_guest_hide_v1"));
  calls = await page.evaluate(() => window.__calls);
  ok(JSON.stringify(calls.find(c => c[0] === "community_guest_hide_v1")[1]) === JSON.stringify({ p_message_id: "m1", p_reason: "הודעה פוגענית וברורה" }) && calls.filter(c => c[0] === "community_guest_block_from_message_v1").length === 1, `${name}: hiding is its own call with its own reason; no further block call`);
  // lift
  await toggle.click();
  await page.locator('[data-net-block="b1"] button', { hasText: "ביטול חסימה" }).click();
  await page.locator('[data-net-block="b1"] textarea').fill("נבדק והוסר לבקשת הצוות");
  await page.locator('[data-net-block="b1"] .r29-btn.is-primary').click();
  await page.waitForFunction(() => window.__calls.some(c => c[0] === "community_net_block_lift_v1"));
  ok(true, `${name}: a block can be lifted with a reason`);
  ok(!/(?:\d{1,3}\.){3}\d{1,3}|[0-9a-f]{64}/.test(await page.locator("body").innerText()), `${name}: no address or network reference appears in the page`);
  ok(errors.length === 0, `${name}: no page errors ${errors.join(" | ")}`);
  await ctx.close();
}
// search hit: replies open in place, scroll position kept, no navigation
for (const [name, viewport] of [["desktop", { width: 1440, height: 900 }], ["phone", { width: 390, height: 844 }]]) {
  const { page, ctx, errors } = await open(viewport, live);
  const hit = page.locator("[data-search] .sod29-community-search-hit");
  await hit.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -120));
  await hit.getByRole("button", { name: "פתיחת תגובות" }).scrollIntoViewIfNeeded();
  const before = await hit.locator("article").first().evaluate(e => Math.round(e.getBoundingClientRect().top));
  const url0 = page.url(); const navs = []; page.on("framenavigated", f => navs.push(f.url()));
  await hit.getByRole("button", { name: "פתיחת תגובות" }).click();
  await hit.locator("#search-replies-5a1e0000-0000-4000-8000-000000000001 article").first().waitFor({ timeout: 5000 }).catch(async () => { console.log("DEBUG", JSON.stringify(await page.evaluate(() => window.__calls)), (await hit.innerText()).slice(0, 300), errors.join("|")); throw new Error("replies did not render"); });
  const after = await hit.locator("article").first().evaluate(e => Math.round(e.getBoundingClientRect().top));
  ok(Math.abs(after - before) <= 2, `${name}: opening replies keeps the reader's place (moved ${after - before}px)`);
  ok(await hit.locator("#search-replies-5a1e0000-0000-4000-8000-000000000001 article").count() === 2, `${name}: both replies show under the message, inside the same result`);
  ok(page.url() === url0 && navs.length === 0, `${name}: no navigation to a separate thread view`);
  ok(await hit.getByRole("button", { name: "סגירת תגובות" }).count() === 1, `${name}: the control becomes "סגירת תגובות"`);
  await page.screenshot({ path: join(shots, `replies-in-place-${name}.png`) });
  await hit.getByRole("button", { name: "סגירת תגובות" }).click();
  ok(await hit.locator("#search-replies-5a1e0000-0000-4000-8000-000000000001").count() === 0, `${name}: closing removes them again`);
  ok(errors.length === 0, `${name}: no page errors ${errors.join(" | ")}`);
  await ctx.close();
}
await browser.close(); rmSync(dir, { recursive: true, force: true });
console.log(failures ? `FAILED ${failures}` : "ALL PASS"); process.exit(failures ? 1 : 0);
