// Real Chromium test of the staff network-block panel (ZURIEL 26.11.2026). The REAL component and the REAL Royal and community stylesheets are bundled with esbuild; only the
// Supabase client is replaced by a recorder, so no network is used. Checks the two separate actions, the payloads, 44px targets, no overflow (desktop and phone), the hand-off from the
// pending panel and that the panel is absent while the RPCs do not exist. Screenshots go to $SHOTS (default ./.shots-community-net-blocks).
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
const stub = `export const supabase = { rpc: async (name, args) => { window.__calls.push([name, args]); const r = window.__responses[name]; if (r instanceof Error || r?.error) return { data: null, error: r.error || { message: String(r) } }; return { data: typeof r === 'function' ? r(args) : r, error: null }; } };`;
writeFileSync(join(dir, "entry.jsx"), `import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Panel from ${JSON.stringify(join(root, "src/components/community2029/CommunityNetBlocksPanel2029.jsx"))};
import Pending from ${JSON.stringify(join(root, "src/components/community2029/CommunityGuestReviewPanel2029.jsx"))};
import ${JSON.stringify(join(root, "src/pages/community2029.css"))};
import ${JSON.stringify(join(root, "src/components/community2029/CommunityNetBlocksPanel2029.css"))};
function App() {
  const [focus, setFocus] = useState(''); const [ready, setReady] = useState(false);
  const pending = window.__pending || [];
  return <div className="sod29-community" dir="rtl" style={{ maxWidth: 760, margin: '0 auto', padding: 16 }}>
    <MemoryRouterShim><Pending pending={pending} onReview={() => {}} onBlockRequest={ready ? setFocus : null} /></MemoryRouterShim>
    <Panel pendingIds={new Set(pending.map(p => p.id))} focusId={focus} onFocusHandled={() => setFocus('')} onReady={setReady} onChanged={() => { window.__changed = (window.__changed || 0) + 1; }} />
  </div>;
}
function MemoryRouterShim({ children }) { return children; }
createRoot(document.getElementById('root')).render(<App />);`);
const shim = { name: "stubs", setup(b) {
  b.onResolve({ filter: /\/supabase\.js$/ }, () => ({ path: "supabase-stub", namespace: "stub" }));
  b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: stub, loader: "js", resolveDir: root }));
  b.onResolve({ filter: /^react-router-dom$/ }, () => ({ path: "router-stub", namespace: "rstub" }));
  b.onLoad({ filter: /.*/, namespace: "rstub" }, () => ({ contents: "import React from 'react'; export const Link = ({ to, children, ...p }) => React.createElement('a', { href: to, ...p }, children);", loader: "js", resolveDir: root }));
} };
await build({ entryPoints: [join(dir, "entry.jsx")], bundle: true, format: "iife", outfile: join(dir, "app.js"), jsx: "automatic", loader: { ".css": "css", ".woff2": "empty", ".png": "empty", ".webp": "empty" }, plugins: [shim], logLevel: "silent", define: { "process.env.NODE_ENV": '"production"', "import.meta.env": "{}" }, nodePaths: [join(root, "node_modules")] });
writeFileSync(join(dir, "index.html"), `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="app.css"><style>:root{--s29-ink:#f5f0e8;--s29-line-strong:#8a7a55;--community-input:#14101d;--s29-focus-ring:#d9b15f;--s29-font-ui:system-ui}body{background:#0c0818;color:#f5f0e8;font:16px system-ui;margin:0}</style></head><body><div id="root"></div><script src="app.js"></script></body></html>`);
const url = "file://" + join(dir, "index.html");
const recent = [
  { id: "m1", created_at: "2026-11-26T10:00:00Z", author_name: "אורח", body: "הודעה פוגענית ראשונה", status: "approved", reviewed: true, can_block: true, network_blocked: false },
  { id: "m2", created_at: "2026-11-25T10:00:00Z", author_name: "אורח", body: "הודעה מוסתרת", status: "hidden", reviewed: true, can_block: true, network_blocked: false },
  { id: "m3", created_at: "2026-11-20T10:00:00Z", author_name: "אורח", body: "הודעה ישנה בלי רשת", status: "approved", reviewed: true, can_block: false, network_blocked: false },
  { id: "p1", created_at: "2026-11-26T11:00:00Z", author_name: "אורח", body: "הודעה שממתינה לבדיקה", status: "approved", reviewed: false, can_block: true, network_blocked: false },
];
const blocks = [{ id: "b1", state: "active", duration_kind: "d3", created_at: "2026-11-26T09:00:00Z", expires_at: "2026-11-29T09:00:00Z", reason: "הטרדה חוזרת של אורח", created_by_name: "אמילי", linked_messages: 2, permanent_requested: false, lifted_at: null, lifted_by_name: null, lift_reason: null }];
const browser = await chromium.launch();
let failures = 0; const ok = (cond, msg) => { try { assert.ok(cond, msg); console.log("PASS", msg); } catch (e) { failures++; console.log("FAIL", msg); } };
async function open(viewport, responses, pending = [{ id: "p1", author_name: "אורח", line: "הודעה שממתינה לבדיקה", href: null }]) {
  const ctx = await browser.newContext({ viewport, locale: "he-IL" }); const page = await ctx.newPage();
  await page.addInitScript(([r, p]) => { window.__calls = []; window.__responses = r; window.__pending = p; }, [responses, pending]);
  await page.goto(url); return { page, ctx };
}
const live = { community_guest_recent_v1: recent, community_net_blocks_list_v1: blocks, community_guest_hide_v1: null, community_guest_block_from_message_v1: "new-block", community_net_block_lift_v1: null };
// 1) not applied: the RPCs do not exist -> nothing from the panel is in the page, no error text
{ const { page, ctx } = await open({ width: 1440, height: 900 }, { community_guest_recent_v1: { error: { code: "PGRST202", message: "Could not find the function" } }, community_net_blocks_list_v1: { error: { code: "PGRST202", message: "Could not find the function" } } });
  await page.waitForTimeout(300);
  ok(await page.locator("[data-net-blocks-panel]").count() === 0, "not applied: the staff panel is absent (no error shown)");
  await page.locator(".sod29-community-pending-toggle").click();
  ok(await page.getByText("חסימת כתיבה…").count() === 0, "not applied: the pending panel offers no block action");
  await ctx.close(); }
