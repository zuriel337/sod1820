// The identity of the article pipeline a proof was made with (OLD_POST_ARTICLE_FIRST; Codex review 16.11.2026): every source file the pipeline
// imports (as esbuild resolves postArticlePipeline2029.js) and the version of the server DOM. The proof script records it in
// public-reading-deploy/article-first-proven.json; the production build serves the first-document article only when the committed proof has
// the fingerprint of the code being built, and test/article-first-proof-fresh.test.mjs fails until the proof is rebuilt
// (`node scripts/build-article-first-proofs.mjs`). A stale proof never serves: the Posts keep the existing path.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

export const ARTICLE_PIPELINE_ENTRY = "src/lib/research/postArticlePipeline2029.js";
const ROOT = fileURLToPath(new URL("../..", import.meta.url));

export async function articleFirstFingerprint(root = ROOT) {
  const result = await build({ entryPoints: [join(root, ARTICLE_PIPELINE_ENTRY)], absWorkingDir: root, bundle: true, write: false, metafile: true,
    format: "esm", platform: "browser", logLevel: "silent", define: { "import.meta.env.VITE_REALITY_MAP_PREVIEW": '"false"' } });
  const inputs = Object.keys(result.metafile.inputs).map(file => file.replace(/\\/g, "/")).sort();
  const jsdom = JSON.parse(readFileSync(createRequire(join(root, "package.json")).resolve("jsdom/package.json"), "utf8")).version;
  const hash = createHash("sha256");
  for (const file of inputs) { hash.update(file); hash.update("\0"); hash.update(readFileSync(join(root, file))); hash.update("\0"); }
  hash.update(`jsdom@${jsdom}`);
  return { fingerprint: hash.digest("hex").slice(0, 20), inputs, jsdom };
}
