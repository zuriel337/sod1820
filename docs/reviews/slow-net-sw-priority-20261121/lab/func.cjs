// Functional check with real data: open pages cold and controlled, then navigate in-app. usage: node func.cjs <origin> <out.json>
const { chromium } = require("playwright"); const fs = require("fs");
const [origin, out] = process.argv.slice(2);
const POST = "/post/manhigut-shel-emet-rut-kedem-20261026";
const pages = (process.argv[4] || "/,/number/358,/gematria," + POST).split(",");
const ready = p => p.waitForFunction(() => { const a = document.getElementById("root"); if (/העמוד לא נפתח/.test(document.body?.innerText || "")) return "fail";
  return a && a.children.length > 0 && !a.querySelector(".sod29-opening") ? "open" : false; }, null, { timeout: 45000, polling: 100 }).then(h => h.jsonValue()).catch(() => "timeout");
(async () => {
  const b = await chromium.launch({ args: ["--ignore-certificate-errors"], proxy: { server: process.env.HTTPS_PROXY, bypass: "localhost,127.0.0.1" } });
  const res = [];
  for (const [dev, vp, mobile] of [["phone", { width: 390, height: 844 }, true], ["desktop", { width: 1440, height: 900 }, false]]) {
    for (const page of pages) {
      const ctx = await b.newContext({ viewport: vp, ignoreHTTPSErrors: true, serviceWorkers: "allow", isMobile: mobile, hasTouch: mobile });
      await ctx.route("**/*", r => { const u = new URL(r.request().url()); return u.origin === origin || u.hostname.endsWith("supabase.co") ? r.continue() : r.abort("blockedbyclient"); });
      const p = await ctx.newPage(); const errors = [], hints = [];
      p.on("pageerror", e => errors.push(e.message)); p.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 160)); });
      const reqs = new Map(); p.on("request", q => { const u = new URL(q.url()); if (u.origin === origin && u.pathname.startsWith("/assets/")) reqs.set(u.pathname, (reqs.get(u.pathname) || 0) + 1); });
      const t0 = Date.now(); await p.goto(origin + page, { waitUntil: "commit" }); const cold = await ready(p); const coldMs = Date.now() - t0;
      await p.waitForTimeout(2500);
      const text = (await p.locator("#root").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 90);
      const dupCold = [...reqs].filter(([, n]) => n > 1).length; reqs.clear();
      const t1 = Date.now(); await p.reload({ waitUntil: "commit" }); const warm = await ready(p); const warmMs = Date.now() - t1;
      const ctrl = await p.evaluate(() => !!navigator.serviceWorker.controller);
      const dupWarm = [...reqs].filter(([, n]) => n > 1).length;
      // in-app navigation: click the first internal link to another page
      let nav = "skip";
      const link = await p.$('a[href^="/number/"], a[href="/calculator"], a[href^="/post/"]');
      if (link) { const href = await link.getAttribute("href"); await link.evaluate(a => a.click()); await p.waitForTimeout(2500);
        nav = { href, at: new URL(p.url()).pathname, ok: !(/העמוד לא נפתח/.test(await p.locator("body").innerText())) }; }
      res.push({ dev, page, cold, coldMs, warm, warmMs, ctrl, dupCold, dupWarm, nav, errors: errors.slice(0, 4), text });
      console.log(JSON.stringify(res.at(-1)));
      await ctx.close();
    }
  }
  fs.writeFileSync(out, JSON.stringify(res, null, 1)); await b.close();
})();
