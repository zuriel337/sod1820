// Exact-build shell check for the Home settled-box recovery change.
// Run only through scripts/ci-isolation/run.mjs. It serves an already-built 2029 dist on loopback,
// waits for the real System Frame CSS, then replaces only the main content with deterministic geometry.
// No product data is needed and every non-loopback request is blocked.
import { createRequire } from "node:module";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "../../../scripts/perf-execution-2029/serve.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../..");
const sharedRequire = createRequire(import.meta.url);
const { requireIsolation, browserArgs, installTransportBoundary } = sharedRequire("../../../scripts/ci-isolation/policy.cjs");
requireIsolation();
const toolRequire = createRequire(`${process.env.PLAYWRIGHT_DIR || "/opt/node-tools"}/node_modules/`);
const { chromium } = toolRequire("playwright");

const argv = process.argv.slice(2);
const args = Object.fromEntries(argv.reduce((all, value, index) => value.startsWith("--") ? [...all, [value.slice(2), argv[index + 1]]] : all, []));
if (!args.dist || !args.sha || !["baseline", "candidate"].includes(args.expect)) {
  console.error("usage: run-shell-matrix.mjs --dist <2029 build> --sha <40 hex> --expect baseline|candidate [--out result.json]");
  process.exit(2);
}
if (!/^[0-9a-f]{40}$/.test(args.sha)) throw new Error("--sha must be the exact 40-character source commit");
const dist = path.resolve(args.dist);
const executablePath = process.env.PERF_CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
if (!fs.existsSync(path.join(dist, "2029.html"))) throw new Error(`not a 2029 build: ${dist}`);
if (!fs.existsSync(executablePath)) throw new Error(`Chromium not found: ${executablePath}`);

function treeSignature(dir) {
  const files = [];
  const walk = (current) => { for (const entry of fs.readdirSync(current, { withFileTypes: true })) { const file = path.join(current, entry.name); if (entry.isDirectory()) walk(file); else if (entry.isFile()) files.push(file); } };
  walk(dir);
  const lines = files.map((file) => `${path.relative(dir, file).split(path.sep).join("/")}\t${crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")}`).sort();
  return { sha256: crypto.createHash("sha256").update(`${lines.join("\n")}\n`).digest("hex"), files: files.length, bytes: files.reduce((sum, file) => sum + fs.statSync(file).size, 0) };
}

