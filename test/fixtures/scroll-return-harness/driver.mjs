// Driver for the scroll-return harness (shared by test/scroll-return-2029.test.mjs and exploratory runs): bundles the harness against a restorer and a hook,
// serves it from a fake origin, performs  first visit -> read position -> open a Post -> Back  and reports what the person saw.
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import react from "@vitejs/plugin-react";

const here = fileURLToPath(new URL(".", import.meta.url));
// SCROLL_RETURN_RESTORER points the "current" side of the tests at another restorer file, e.g. the fixture of e3498434, to show the tests failing on the code before the fix.
export const CURRENT_RESTORER = process.env.SCROLL_RETURN_RESTORER || join(here, "../../../src/lib/scrollRestore2029.js");
export const PREVIOUS_RESTORER = join(here, "scrollRestore2029.e3498434.js");
export const CURRENT_HOOK = join(here, "../../../src/components/experience2029/useSettledBox2029.js");

export async function bundle({ restorer, hook = CURRENT_HOOK }) {
  const outDir = mkdtempSync(join(tmpdir(), "scroll-return-harness-"));
  await build({ configFile: false, logLevel: "silent", root: here, plugins: [react()], define: { "process.env.NODE_ENV": '"production"' },
    resolve: { alias: { "@restorer": restorer, "@hook": hook } },
    build: { outDir, emptyOutDir: true, minify: false, lib: { entry: join(here, "main.jsx"), formats: ["iife"], name: "ScrollReturnHarness", fileName: () => "harness.js" } } });
  return readFileSync(join(outDir, readdirSync(outDir).find((name) => name.endsWith(".js"))), "utf8");
}

const CSS = `body{margin:0;font:14px sans-serif}.home{display:flex;flex-direction:column;gap:20px;padding:0 12px}
.hero{display:block;height:360px}.hero.is-loading{height:auto;min-height:418px}.hero.is-unavailable{height:172px}.quiet{height:83px}
.sec{display:flex;flex-direction:column;gap:10px}.sec h2,.dg h2{margin:0;height:54px}.list{display:flex;flex-direction:column;gap:8px}
.card{display:block;height:160px}.ncard{display:block;height:150px}.row{display:block;height:56px}.is-loading{background:#ddd}.empty{margin:0;height:24px}
.story{height:188px}.gw{display:flex;flex-direction:column}.gw h3{margin:0;height:70px}.gwaction{display:block;height:44px}.dim{height:420px}.tail{height:900px}.tail2{height:600px}
.post{height:6000px}[data-h29-hold]{min-block-size:var(--h29-settled-h,0px)}`;
const html = (script) => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${CSS}</style></head><body><div id="root"></div><script>${script.replace(/<\/script/gi, "<\\/script")}</script></body></html>`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const READING = { block: "gw:B", above: 150 };   // the block the person reads in, and how far its top is above the viewport top

async function swipe(page, cdp, dist = 400) {
  let y = 640; await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 195, y }] });
  for (let i = 0; i < 12; i++) { y -= dist / 12; await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 195, y }] }); await sleep(16); }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

// cfg.visits: [firstVisit, returnVisit]; each { updates|notable|gateways|hero: { ms, outcome: ok|fail|empty, n } }.  opts: { userSwipeAt, resizeTo, horizon }
export async function returnScenario(browser, script, cfg, opts = {}) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const cdp = await page.context().newCDPSession(page);
  try {
    await page.route("http://harness.test/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: html(script) }));
    await page.addInitScript((value) => { window.__cfg = value; }, cfg);
    await page.goto("http://harness.test/");
    await page.evaluate(() => window.__api.mount());
    await page.waitForFunction(() => document.querySelectorAll(".card").length > 0 && document.querySelector('[data-block="gw:B"] .row'));
    await sleep(700);                                                                    // first visit settles; boxes remember their size
    await page.evaluate(([id, above]) => window.__api.scrollToBlock(id, -above), [READING.block, READING.above]);
    await sleep(300);
    const before = await page.evaluate(() => window.__api.state());
    await page.evaluate(() => window.__navigate("/post/x"));
    await sleep(500);
    await page.evaluate(() => { window.scrollTo({ top: 300, behavior: "instant" }); });
    await sleep(200);
    const started = await page.evaluate(() => window.__api.start());
    await page.goBack();
    if (opts.userSwipeAt != null) { await sleep(opts.userSwipeAt); await swipe(page, cdp); }
    if (opts.resizeTo) { await sleep(opts.resizeAt ?? 300); await page.setViewportSize({ width: opts.resizeTo, height: 844 }); }
    await sleep(opts.horizon ?? 3500);
    const [frames, shifts, touches, jumps, held, end] = await page.evaluate(() => [window.__api.frames(), window.__api.shifts(), window.__api.touches(), window.__api.jumps(), window.__api.held(), window.__api.state()]);
    return summarize({ frames, shifts, touches, jumps, held, end, before, started });
  } finally { await page.close(); }
}

function sessionWindow(entries) { let best = 0, cur = 0, start = null, last = null;
  for (const e of [...entries].sort((a, b) => a.t - b.t)) { if (start != null && (e.t - last >= 1000 || e.t - start >= 5000)) { cur = 0; start = null; } if (start == null) start = e.t; cur += e.v; last = e.t; best = Math.max(best, cur); }
  return +best.toFixed(4); }

function summarize({ frames, shifts, touches, jumps, held, end, before, started }) {
  const id = READING.block, want = -READING.above;
  const tops = frames.map((f) => ({ t: f.t - started, top: f.tops[id], y: f.y }));
  const landed = tops.findIndex((f) => f.top != null && Math.abs(f.top - want) <= 120);
  const after = landed >= 0 ? tops.slice(landed) : [];
  let maxFrameJump = 0; for (let i = 1; i < after.length; i++) if (after[i].top != null && after[i - 1].top != null) maxFrameJump = Math.max(maxFrameJump, Math.abs(after[i].top - after[i - 1].top));
  const finalTop = tops.at(-1)?.top ?? null;
  const touchAt = touches.length ? touches[0] - started : null;
  const jumpsAfterTouch = touchAt == null ? [] : jumps.filter((j) => j.t - started > touchAt);
  return { cls: sessionWindow(shifts.filter((s) => s.t >= started)), landedAtMs: landed >= 0 ? after[0].t : null, maxFrameJump, finalTop, wantTop: want, drift: finalTop == null ? null : Math.abs(finalTop - want),
    maxDriftAfterLanding: after.length ? Math.max(...after.map((f) => (f.top == null ? 0 : Math.abs(f.top - want)))) : null,
    shiftEntries: shifts.filter((s) => s.t >= started).map((s) => ({ t: s.t - started, v: +s.v.toFixed(4) })), touchAtMs: touchAt, jumpsAfterTouch: jumpsAfterTouch.length, programmaticJumps: jumps.map((j) => ({ at: j.t - started, to: j.to, from: j.from })), held, before: before.tops[id], finalY: end.y, overflowAnchor: end.overflowAnchor, tops };
}
