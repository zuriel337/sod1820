// Local build evidence only. Use an exclusive build window, never alongside
// browser timings. These are the existing public-reading Preview defines from
// build-integrated-preview.mjs; no deployment/authorization/transport is changed.
import { build } from "vite";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";

const root = process.cwd();
const out = resolve(process.argv[2] || "/tmp/home-js-critical-path/local-graph");
if (out === root || !out.startsWith("/tmp/home-js-critical-path/")) throw Error("diagnostic_output_must_be_task_temporary_directory");
const flags = ["PUBLIC_FRAME_PREVIEW", "PUBLIC_FOUNDATION_PREVIEW", "INTEGRATED_PREVIEW", "KINGDOM_PREVIEW",
  "BOOK_PUBLICATION_REVIEW_PREVIEW", "UNLOCKED_2029_PREVIEW", "FUNCTIONAL_UNIFIED_PREVIEW"];
const define = Object.fromEntries(flags.map(key => [`import.meta.env.VITE_${key}`, JSON.stringify("false")]));
define["import.meta.env.VITE_PUBLIC_READING_RELEASE"] = JSON.stringify("public-reading-20261101");
define["import.meta.env.VITE_PUBLIC_LAUNCH_READ_ONLY_PREVIEW"] = JSON.stringify("true");
const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const diff = execFileSync("git", ["diff", "--", "src", "vite.config.js", "2029.html"]);
const data = { sha, workingTreeDiffSha256: createHash("sha256").update(diff).digest("hex"),
  configuration: "existing protected public-reading Preview compile profile", define, chunks: [], modules: [] };
process.env.SOD_BUILD_TARGET = "2029";
await mkdir(out, { recursive: true });
await build({ root, define,
  plugins: [{ name: "record-critical-path-evidence", writeBundle(_options, bundle) {
    for (const [fileName, chunk] of Object.entries(bundle)) {
      if (chunk.type !== "chunk") continue;
      data.chunks.push({ fileName, bytes: Buffer.byteLength(chunk.code), gzipBytes: gzipSync(chunk.code).length,
        sha256: createHash("sha256").update(chunk.code).digest("hex"),
        imports: chunk.imports, dynamicImports: chunk.dynamicImports,
        modules: Object.entries(chunk.modules).map(([id, info]) => ({ id: relative(root, id),
          originalLength: info.originalLength, renderedLength: info.renderedLength, renderedExports: info.renderedExports })) });
    }
    for (const id of this.getModuleIds()) {
      const info = this.getModuleInfo(id);
      data.modules.push({ id: relative(root, id), imports: info.importedIds.map(path => relative(root, path)),
        dynamicImports: info.dynamicallyImportedIds.map(path => relative(root, path)), isExternal: info.isExternal });
    }
  } }], build: { outDir: resolve(out, "dist"), emptyOutDir: true, manifest: true } });
const manifest = JSON.parse(await readFile(resolve(out, "dist/.vite/manifest.json"), "utf8"));
const closure = roots => {
  const seen = new Set();
  const visit = key => { if (seen.has(key) || !manifest[key]) return; seen.add(key); (manifest[key].imports || []).forEach(visit); };
  roots.forEach(visit);
  const files = [...seen].map(key => manifest[key].file).filter(file => file.endsWith(".js"));
  return { files, gzipBytes: data.chunks.filter(chunk => files.includes(chunk.fileName)).reduce((sum, chunk) => sum + chunk.gzipBytes, 0) };
};
data.entry = closure(["2029.html"]);
data.homeStatic = closure(["2029.html", "src/pages/Home2029Page.jsx"]);
data.homeWithPostPreparation = closure(["2029.html", "src/pages/Home2029Page.jsx", "src/pages/PublicPostAddress2029Page.jsx"]);
await writeFile(resolve(out, "graph.json"), JSON.stringify(data, null, 2) + "\n");
console.log(JSON.stringify({ sha, entryGzipBytes: data.entry.gzipBytes, homeStaticGzipBytes: data.homeStatic.gzipBytes,
  homeWithPostPreparationGzipBytes: data.homeWithPostPreparation.gzipBytes, out }));
