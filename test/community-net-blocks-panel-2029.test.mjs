import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Bundles the real component (no network, no router) the same way the other mounted-markup tests do, renders seeded states and removes the bundle.
const outfile = resolve(`.test-community-net-blocks-${process.pid}.mjs`);
await build({ entryPoints: [new URL("../src/components/community2029/CommunityNetBlocksPanel2029.jsx", import.meta.url).pathname], bundle: true, format: "esm", platform: "node", outfile,
  external: ["react", "react-dom", "@supabase/supabase-js"], loader: { ".css": "empty" }, jsx: "automatic", logLevel: "silent", define: { "import.meta.env": "{}" } });
const { default: Panel, GuestMessageModeration: Moderation } = await import(pathToFileURL(outfile).href);
fs.rmSync(outfile, { force: true });

const item = { id: "m1", createdAt: "2026-11-26T10:00:00Z", authorName: "אורח", body: "הודעה פוגענית", status: "approved", reviewed: true, canBlock: true, networkBlocked: false };
const blocks = [{ id: "b1", state: "active", duration: "d3", createdAt: "2026-11-26T09:00:00Z", expiresAt: "2026-11-29T09:00:00Z", reason: "הטרדה חוזרת של אורח", by: "אמילי", linkedMessages: 2, permanentRequested: false, liftedAt: null, liftedBy: null, liftReason: null }];
const panel = seed => renderToStaticMarkup(React.createElement(Panel, { seed }));
const mod = (props, seed = null) => renderToStaticMarkup(React.createElement(Moderation, { item, seed, ...props }));

test("the blocks panel stays out of the page until the server confirms the feature, and while no block is active", () => {
  assert.equal(panel(null), "");
  assert.equal(panel({ available: false, blocks }), "");
  assert.equal(panel({ available: true, blocks: [] }), "");
});
test("collapsed it is one toggle with the active count; opened it lists only active blocks with lifting, and no message list", () => {
  const closed = panel({ available: true, open: false, blocks });
  assert.match(closed, /חסימות כתיבה פעילות · 1/); assert.ok(!closed.includes("ביטול חסימה"));
  const opened = panel({ available: true, open: true, blocks });
  assert.match(opened, /ביטול חסימה/); assert.match(opened, /חסימה לצמיתות מושבתת/);
  assert.ok(!opened.includes("הודעות אורח אחרונות") && !opened.includes("data-recent-guest"), "no second list of messages");
});
test("on the message: hiding and blocking writing are two separate compact actions; nothing is shown when neither applies", () => {
  const html = mod({});
  assert.match(html, /הסתרת הודעה/); assert.match(html, /חסימת כתיבה/);
  assert.ok(!mod({ item: { ...item, status: "hidden" } }).includes("הסתרת הודעה"), "an already hidden message offers no second hide");
  const pending = mod({ unreviewed: true });
  assert.ok(!pending.includes("הסתרת הודעה") && pending.includes("חסימת כתיבה"), "a pending message keeps its own approve/hide banner; only the block is added");
  assert.equal(mod({ item: { ...item, canBlock: false, status: "hidden" } }), "", "an old hidden message shows nothing");
  assert.match(mod({ item: { ...item, networkBlocked: true } }), /הכתיבה מהרשת הזו חסומה/);
});
test("the block form: three durations (no permanent), a mandatory reason, the Royal family only, hiding is not part of it", () => {
  const html = mod({}, { form: { kind: "block", duration: "", reason: "", error: "" } });
  for (const label of ["24 שעות", "3 ימים", "7 ימים"]) assert.ok(html.includes(label), label);
  assert.ok(!/>לצמיתות</.test(html), "no permanent choice");
  assert.match(html, /role="radiogroup"/); assert.match(html, /class="r29-check"/); assert.match(html, /r29-btn is-primary/); assert.match(html, /r29-btn is-quiet/);
  assert.match(html, /ההודעה עצמה לא תוסתר/);
  assert.match(html, /<button[^>]*r29-btn is-primary[^>]*disabled/, "the confirm button is disabled until a duration and a reason exist");
  assert.ok(!/(?:\d{1,3}\.){3}\d{1,3}|[0-9a-f]{64}/.test(html), "no address or reference is ever rendered");
});
test("the page: no top list, the actions ride on the message, search replies open in place, and everything staff-only is lazy", () => {
  const live = fs.readFileSync(new URL("../src/components/community2029/CommunityLive2029.jsx", import.meta.url), "utf8");
  assert.ok(!/GuestReviewPanel/.test(live), "the pending-messages list at the top is gone");
  assert.ok(live.includes('lazy(() => import("./CommunityNetBlocksPanel2029.jsx"))'));
  assert.ok(!/^import .*CommunityNetBlocksPanel2029/m.test(live), "never a static import");
  assert.ok(live.includes("canModerateGuests && user ? <Suspense"));
  assert.ok(live.includes("<GuestMessageModeration2029 item={moderationItem}"), "moderation is on the message");
  const hit = live.slice(live.indexOf("function SearchHit"), live.indexOf("export function PublicCommunityActivity2029"));
  assert.ok(!/navigate\(|<Link|useNavigate|fetchCommunityMessagePath/.test(hit), "a search hit never navigates to a separate thread view");
  assert.ok(hit.includes("captureCommunityScrollAnchor") && hit.includes("restoreCommunityScrollAnchor"), "the reader's scroll position is kept");
  assert.ok(live.includes('params.get("thread")') && live.includes("hasThreadRequest"), "direct thread links still open the full thread");
  const css = fs.readFileSync(new URL("../src/components/community2029/CommunityNetBlocksPanel2029.css", import.meta.url), "utf8");
  assert.ok(!/(box-shadow|background:\s*#|color:\s*#|font-size:\s*\d+px|linear-gradient)/.test(css), "layout only");
});