for (const [name, viewport] of [["desktop", { width: 1440, height: 900 }], ["phone", { width: 390, height: 844 }]]) {
  const { page, ctx } = await open(viewport, live);
  await page.locator("[data-net-blocks-panel]").waitFor();
  await page.locator("[data-net-blocks-panel] .sod29-community-pending-toggle").click();
  ok(await page.locator('[data-recent-guest="p1"]').count() === 0, `${name}: a message still pending is NOT listed twice (it stays in the pending panel)`);
  ok(await page.locator('[data-recent-guest="m1"]').count() === 1, `${name}: reviewed messages are listed`);
  ok((await page.locator('[data-recent-guest="m2"]').innerText()).includes("מוסתרת") && (await page.locator('[data-recent-guest="m2"] button', { hasText: "הסתרת הודעה" }).count()) === 0, `${name}: an already hidden message offers no second hide`);
  ok((await page.locator('[data-recent-guest="m3"]').innerText()).includes("אי אפשר לחסום לפיה"), `${name}: a historical message can only be hidden`);
  // blocking: separate from hiding
  await page.locator('[data-recent-guest="m1"] button', { hasText: "חסימת כתיבה" }).click();
  const confirm = page.locator('[data-recent-guest="m1"] .r29-btn.is-primary');
  ok(await confirm.isDisabled(), `${name}: the confirm button is disabled until a duration and a reason exist`);
  ok(await page.locator('[data-recent-guest="m1"] [role="radio"]').count() === 3, `${name}: exactly three durations`);
  ok((await page.locator('[data-recent-guest="m1"]').innerText()).includes("חסימה לצמיתות מושבתת"), `${name}: permanent blocks are shown as disabled`);
  await page.locator('[data-recent-guest="m1"] [role="radio"]', { hasText: "3 ימים" }).click();
  await page.locator('[data-recent-guest="m1"] textarea').fill("הטרדה חוזרת ונשנית של אורח");
  ok(await confirm.isEnabled(), `${name}: the confirm button enables with a duration and a reason`);
  const boxes = await page.locator('[data-recent-guest="m1"] .r29-btn, [data-recent-guest="m1"] .r29-check').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().height)));
  ok(boxes.every(h => h >= 44), `${name}: every button and check row is at least 44px high (${boxes.join(",")})`);
  const over = await page.evaluate(() => { const w = window.innerWidth; const els = [...document.querySelectorAll(".sod29-community *")]; return { sw: Math.max(0, ...els.map(e => Math.ceil(e.getBoundingClientRect().right))), w, els: els.filter(e => e.getBoundingClientRect().right > w + 1 || e.getBoundingClientRect().left < -1).slice(0, 6).map(e => e.tagName + "." + String(e.className).slice(0, 60) + " " + Math.round(e.getBoundingClientRect().left) + ".." + Math.round(e.getBoundingClientRect().right)) }; });
  ok(over.sw <= over.w, `${name}: no content wider than the viewport ${over.sw > over.w ? JSON.stringify(over) : ""}`);
  await page.screenshot({ path: join(shots, `block-form-${name}.png`), fullPage: true });
  await confirm.click();
  await page.waitForFunction(() => window.__calls.some(c => c[0] === "community_guest_block_from_message_v1"));
  const calls = await page.evaluate(() => window.__calls);
  const block = calls.find(c => c[0] === "community_guest_block_from_message_v1");
  ok(JSON.stringify(block[1]) === JSON.stringify({ p_message_id: "m1", p_duration: "d3", p_reason: "הטרדה חוזרת ונשנית של אורח" }), `${name}: the block call carries exactly the message, the duration and the reason`);
  ok(!calls.some(c => c[0] === "community_guest_hide_v1" || c[0] === "community_guest_review"), `${name}: blocking never hides the message (no hide call was made)`);
  ok((await page.evaluate(() => window.__changed || 0)) >= 1, `${name}: the feed is told to refresh`);
  // hiding: separate
  await page.locator('[data-recent-guest="m1"] button', { hasText: "הסתרת הודעה" }).click();
  await page.locator('[data-recent-guest="m1"] textarea').fill("הודעה פוגענית וברורה");
  await page.locator('[data-recent-guest="m1"] .r29-btn.is-primary').click();
  await page.waitForFunction(() => window.__calls.some(c => c[0] === "community_guest_hide_v1"));
  const calls2 = await page.evaluate(() => window.__calls);
  ok(JSON.stringify(calls2.find(c => c[0] === "community_guest_hide_v1")[1]) === JSON.stringify({ p_message_id: "m1", p_reason: "הודעה פוגענית וברורה" }), `${name}: hiding is its own call with its own reason`);
  ok(calls2.filter(c => c[0] === "community_guest_block_from_message_v1").length === 1, `${name}: hiding made no further block call`);
  // lifting
  await page.locator('[data-net-block="b1"] button', { hasText: "ביטול חסימה" }).click();
  await page.locator('[data-net-block="b1"] textarea').fill("נבדק והוסר לבקשת הצוות");
  await page.locator('[data-net-block="b1"] .r29-btn.is-primary').click();
  await page.waitForFunction(() => window.__calls.some(c => c[0] === "community_net_block_lift_v1"));
  ok(true, `${name}: a block can be lifted with a reason`);
  const text = await page.locator("body").innerText();
  ok(!/(?:\d{1,3}\.){3}\d{1,3}|[0-9a-f]{64}/.test(text), `${name}: no address or network reference appears anywhere in the page`);
  await ctx.close();
}
// hand-off from the pending panel
{ const { page, ctx } = await open({ width: 1440, height: 900 }, live);
  await page.locator("[data-net-blocks-panel]").waitFor();
  await page.locator(".sod29-community-pending-toggle").first().click();
  await page.getByText("חסימת כתיבה…").click();
  await page.locator('[data-recent-guest="p1"] [role="radiogroup"]').waitFor();
  ok(await page.locator('[data-recent-guest="p1"]').count() === 1, "hand-off: the pending message opens its block form in the staff panel (listed once, only now)");
  await page.screenshot({ path: join(shots, "handoff-desktop.png"), fullPage: true });
  await ctx.close(); }
await browser.close(); rmSync(dir, { recursive: true, force: true });
console.log(failures ? `FAILED ${failures}` : "ALL PASS"); process.exit(failures ? 1 : 0);