const viewports = [[320, 640], [390, 844], [1440, 900], [1920, 1080]];
const themes = ["dark", "light", "parchment"];
const { srv, port } = await serve(dist);
const browser = await chromium.launch({ executablePath, args: browserArgs });
const rows = [];
try {
  for (const theme of themes) for (const [width, height] of viewports) {
    const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: "block", locale: "he-IL", timezoneId: "Asia/Jerusalem" });
    await context.addInitScript((value) => { try { localStorage.setItem("sod-theme", value); } catch { /* unavailable storage */ } }, theme);
    await installTransportBoundary(context);
    await context.route("**/*", (route) => route.request().url().startsWith(`http://127.0.0.1:${port}`) ? route.continue() : route.abort("blockedbyclient"));
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".sod29-root");
    const row = await page.evaluate(async () => {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const shell = document.querySelector(".sod29-root");
      const main = document.querySelector(".sod29-main");
      const sidebar = document.querySelector(".sod29-sidebar");
      // One failed Home area (900 px) above a deterministic reading marker. The mutation below is the
      // same 160 px give-back performed by useSettledBox2029 once the person/restorer are idle.
      main.innerHTML = `<header class="sod29-header" id="probe-header">header</header><main><section id="probe-box" style="min-height:900px"><p>failure + retry</p></section><div id="probe-marker" style="height:80px">reading marker</div><div style="height:5000px"></div></main>`;
      document.documentElement.style.overflowAnchor = "none";
      const overflow = {
        htmlX: getComputedStyle(document.documentElement).overflowX,
        bodyX: getComputedStyle(document.body).overflowX,
        rootX: getComputedStyle(document.getElementById("root")).overflowX,
        shellX: getComputedStyle(shell).overflowX,
        shellY: getComputedStyle(shell).overflowY,
      };
      const shifts = [];
      new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) shifts.push(entry.value); }).observe({ type: "layout-shift", buffered: false });
      window.scrollTo({ top: 1300, behavior: "instant" });
      await sleep(700);
      shifts.length = 0;
      const box = document.getElementById("probe-box");
      const marker = document.getElementById("probe-marker");
      const beforeMarker = marker.getBoundingClientRect().top;
      const beforeBottom = box.getBoundingClientRect().bottom;
      box.style.minHeight = "160px";
      const drift = box.getBoundingClientRect().bottom - beforeBottom;
      if (Math.abs(drift) >= 0.5) window.scrollBy({ top: drift, left: 0, behavior: "instant" });
      await sleep(700);
      const afterMarker = marker.getBoundingClientRect().top;
      const header = document.getElementById("probe-header");
      return {
        overflow,
        reservePx: Math.round(box.getBoundingClientRect().height),
        correctedDriftPx: Math.round(drift),
        readingMarkerDeltaPx: Math.round((afterMarker - beforeMarker) * 10) / 10,
        cls: Math.round(shifts.reduce((sum, value) => sum + value, 0) * 10000) / 10000,
        horizontalOverflowPx: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        headerTopPx: Math.round(header.getBoundingClientRect().top),
        sidebarTopPx: sidebar && getComputedStyle(sidebar).display !== "none" ? Math.round(sidebar.getBoundingClientRect().top) : null,
        themePreset: document.documentElement.getAttribute("data-theme-preset"),
        legacyTheme: document.documentElement.getAttribute("data-theme"),
      };
    });
    rows.push({ theme, width, height, ...row });
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => srv.close(resolve));
}

const candidateFailures = [];
if (args.expect === "candidate") for (const row of rows) {
  const cell = `${row.theme}/${row.width}`;
  if (JSON.stringify(row.overflow) !== JSON.stringify({ htmlX: "clip", bodyX: "visible", rootX: "visible", shellX: "visible", shellY: "visible" })) candidateFailures.push(`${cell}: nested overflow remains (${JSON.stringify(row.overflow)})`);
  if (row.reservePx !== 160) candidateFailures.push(`${cell}: reserve ${row.reservePx}px`);
  if (Math.abs(row.readingMarkerDeltaPx) > 1) candidateFailures.push(`${cell}: reading marker moved ${row.readingMarkerDeltaPx}px`);
  if (row.cls > 0.001) candidateFailures.push(`${cell}: CLS ${row.cls}`);
  if (row.horizontalOverflowPx > 1) candidateFailures.push(`${cell}: horizontal overflow ${row.horizontalOverflowPx}px`);
  if (Math.abs(row.headerTopPx) > 1) candidateFailures.push(`${cell}: sticky header top ${row.headerTopPx}px`);
  if (row.sidebarTopPx != null && (row.sidebarTopPx < 0 || row.sidebarTopPx > 100)) candidateFailures.push(`${cell}: sidebar outside frame (${row.sidebarTopPx}px)`);
  if (row.themePreset !== row.theme || row.legacyTheme !== (row.theme === "dark" ? "dark" : "light")) candidateFailures.push(`${cell}: theme projection ${row.themePreset}/${row.legacyTheme}`);
}
const result = {
  tool: "home-scroll-shell-matrix-v1",
  sourceSha: args.sha,
  expectation: args.expect,
  dist: treeSignature(dist),
  repositoryHead: sharedRequire("node:child_process").execFileSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).trim(),
  widths: rows,
  thresholds: { reservePx: 160, clsMax: 0.001, readingMarkerDeltaMaxPx: 1, horizontalOverflowMaxPx: 1 },
  pass: args.expect === "candidate" ? candidateFailures.length === 0 : null,
  failures: candidateFailures,
};
const json = `${JSON.stringify(result, null, 2)}\n`;
if (args.out) fs.writeFileSync(path.resolve(args.out), json);
process.stdout.write(json);
if (candidateFailures.length) process.exitCode = 1;
