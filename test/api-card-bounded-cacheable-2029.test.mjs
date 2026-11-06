// DEF-015 regression: /api/card (a) never waits indefinitely on a network read and never memoizes a failed asset load, and
// (b) is CDN-cacheable only for a successful GET on the canonical origin.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const card = fs.readFileSync(new URL("../api/card.js", import.meta.url), "utf8");

test("every fetch in the card renderer is time-bounded and failures are not memoized", () => {
  const fetches = [...card.matchAll(/fetch\(/g)].length;
  assert.equal(fetches, 3);
  assert.equal([...card.matchAll(/AbortSignal\.timeout\(/g)].length, 3, "each of the three reads has a timeout");
  assert.match(card, /_fontPromise = undefined; throw error;/, "a failed font load is retried by the next request");
  assert.match(card, /_logoPromise = undefined; return null;/, "a failed logo load is retried by the next request");
});

async function wrapper(status) {
  const { outputFiles } = await build({
    stdin: { contents: "export { default } from './public-reading-deploy/api/card.js';", resolveDir: root },
    platform: "node", format: "cjs", bundle: true, write: false, logLevel: "silent",
    plugins: [{ name: "stub", setup(b) {
      b.onResolve({ filter: /api[/\\]card\.js$/ }, (a) => a.importer.endsWith("public-reading-deploy/api/card.js") ? { path: "inner", namespace: "stub" } : undefined);
      b.onResolve({ filter: /authorization\.js$/ }, () => ({ path: "auth", namespace: "stub" }));
      b.onLoad({ filter: /.*/, namespace: "stub" }, (a) => a.path === "inner"
        ? { loader: "js", contents: `export default async()=>new Response('png',{status:${status},headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=31536000'}})` }
        : { loader: "js", contents: `export const CANONICAL_ORIGIN='https://sod1820.co.il';export const deploymentAuthorized=()=>true;export const publicReadingOriginAllowed=o=>['https://sod1820.co.il','https://preview.invalid'].includes(o);` });
    } }],
  });
  const module = { exports: {} };
  vm.runInNewContext(outputFiles[0].text, { module, exports: module.exports, require: createRequire(import.meta.url), Response, Headers, URL, Request }, { filename: "card-wrapper.cjs" });
  return module.exports.default;
}

test("canonical successful GET is cacheable; HEAD, errors and other origins are no-store", async () => {
  const ok = await wrapper(200);
  const cacheControl = async (req) => (await ok(req)).headers.get("Cache-Control");
  assert.equal(await cacheControl(new Request("https://sod1820.co.il/api/card?w=x")), "public, s-maxage=3600, stale-while-revalidate=86400");
  assert.equal(await cacheControl(new Request("https://sod1820.co.il/api/card?w=x", { method: "HEAD" })), "no-store");
  assert.equal(await cacheControl(new Request("https://preview.invalid/api/card?w=x")), "no-store");
  const failing = await wrapper(500);
  assert.equal((await failing(new Request("https://sod1820.co.il/api/card?w=x"))).headers.get("Cache-Control"), "no-store");
  const res = await ok(new Request("https://sod1820.co.il/api/card?w=x"));
  assert.equal(res.headers.get("X-Robots-Tag"), "noindex, nofollow, noarchive", "the card stays out of the index");
});
