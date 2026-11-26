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
const { default: Panel } = await import(pathToFileURL(outfile).href);
fs.rmSync(outfile, { force: true });

const recent = [
  { id: "m1", createdAt: "2026-11-26T10:00:00Z", authorName: "אורח", body: "הודעה פוגענית", status: "approved", reviewed: false, canBlock: true, networkBlocked: false },
  { id: "m2", createdAt: "2026-11-20T10:00:00Z", authorName: "אורח", body: "הודעה ישנה", status: "hidden", reviewed: true, canBlock: false, networkBlocked: false },
];
const blocks = [{ id: "b1", state: "active", duration: "d3", createdAt: "2026-11-26T09:00:00Z", expiresAt: "2026-11-29T09:00:00Z", reason: "הטרדה חוזרת של אורח", by: "אמילי", linkedMessages: 2, permanentRequested: false, liftedAt: null, liftedBy: "", liftReason: "" }];
const render = seed => renderToStaticMarkup(React.createElement(Panel, { seed }));

test("the panel stays out of the page until the server confirms the feature", () => {
  assert.equal(render(null), "");
  assert.equal(render({ available: false }), "");
});
test("collapsed it is one toggle with the active count; opened it lists messages and blocks", () => {
  const closed = render({ available: true, open: false, recent, blocks });
  assert.match(closed, /1 חסימות פעילות/); assert.ok(!closed.includes("הודעה פוגענית"));
  const opened = render({ available: true, open: true, recent, blocks });
  assert.match(opened, /הודעה פוגענית/); assert.match(opened, /ביטול חסימה/); assert.match(opened, /חסימה לצמיתות מושבתת/);
});
test("hiding a message and blocking writing are two separate buttons; an old message can only be hidden", () => {
  const html = render({ available: true, open: true, recent, blocks: [] });
  assert.match(html, /הסתרת הודעה/); assert.match(html, /חסימת כתיבה/);
  const old = html.slice(html.indexOf('data-recent-guest="m2"'));
  assert.match(old, /אי אפשר לחסום לפיה/); assert.ok(!old.slice(0, old.indexOf("</li>")).includes("חסימת כתיבה"));
});
test("the block form: three durations (no permanent), a mandatory reason, the Royal family only, hiding is not part of it", () => {
  const html = render({ available: true, open: true, recent, blocks: [], form: { id: "m1", kind: "block", duration: "", reason: "", error: "" } });
  for (const label of ["24 שעות", "3 ימים", "7 ימים"]) assert.ok(html.includes(label), label);
  assert.ok(!/>לצמיתות</.test(html), "no permanent choice");
  assert.match(html, /role="radiogroup"/); assert.match(html, /class="r29-check"/); assert.match(html, /r29-btn is-primary/); assert.match(html, /r29-btn is-quiet/);
  assert.match(html, /ההודעה עצמה לא תוסתר/);
  assert.match(html, /<button[^>]*r29-btn is-primary[^>]*disabled/, "the confirm button is disabled until a duration and a reason exist");
  assert.ok(!/(?:\d{1,3}\.){3}\d{1,3}|[0-9a-f]{64}/.test(html), "no address or reference is ever rendered");
});
test("the panel code is lazy and moderator-only: no static import anywhere, and no local colour, size or shadow in its stylesheet rules", () => {
  const live = fs.readFileSync(new URL("../src/components/community2029/CommunityLive2029.jsx", import.meta.url), "utf8");
  assert.ok(live.includes('lazy(() => import("./CommunityNetBlocksPanel2029.jsx"))'));
  assert.ok(!/^import .*CommunityNetBlocksPanel2029/m.test(live), "never a static import");
  assert.ok(live.includes("canModerateGuests && user ? <Suspense"));
  const css = fs.readFileSync(new URL("../src/pages/community2029.css", import.meta.url), "utf8");
  const block = css.slice(css.indexOf("Staff network-block panel"));
  assert.ok(!/(box-shadow|background:\s*#|color:\s*#|font-size:\s*\d+px|linear-gradient)/.test(block), "layout only");
});
