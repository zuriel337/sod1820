// usage: node run.cjs <origin> <arm> <profile> <pages,comma> <reps> <out.jsonl>
const { chromium } = require("playwright"); const fs = require("fs");
const [origin, arm, profile, pagesArg, repsArg, out] = process.argv.slice(2);
const pages = pagesArg.split(","), reps = Number(repsArg);
const INIT = () => { window.__m = { lcp: 0, cls: 0, fcp: 0 };
  new PerformanceObserver(l => { for (const e of l.getEntries()) window.__m.lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value; }).observe({ type: "layout-shift", buffered: true });
  new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.name === "first-contentful-paint") window.__m.fcp = e.startTime; }).observe({ type: "paint", buffered: true }); };
(async () => {
  const b = await chromium.launch({ args: ["--ignore-certificate-errors"] });
  for (const page of pages) for (let r = 0; r < reps; r++) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true, serviceWorkers: "allow", isMobile: true, hasTouch: true });
    await ctx.route("**/*", route => { const u = new URL(route.request().url()); if (u.origin === origin) return route.continue();
      if (u.hostname.endsWith("supabase.co")) return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: "[]" });
      return route.abort("blockedbyclient"); });
    await ctx.addInitScript(INIT);
    const p = await ctx.newPage(); const errors = []; p.on("pageerror", e => errors.push(e.message));
    for (const mode of ["cold", "warm"]) {
      await fetch(origin + "/__reset").catch(() => {});
      const t0 = Date.now();
      if (mode === "cold") await p.goto(origin + page, { waitUntil: "commit", timeout: 60000 }); else await p.reload({ waitUntil: "commit", timeout: 60000 });
      let opened = false, failed = false;
      try { await p.waitForFunction(() => { const a = document.getElementById("root"); if (document.body && /העמוד לא נפתח/.test(document.body.innerText || "")) return "fail"; return !!a && a.children.length > 0 && !a.querySelector(".sod29-opening") ? "open" : false; }, null, { timeout: 45000, polling: 100 })
        .then(async h => { const v = await h.jsonValue(); opened = v === "open"; failed = v === "fail"; }); } catch {}
      const tOpen = Date.now() - t0;
      const m = await p.evaluate(() => ({ ...window.__m, ctrl: !!navigator.serviceWorker?.controller })).catch(() => ({}));
      const log = await (await fetch(origin + "/__log")).json().catch(() => []);
      const sw = log.find(x => x.path === "/sw.js"); const before = log.filter(x => x.done - t0 <= tOpen);
      const row = { arm, profile, page, rep: r, mode, opened, failed, openMs: opened ? tOpen : null, fcp: Math.round(m.fcp || 0), lcp: Math.round(m.lcp || 0), cls: Number((m.cls || 0).toFixed(4)),
        swDoneMs: sw ? sw.done - t0 : null, kbBeforeOpen: Math.round(before.reduce((a, x) => a + x.bytes, 0) / 1024), filesBeforeOpen: before.length, errors: errors.length };
      fs.appendFileSync(out, JSON.stringify(row) + "\n"); console.log(JSON.stringify(row));
      if (!opened) break;
    }
    await ctx.close();
  }
  await b.close();
})();
