// Does the browser count a give-back of a failed area above the reading place, when the page is put back in the same task? A static replica of the real Home DOM (scripts removed) with
// the real CSS of a build, so that one thing can be changed at a time. Not product code and not evidence of speed: it isolates WHICH ANCESTOR makes the answer yes.
//   node replica.mjs <dump.json> <dist dir of the build the dump came from>
// dump.json = the `diag` field of a runner result made with DIAG_JS="$(cat dump-dom.diag.js)" (see README.md of the parent folder); it holds the text of the corpus and is not committed.
// Every case: scroll to where the person was, wait, shrink the first failed area that is entirely above the viewport from its whole box to 160 px, scroll by exactly the measured drift
// (scroll anchoring paused, as the restorer holds it), and print the layout-shift entries the browser reports.
import { createRequire } from "node:module";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
let chromium = null;
for (const base of [import.meta.url, `file://${process.env.PLAYWRIGHT_DIR || "/opt/node-tools"}/node_modules/`]) { try { chromium = createRequire(base)("playwright").chromium; break; } catch { /* next */ } }
const executablePath = process.env.PERF_CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const [dumpPath, dist] = process.argv.slice(2);
if (!dumpPath || !dist || !chromium) { console.error("usage: node replica.mjs <dump.json> <dist dir>  (playwright must be importable)"); process.exit(2); }
const dump = JSON.parse(fs.readFileSync(dumpPath, "utf8"));
const html = dump.html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/http:\/\/127\.0\.0\.1:\d+/g, "");
const mime = { ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg" };
const root = path.resolve(dist);
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  if (u === "/replica.html") { res.setHeader("content-type", "text/html"); res.end(html); return; }
  const f = path.join(root, u); if (f.startsWith(root) && fs.existsSync(f) && fs.statSync(f).isFile()) { res.setHeader("content-type", mime[path.extname(f)] || "application/octet-stream"); res.end(fs.readFileSync(f)); } else { res.statusCode = 404; res.end(); }
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// the give-back: the first failed area (a held box taller than 300 px) is shrunk to 160 px; the page is put back by the drift of its bottom edge
const give = `(() => { const n=[...document.querySelectorAll("[data-h29-hold]")].filter(x=>x.getBoundingClientRect().bottom < -8 && x.getBoundingClientRect().height>300)[0]; if(!n) return "no box"; const b0=n.getBoundingClientRect().bottom; n.style.setProperty("--h29-settled-h","160px"); const d=n.getBoundingClientRect().bottom-b0; if(Math.abs(d)>=0.5) scrollBy({top:d,left:0,behavior:"instant"}); return Math.round(d); })()`;
async function run(label, { css = "", js = "" } = {}) {
  const page = await browser.newPage({ viewport: { width: dump.vw, height: dump.vh } });
  await page.route("**/*", (r) => (r.request().url().startsWith(`http://127.0.0.1:${port}`) ? r.continue() : r.abort()));
  await page.goto(`http://127.0.0.1:${port}/replica.html`, { waitUntil: "load" });
  await page.addStyleTag({ content: `html{overflow-anchor:none}${css}` });
  if (js) await page.evaluate(js);
  await page.evaluate(() => { window.__cls = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__cls.push(e.value); }).observe({ type: "layout-shift", buffered: true }); });
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), dump.y);
  await sleep(700); await page.evaluate(() => { window.__cls.length = 0; });
  const drift = await page.evaluate(give);
  await sleep(700);
  const cls = (await page.evaluate(() => window.__cls)).reduce((a, b) => a + b, 0);
  console.log(`| ${label} | ${drift} px | ${cls.toFixed(4)} | ${cls > 0.001 ? "counted" : "nothing counted"} |`);
  await page.close();
}
console.log("| ancestors with `overflow: visible` forced | drift put back | CLS reported | |\n|---|---|---|---|");
await run("none (the shell as it is: html, body, #root = overflow-x: clip; .sod29-root = overflow-x: hidden)");
await run("every element", { css: "*{overflow:visible!important}" });
const sel = ["html", "body", "#root", ".sod29-root"];
for (let m = 1; m < 16; m++) { const set = sel.filter((_, i) => m & (1 << i)); await run(set.join(" + "), { css: `${set.join(",")}{overflow:visible!important}` }); }
console.log("\n| all four visible, plus one inner clip | drift | CLS | |\n|---|---|---|---|");
const base = "html,body,#root,.sod29-root{overflow:visible!important}";
for (const [k, v] of Object.entries({ "none (control)": "", ".sod29-main overflow-x: clip": ".sod29-main{overflow-x:clip}", ".sod29-content overflow-x: clip": ".sod29-content{overflow-x:clip}", ".h29 overflow-x: clip": ".h29{overflow-x:clip}" })) await run(k, { css: base + v });
await browser.close(); server.close();
