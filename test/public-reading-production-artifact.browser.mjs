import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

// Local functional acceptance, not a performance sample, deployment, canonical
// data read, real token test, or recovery proof. All Supabase UI calls are
// synthetic Responses before network. Independent routes/DNS deny egress.
test("actual built 2029 source admits only its worker; synthetic signed service and same-scope Legacy rollback work", { timeout: 45000 }, async () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const dist = resolve(root, "public-reading-deploy/dist");
  const artifact = JSON.parse(await readFile(resolve(dist, "public-reading-artifact.json"), "utf8"));
  const template = await readFile(resolve(root, "public-reading-deploy/.generated/2029.html"), "utf8");
  const productionWorker = await readFile(resolve(dist, "sw.js"), "utf8");
  const legacyWorker = await readFile(resolve(root, "public/sw.js"), "utf8");
  let workerMode = "legacy", syntheticWrites = 0;
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      res.setHeader("Cache-Control", "no-store");
      if (url.pathname === "/sw.js") {
        res.setHeader("Content-Type", "application/javascript"); res.setHeader("Service-Worker-Allowed", "/");
        return res.end(workerMode === "legacy" ? legacyWorker : productionWorker);
      }
      if (url.pathname === "/api/contributor-self") {
        if (req.method === "POST") syntheticWrites++;
        res.setHeader("Content-Type", "application/json"); return res.end('{"synthetic":true}');
      }
      if (url.pathname === "/__legacy_fixture") {
        res.setHeader("Content-Type", "text/html");
        return res.end('<!doctype html><html><body>Local synthetic Legacy document<script>navigator.serviceWorker.register("/sw.js",{scope:"/",updateViaCache:"none"});</script></body></html>');
      }
      if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/fonts/")) {
        const file = resolve(dist, "." + url.pathname);
        if (!file.startsWith(dist + "/")) { res.statusCode = 400; return res.end(); }
        const types = { ".js": "application/javascript", ".css": "text/css", ".woff2": "font/woff2", ".ttf": "font/ttf" };
        res.setHeader("Content-Type", types[extname(file)] || "application/octet-stream");
        if (url.pathname.startsWith("/assets/")) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        return res.end(await readFile(file));
      }
      // Serve only the actual generated template, never a parallel UI. Unit
      // tests separately exercise the canonical status/metadata HTTP adapter.
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      if (url.pathname === "/unsubscribe") res.setHeader("Referrer-Policy", "no-referrer");
      // Diagnostic callback observes failures without changing admission or UI.
      return res.end(template.replace("loadEntry:entry=>import(entry)", "loadEntry:entry=>import(entry),onFailure:error=>window.__bootstrapFailure={name:error.name,message:error.message}"));
    } catch { res.statusCode = 404; res.end("fixture unavailable"); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-background-networking", "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost"] });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
    await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort("blockedbyclient"));
    await context.addInitScript(() => {
      const original = window.fetch.bind(window);
      window.__syntheticPublicCalls = [];
      window.fetch = async (input, options = {}) => {
        const request = input instanceof Request ? input : new Request(new URL(input, location.href), options);
        const url = new URL(request.url);
        if (url.origin === "https://linswmnnkjxvweumprav.supabase.co") {
          window.__syntheticPublicCalls.push({ method: request.method, path: url.pathname });
          const result = url.pathname === "/functions/v1/newsletter-unsubscribe" ? { ok: true, email: "synthetic@example.invalid" } : [];
          return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return original(input, options);
      };
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(origin + "/__legacy_fixture");
    await page.waitForFunction(() => navigator.serviceWorker.controller);
    assert.equal(await page.evaluate(async () => (await fetch("/api/contributor-self", { method: "POST", body: "{}" })).status), 200);
    assert.equal(syntheticWrites, 1);
    workerMode = "production";
    const e = "c3ludGhldGljQGV4YW1wbGUuaW52YWxpZA", t = "S".repeat(43);
    const service = await page.goto(origin + `/unsubscribe?e=${e}&t=${t}`);
    assert.equal(service.headers()["cache-control"], "no-store"); assert.equal(service.headers()["referrer-policy"], "no-referrer");
    try { await page.getByRole("heading", { name: "הוסרת מרשימת התפוצה" }).waitFor({ timeout: 20000 }); }
    catch (error) {
      const diagnostic = await page.evaluate(async () => ({ body: document.body.innerText.slice(0, 1200),
        controller: navigator.serviceWorker.controller?.scriptURL || null,
        active: (await navigator.serviceWorker.getRegistration())?.active?.state || null,
        bootstrapFailure: window.__bootstrapFailure || null,
        syntheticCalls: window.__syntheticPublicCalls }));
      console.error("Synthetic local startup failure", JSON.stringify({ ...diagnostic, errors })); throw error;
    }
    const policy = await page.evaluate(() => new Promise(resolve => {
      const channel = new MessageChannel(); channel.port1.onmessage = event => resolve(event.data);
      navigator.serviceWorker.controller.postMessage({ type: "public-reading-policy" }, [channel.port2]);
    }));
    assert.equal(policy.policy, artifact.policy); assert.equal(policy.sourceSha, artifact.sourceSha);
    assert.equal(await page.evaluate(async () => (await fetch("/api/contributor-self", { method: "POST", body: "{}" })).status), 403);
    assert.equal(syntheticWrites, 1);
    const calls = await page.evaluate(() => window.__syntheticPublicCalls);
    assert.ok(calls.some(call => call.path === "/functions/v1/newsletter-unsubscribe" && call.method === "GET"));
    assert.ok(!calls.some(call => /ai-analyze|research-run|credit_|newsletter-signup/.test(call.path)));
    await page.reload(); await page.getByRole("heading", { name: "הוסרת מרשימת התפוצה" }).waitFor();
    assert.ok(await page.evaluate(() => !!navigator.serviceWorker.controller));
    workerMode = "legacy";
    await page.evaluate(async () => {
      const previous = navigator.serviceWorker.controller;
      const changed = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(Error("rollback worker did not take control")), 10000);
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (navigator.serviceWorker.controller !== previous) { clearTimeout(timer); resolve(); }
        });
      });
      await (await navigator.serviceWorker.getRegistration()).update(); await changed;
    });
    assert.equal(await page.evaluate(async () => (await fetch("/api/contributor-self", { method: "POST", body: "{}" })).status), 200);
    assert.equal(syntheticWrites, 2, "byte-exact Legacy worker releases old guard only after actual replacement");
    assert.deepEqual(errors, []);
    await context.close();
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
});
