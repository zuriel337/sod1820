import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const req = createRequire(import.meta.url);
let pw, vite;
try { pw = req("playwright"); vite = await import(pathToFileURL(req.resolve("vite")).href); } catch { /* optional locally */ }
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium";

test("mounted canonical FORMS previews eight split/join shapes without starting a search", { skip: !pw || !vite || !existsSync(executablePath), timeout: 60000 }, async () => {
  const server = await vite.createServer({ root, configFile: false, server: { host: "127.0.0.1", port: 0 }, plugins: [{
    name: "forms-preview-fixture",
    configureServer(viteServer) {
      viteServer.middlewares.use((request, response, next) => {
        if (request.url !== "/forms-fixture") return next();
        response.setHeader("content-type", "text/html; charset=utf-8");
        response.end(`<!doctype html><html lang="he" dir="rtl"><iframe id="tool" src="/tzofen.html?embed=1&bridge=hidden&experience=2029"></iframe><script>
          window.__formsEvents=[];
          window.addEventListener("message",event=>{
            if(event.source!==document.getElementById("tool").contentWindow||event.origin!==location.origin)return;
            if(event.data?.source!=="tzofen")return;
            window.__formsEvents.push(event.data.type);
            if(event.data.type==="ready"&&!window.__formsSent){
              window.__formsSent=true;
              event.source.postMessage({source:"sod-host",type:"preview-forms-batch",requestId:7,expressions:["סוד החשמל","אמת"]},location.origin);
            }
            if(event.data.type==="forms-preview-result")window.__formsResult=event.data;
          });
        </script></html>`);
      });
    },
  }] });
  let browser;
  try {
    await server.listen();
    browser = await pw.chromium.launch({ headless: true, executablePath });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/forms-fixture`);
    await page.waitForFunction(() => window.__formsResult?.requestId === 7, null, { timeout: 20000 });
    const result = await page.evaluate(() => ({ rows: window.__formsResult.rows, events: window.__formsEvents }));
    assert.equal(result.rows.length, 8);
    assert.ok(result.rows.some(row => row.term === "סודהחשמל" && row.derivation === "A + B"));
    assert.ok(result.rows.some(row => row.term === "למשחהדוס"));
    assert.ok(result.rows.every(row => row.source === "סוד החשמל"));
    assert.equal(result.events.includes("search"), false);
  } finally {
    await browser?.close();
    await server.close();
  }
});
