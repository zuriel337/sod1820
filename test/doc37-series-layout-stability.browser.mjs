// Controlled geometry only. Real presentation component + CSS, synthetic reader,
// no server calls, SW, hosted-preview acceptance or latency claim.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { build } from "esbuild";
const { chromium } = createRequire(import.meta.url)("playwright");

const source = await readFile(new URL("../src/pages/Posts2029Page.jsx", import.meta.url), "utf8");
const components = source.slice(source.indexOf("// The actual messages"), source.indexOf("function PostIndexCard"));
const css = await readFile(new URL("../src/pages/posts2029.css", import.meta.url), "utf8");
const bundle = await build({ stdin: { contents: `
  import React, {useState,useEffect} from 'react';
  import {createRoot} from 'react-dom/client';
  import {CONTENT_SERIES_2029} from './src/lib/research/contentSeries2029Identity.js';
  const fetchContentSeriesCatalog2029 = options => new Promise((resolve,reject) => {
    window.finishSeries = () => resolve({series: CONTENT_SERIES_2029.map(spec => ({...spec,items:[{imageUrl:'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/%3E'}]}))});
    window.failSeries = () => reject(Error('controlled failure'));
  });
  const AUTHORS = {}, POST_BACKGROUND_ASSETS_2029 = {};
  const NavigationIcon2029 = () => React.createElement('span', {'aria-hidden':true});
  const Link = ({to,...props}) => React.createElement('a', {...props,href:to});
  ${components}
  function Probe() {
    const [state,setState] = useState('pending'); window.sourceState = setState;
    return <main className="sod29-posts-library">
      <SeriesEntrances2029 activeKey="messages-from-righteous" />
      <SeriesReadingNotice2029 pending={state==='pending'} failed={state==='failed'}
        pendingText="טוען את המקור הנוסף בסדרה…"
        failureText="המקור הנוסף בסדרה לא זמין כרגע."
        readyText="הסדרה מסודרת לפי מועד הפרסום במקור."
        retryLabel="ניסיון טעינה נוסף" onRetry={()=>setState('pending')} />
      <section id="posts-catalog" className="sod29-posts-library-stage"><h2>פוסטים שכבר נקראו</h2><p>תוכן בדיקה זמין גם כשהמקור הנוסף ממתין.</p></section>
    </main>;
  }
  createRoot(document.getElementById('root')).render(<Probe />);
`, loader: "jsx", resolveDir: process.cwd() }, bundle: true, platform: "browser", format: "iife", write: false });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
const report = { controlledFixture: true, hostedAcceptance: false, timingMeasurement: false, networkRequests: 0, cases: [] };
try {
  for (const width of [320, 390, 1440]) for (const fontSize of [16, 20]) for (const outcome of ["success", "failure"]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, locale: "he-IL" });
    await context.route("**/*", route => { report.networkRequests++; return route.abort(); });
    const page = await context.newPage();
    await page.setContent(`<html dir="rtl"><head><style>html{scrollbar-gutter:stable}body{margin:0;font-family:Arial,sans-serif;font-size:${fontSize}px;--s29-type-ui:${fontSize}px;--s29-type-lead:${fontSize * 1.3}px;--s29-type-title:${fontSize * 1.75}px;--s29-type-micro:${fontSize}px} ${css}</style></head><body><div id="root"></div></body></html>`);
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    await page.waitForFunction(() => typeof window.finishSeries === "function");
    const geometry = () => page.evaluate(() => ({
      catalogTop: document.querySelector("#posts-catalog").getBoundingClientRect().top,
      links: [...document.querySelectorAll(".sod29-posts-series-card")].map(el => ({ href: el.getAttribute("href"), height: el.getBoundingClientRect().height })),
      notices: [...document.querySelectorAll(".sod29-series-reading-notice")].map(el => el.getBoundingClientRect().height),
      scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth,
    }));
    const before = await geometry();
    assert.equal(before.links.length, 4);
    await page.evaluate(outcome => outcome === "success" ? window.finishSeries() : window.failSeries(), outcome);
    await page.waitForFunction(() => document.querySelector(".sod29-posts-series").getAttribute("aria-busy") === "false");
    for (const state of ["failed", "ready", "pending"]) {
      await page.evaluate(state => window.sourceState(state), state);
      await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
      const after = await geometry();
      assert.deepEqual(after, before, `${width}/${fontSize}/${outcome}/${state}: catalog and intrinsic navigation geometry must remain stable`);
      assert.ok(after.scroll <= after.client, "no horizontal overflow");
    }
    report.cases.push({ width, fontSize, outcome, stable: true, ...before });
    await context.close();
  }
  assert.equal(report.networkRequests, 0);
  if (process.env.OUT) await writeFile(process.env.OUT, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ passed: report.cases.length, networkRequests: report.networkRequests, controlledFixture: true }));
} finally { await browser.close(); }
