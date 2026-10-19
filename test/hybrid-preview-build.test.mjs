import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHybridPreviewServer } from "../scripts/serve-hybrid-preview.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "hybrid-preview-dist");
const built = existsSync(resolve(output, "hybrid-preview-build.json"));
const buildReceipt = built
  ? JSON.parse(await readFile(resolve(output, "hybrid-preview-build.json"), "utf8"))
  : null;
const localBuilt = built && buildReceipt.hostedPreviewReady === false;
let server;
after(() => server?.close());
const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  try { ({ chromium } = require("/opt/codex/cua_node/lib/node_modules/playwright")); } catch { /* optional */ }
}
const chromiumPath = existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : chromium?.executablePath?.();

test("dual build contains isolated Legacy and 2029 documents with read-only/noindex markers", { skip: !built }, async () => {
  const [legacy, index, next] = await Promise.all([
    readFile(resolve(output, "legacy.html"), "utf8"),
    readFile(resolve(output, "index.html"), "utf8"),
    readFile(resolve(output, "2029.html"), "utf8"),
  ]);
  assert.match(legacy, /name="sod-hybrid-runtime" content="legacy"/);
  assert.match(index, /name="sod-hybrid-runtime" content="2029"/);
  assert.match(next, /name="sod-hybrid-runtime" content="2029"/);
  assert.equal(index, next, "the physical root document must be the exact 2029 entry");
  for (const html of [legacy, index, next]) {
    assert.match(html, /noindex,nofollow,noarchive/);
    if (localBuilt) {
      assert.match(html, /sod-hybrid-local-readonly/);
      assert.doesNotMatch(html, /sod-preview-readonly-bootstrap/);
    } else {
      assert.match(html, /sod-preview-readonly-bootstrap/);
      assert.doesNotMatch(html, /sod-hybrid-local-readonly/);
    }
  }
  assert.equal(buildReceipt.defaultRuntime, "legacy");
  assert.equal(typeof buildReceipt.hostedPreviewReady, "boolean");
  assert.equal(buildReceipt.sources.legacySha, "0f3443a9a4dcb78e935d74f2a937c47dbf35d18c");
  assert.equal(buildReceipt.sources.candidateSha, "e994cb67120fa0f735ab3859aa5acba67e24adba");
});

test("local server routes candidate paths to 2029 and unknown paths to Legacy", { skip: !built }, async () => {
  ({ server } = await createHybridPreviewServer({ output }));
  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const [path, runtime, marker] of [
    ["/", "2029", 'content="2029"'],
    ["/world", "2029", 'content="2029"'],
    ["/post/example", "2029", 'content="2029"'],
    ["/code", "legacy", 'content="legacy"'],
    ["/not-yet-mapped", "legacy", 'content="legacy"'],
  ]) {
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get("x-sod-hybrid-runtime"), runtime, path);
    assert.match(await response.text(), new RegExp(marker), path);
  }
});

test("the early local guard blocks fetch, XHR and beacon writes before either runtime starts", {
  skip: !localBuilt || !chromium || !chromiumPath ? "local Hybrid artifact and Chromium are required" : false,
}, async () => {
  const local = await createHybridPreviewServer({ output });
  const localServer = local.server;
  await new Promise((resolveListen) => localServer.listen(0, "127.0.0.1", resolveListen));
  const browser = await chromium.launch({ executablePath: chromiumPath, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const context = await browser.newContext();
    await context.route(/^https:\/\//, (requestRoute) => requestRoute.abort("blockedbyclient"));
    const page = await context.newPage();
    for (const path of ["/not-yet-mapped", "/world"]) {
      await page.goto(`http://127.0.0.1:${localServer.address().port}${path}`, { waitUntil: "domcontentloaded" });
      const result = await page.evaluate(async () => {
        const response = await fetch("/must-not-reach-server", { method: "POST", body: "x" });
        let xhr = "sent";
        try {
          const request = new XMLHttpRequest();
          request.open("POST", "/must-not-reach-server");
          request.send("x");
        } catch (error) {
          xhr = error.name;
        }
        return {
          marker: document.documentElement.dataset.sodHybridGuard,
          fetchStatus: response.status,
          fetchBlocked: response.headers.get("x-hybrid-write-blocked"),
          xhr,
          beacon: navigator.sendBeacon("/must-not-reach-server", "x"),
        };
      });
      assert.deepEqual(result, {
        marker: "local-read-only",
        fetchStatus: 403,
        fetchBlocked: "true",
        xhr: "SecurityError",
        beacon: false,
      }, path);
    }
  } finally {
    await browser.close();
    await new Promise((resolveClose) => localServer.close(resolveClose));
  }
});
