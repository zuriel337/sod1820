// Local test adapter only. A clean checkout deliberately has no generated
// deployment receipt; inject an explicitly dormant receipt, never activation.
// Tests pass the existing authorized/indexable seams on the actual factory.
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

let factory;
export async function loadPublicSitemapAdapter() {
  if (factory) return factory;
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const { outputFiles } = await build({
    stdin: { contents: "export { publicReadingSitemapHandler } from './public-reading-deploy/api/public-sitemap.js';", resolveDir: root },
    platform: "node", format: "cjs", bundle: true, write: false, logLevel: "silent",
    plugins: [{ name: "explicit-dormant-receipt-fixture", setup(b) {
      b.onResolve({ filter: /protected-review-build\.js$/ }, args => {
        if (args.importer.endsWith("/public-reading-deploy/authorization.js") && args.path === "./.generated/protected-review-build.js")
          return { path: "dormant-test-receipt", namespace: "test-receipt" };
      });
      // requestOrigin lives with the document adapter. Its unrelated metadata
      // dependency must never instantiate browser/Supabase clients in this test.
      b.onResolve({ filter: /api\/og\.js$/ }, args => args.importer.endsWith("/public-reading-deploy/api/public-document.js")
        ? { path: "unused-metadata-reader", namespace: "test-metadata" } : undefined);
      b.onResolve({ filter: /researchViewMode\.js$/ }, () => ({ path: "forbidden-browser-client", namespace: "test-reader" }));
      b.onLoad({ filter: /.*/, namespace: "test-receipt" }, () => ({ contents: "export const PROTECTED_REVIEW_BUILD = null;", loader: "js" }));
      b.onLoad({ filter: /.*/, namespace: "test-metadata" }, () => ({ contents: "export default function(){ throw Error('metadata reader is outside the sitemap test'); }", loader: "js" }));
      b.onLoad({ filter: /.*/, namespace: "test-reader" }, () => ({ contents: "export function getPublicResearchClient(){ throw Error('browser clients must not be used by the HTTP sitemap'); }", loader: "js" }));
    } }],
  });
  const module = { exports: {} };
  vm.runInNewContext(outputFiles[0].text, { module, exports: module.exports,
    require: createRequire(import.meta.url), process, URL, URLSearchParams, Headers, Request, Response,
    AbortController, AbortSignal, Buffer, TextEncoder, TextDecoder, setTimeout, clearTimeout,
    fetch: (...args) => globalThis.fetch(...args) }, { timeout: 2000 });
  factory = module.exports.publicReadingSitemapHandler;
  return factory;
}
