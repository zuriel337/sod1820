// Usage: from repo root, `npx vite -c audits/gematria-reveal-2029-v1/vite.config.mjs &` then `node audits/gematria-reveal-2029-v1/capture.mjs`
import { chromium } from "playwright";
const out = new URL(".", import.meta.url).pathname;
const views = [["mobile", 390, 844], ["desktop", 1440, 1000]];
const b = await chromium.launch({ executablePath: process.env.CHROME || "/opt/pw-browsers/chromium" });
for (const [name, width, height] of views) {
  const ctx = await b.newContext({ viewport: { width, height }, deviceScaleFactor: 2, reducedMotion: "no-preference" });
  const p = await ctx.newPage();
  await p.goto("http://localhost:5199/harness.html");
  await p.waitForFunction(() => document.querySelector(".sod29-reveal")?.dataset.revealState === "done");
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${out}${name}-${width}x${height}-final-reveal.png` });
  await p.getByRole("button", { name: "הצג חישוב" }).click();
  await p.waitForFunction(() => document.querySelectorAll(".sod29-reveal-steps li").length === 13, null, { timeout: 15000 });
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}${name}-${width}x${height}-expanded-calculation.png` });
  const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, n: document.querySelector(".sod29-reveal-number").textContent, rows: [...document.querySelectorAll(".sod29-reveal-steps li")].map(l => l.innerText.replace(/\n/g, "|")) }));
  console.log(name, JSON.stringify(m));
  await ctx.close();
}
await b.close();
