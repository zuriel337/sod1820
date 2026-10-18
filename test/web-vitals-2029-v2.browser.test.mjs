import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const harness = path.join(root, "test/fixtures/rum-v2-harness");
let chromium = null;
for (const base of [import.meta.url, `file://${process.env.PLAYWRIGHT_DIR || "/opt/node-tools"}/node_modules/`]) {
  try { chromium = createRequire(base)("playwright").chromium; break; } catch { /* optional outside evidence environment */ }
}
const executablePath = process.env.PERF_CHROME
  || ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome", "/usr/bin/chromium"].find(fs.existsSync)
  || chromium?.executablePath?.();
const skip = !chromium || !executablePath ? "Chromium is unavailable" : false;

async function bundle() {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "rum-v2-browser-"));
  const stub = path.join(harness, "stubs.js");
  await build({
    configFile: false,
    logLevel: "silent",
    root: harness,
    define: {
      __SOD_BUILD_SHA__: JSON.stringify("browser-build-sha"),
      __SOD_DEPLOY_ENV__: JSON.stringify("production"),
    },
    plugins: [{
      name: "rum-v2-browser-stubs",
      enforce: "pre",
      resolveId(source, importer) {
        if (source === "@collector") return path.join(root, "src/lib/webVitals2029.js");
        if (source === "@readiness") return path.join(root, "src/lib/usableContent2029.js");
        if (importer?.endsWith("/src/lib/webVitals2029.js")
          && ["./supabase.js", "./identity.js", "./botVerdict.js"].includes(source)) return stub;
        return null;
      },
    }],
    build: {
      outDir,
      emptyOutDir: true,
      minify: false,
      lib: { entry: path.join(harness, "main.js"), formats: ["iife"], name: "RumV2Harness", fileName: () => "harness.js" },
    },
  });
  return { outDir, source: fs.readFileSync(path.join(outDir, "harness.js"), "utf8") };
}

function serveBlank() {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end("<!doctype html><meta charset=utf-8><body></body>");
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

test("browser: early capture, Preview zero writes, deterministic final, and SPA usable-only envelope", { skip, timeout: 120000 }, async () => {
  const built = await bundle();
  const server = await serveBlank();
  const browser = await chromium.launch({
    executablePath,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1"],
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.addScriptTag({ content: built.source });
    await page.waitForTimeout(40); // the checkpoint exists in memory, before authorization

    assert.deepEqual(await page.evaluate(() => ({
      writes: window.__rumV2.writes.length,
      identity: window.__rumV2.identityReads,
      previewWrites: window.__rumV2.previewWrites.length,
      previewIdentity: window.__rumV2.previewIdentityReads,
      previewDisposed: window.__rumV2.preview.isDisposed(),
    })), { writes: 0, identity: 0, previewWrites: 0, previewIdentity: 0, previewDisposed: true });

    await page.evaluate(() => {
      window.__rumV2.finalizeHard();
      window.__rumV2.authorize();
    });
    await page.waitForFunction(() => window.__rumV2.writes.length === 1);
    const hard = await page.evaluate(() => window.__rumV2.writes[0].payload);
    assert.equal(hard.p_props.phase, "final", "the queued final replaces the earlier checkpoint");
    assert.equal(hard.p_props.measurement_scope, "hard_load_cwv_and_usable");
    assert.equal(hard.p_props.build_sha, "browser-build-sha");
    assert.equal(hard.p_props.deploy_env, "production");
    assert.equal(hard.p_props.device_class, "mobile");
    assert.equal(hard.p_props.route, "/");
    assert.match(hard.p_props.route_instance_id, /^route-browser-/);
    assert.match(hard.p_props.sample_id, /^rum-browser-/);
    assert.equal(typeof hard.p_props.usable_ms, "number");
    assert.equal(await page.evaluate(() => window.__rumV2.identityReads), 1);

    await page.evaluate(() => window.__rumV2.goWorld());
    await page.waitForFunction(() => window.__rumV2.writes.length === 2);
    const soft = await page.evaluate(() => window.__rumV2.writes[1].payload);
    assert.equal(soft.p_props.measurement_scope, "spa_navigation_usable_only");
    assert.equal(soft.p_props.route, "/world");
    assert.equal(soft.p_props.nav_kind, "spa_push");
    assert.equal(typeof soft.p_props.usable_ms, "number");
    assert.equal("lcp_ms" in soft.p_props, false);
    assert.equal("cls" in soft.p_props, false);

    const readiness = await page.evaluate(() => {
      const post = window.__rumV2.project("/post/long-source", `
        <main><article style="min-height:4000px" data-experience-capability="post-master-reading-stage" data-post-slug="long-source">
          <h1>כותרת מקור</h1><section class="sod29-reading-source"><p>טקסט המקור נטען במלואו.</p></section>
        </article></main>`);
      const numberLoading = window.__rumV2.project("/number/1820", `
        <main><div data-experience-surface="number" data-number-root="1820" data-number-depth="loading"><h1>1820</h1></div></main>`);
      const numberReady = window.__rumV2.project("/number/1820", `
        <main><div data-experience-surface="number" data-number-root="1820" data-number-depth="ready"><section class="sod29-number-hero"><h1>1820</h1></section></div></main>`);
      return { post, numberLoading, numberReady };
    });
    assert.equal(readiness.post.usable, true, "a long real source is usable even when its whole article cannot fit in the viewport");
    assert.equal(readiness.numberLoading.usable, false);
    assert.equal(readiness.numberReady.usable, true);
  } finally {
    await page.close();
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(built.outDir, { recursive: true, force: true });
  }
});
