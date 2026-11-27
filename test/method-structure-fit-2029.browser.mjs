// A method display must never be clipped on a phone (ZURIEL 27.11.2026, after #1587): every letter, row value, operator and total of the structure views stays inside
// its card at 320, 360, 390 and 430px, for a short, a long and a multi-word expression, on the engine traces committed in the fixture (live engine answers,
// read-only). A display that wraps is fine; a display that is cut, scrolls sideways inside the card or hides rows below its own frame fails.
//   node --test test/method-structure-fit-2029.browser.mjs        (needs Playwright and Chromium: skips, never passes, without them)
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { projectGematriaTrace } from "../src/lib/research/gematriaTracePresentation.js";

const req = createRequire(import.meta.url);
let pw; for (const name of ["playwright", "@playwright/test"]) { try { pw = req(name); break; } catch { /* optional tooling */ } }
const executablePath = process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH || undefined;
const ROOT = path.resolve(".");
const { phrases, traces } = JSON.parse(fs.readFileSync(new URL("./fixtures/gematria-structure-fit-traces-20261127.json", import.meta.url), "utf8"));
const CSS = fs.readFileSync(path.join(ROOT, "src/components/gematria2029/spatialMethodStage2029.css"), "utf8");
const WIDTHS = [320, 360, 390, 430];

async function structure() {
  const out = await build({
    entryPoints: [path.join(ROOT, "src/components/gematria2029/MethodStructure2029.jsx")], bundle: true, write: false, format: "esm", platform: "node", jsx: "automatic",
    external: ["react", "react/jsx-runtime", "react-dom"], loader: { ".css": "empty" },
    plugins: [{ name: "glyph-stub", setup(b) { b.onLoad({ filter: /HebrewGlyph2029\.jsx$/ }, () => ({ contents: "export default function G({ text }) { return <span>{text}</span>; }", loader: "jsx" })); } }],
  });
  const file = path.join(ROOT, "node_modules/.cache-method-structure-fit-2029.mjs");
  fs.writeFileSync(file, out.outputFiles[0].text);
  try { return await import(`${file}?t=${Date.now()}`); } finally { fs.rmSync(file, { force: true }); }
}

test("no method display is clipped, scrolls inside its card or hides rows on a phone (all structure-drawn methods, 3 expressions, 4 widths)", { skip: !pw && "playwright is unavailable", timeout: 240000 }, async () => {
  const { default: Structure, drawsStructure } = await structure();
  const sections = [];
  for (const phrase of phrases) for (const [method, trace] of Object.entries(traces[phrase])) {
    const model = projectGematriaTrace(trace, { expression: phrase, methodKey: method });
    if (model.state !== "ready" || !drawsStructure(model)) continue;
    sections.push(`<section class="stage-host" data-case="${method} | ${phrase}"><section class="sod29-spatial-method-stage" dir="rtl">${renderToStaticMarkup(React.createElement(Structure, { model }))}</section></section>`);
  }
  assert.ok(sections.length >= 45, `the fixture covers the structure-drawn methods for every expression (${sections.length})`);
  // the page chrome around a stage on a phone measured on the real Number page: 56px on each side leaves the real inner width of a word card
  const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{--s29-ink:#eee;--s29-muted:#bbb;--s29-line:#555}body{margin:0;background:#111;color:#eee;font:16px/1.5 system-ui}.stage-host{padding-inline:56px;margin-block:10px}${CSS}</style></head><body>${sections.join("")}</body></html>`;
  const browser = await pw.chromium.launch({ executablePath, headless: true, args: ["--no-sandbox"] });
  try {
    for (const width of WIDTHS) {
      const page = await browser.newPage({ viewport: { width, height: 800 }, isMobile: true, deviceScaleFactor: 1 });
      await page.setContent(html); await page.waitForTimeout(300);
      const problems = await page.evaluate(() => {
        const found = [];
        const add = (what, host, detail) => found.push(`${what} · ${host?.closest("[data-case]")?.dataset.case || "?"} · ${detail}`);
        for (const word of document.querySelectorAll(".sod29-ms-word")) {
          const box = word.getBoundingClientRect();
          for (const el of word.querySelectorAll("*")) {
            const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
            if (r.left < box.left - 1 || r.right > box.right + 1) { add("a part is outside its card", el, `${el.className.toString().slice(0, 30)} ${Math.round(r.left)}..${Math.round(r.right)} not in ${Math.round(box.left)}..${Math.round(box.right)}`); break; }
          }
        }
        for (const sum of document.querySelectorAll(".sod29-ms-sum")) if (sum.scrollWidth > sum.clientWidth + 1 || getComputedStyle(sum).overflowX !== "visible") add("an equation is clipped or scrolls inside the card", sum, sum.textContent.trim().slice(0, 40));
        for (const stage of document.querySelectorAll(".sod29-spatial-method-stage")) if (stage.scrollHeight > stage.clientHeight + 1) add("rows are hidden below the frame", stage, `${stage.scrollHeight} > ${stage.clientHeight}`);
        for (const el of document.querySelectorAll(".sod29-ms-tile span, .sod29-ms-letter, .sod29-ms-card b, .sod29-ms-value, .sod29-ms-sum")) { const size = parseFloat(getComputedStyle(el).fontSize); if (size < 14) { add("text below 14px", el, `${size}px`); break; } }
        if (document.documentElement.scrollWidth > innerWidth + 1) found.push("the page scrolls sideways");
        return found;
      });
      assert.deepEqual(problems.slice(0, 6), [], `${width}px: ${problems.length} problem(s)`);
      await page.close();
    }
  } finally { await browser.close(); }
});
