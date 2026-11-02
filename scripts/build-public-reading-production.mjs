import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, writeFile, copyFile, mkdir, readdir, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { buildPublicReadingWorker, publicReadingBootstrap, PUBLIC_READING_POLICY_ID } from "../public-reading-deploy/transport.js";
import { PUBLIC_READING_PROFILE_ID } from "../src/lib/publicReadingRelease2029.js";
import { PUBLIC_READING_DEPLOYMENT_AUTHORIZATION } from "../public-reading-deploy/deployment-policy.js";
import { protectedReviewBuildIdentity } from "../public-reading-deploy/review-admission.js";

// Default artifact stays dormant. A separate explicit deployment-scoped review
// command may admit only an exact clean Git source on the existing protected
// Vercel Preview project. Never clear/fake platform environment variables.
const args = process.argv.slice(2);
const reviewMode = args.includes("--protected-review");
const pins = args.filter(value => value.startsWith("--review-source="));
if (args.some(value => value !== "--protected-review" && !value.startsWith("--review-source="))
  || args.filter(value => value === "--protected-review").length > 1
  || pins.length > 1 || Boolean(pins.length) !== reviewMode)
  throw new Error("invalid_public_reading_build_arguments");
if ((process.env.VERCEL || process.env.VERCEL_ENV) && !reviewMode)
  throw new Error("public_reading_hosted_activation_requires_separate_guard_approval");
const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "public-reading-deploy/dist");
const templates = resolve(root, "public-reading-deploy/.generated");
for (const gate of ["test-legacy-production-lock.mjs", "test-one-tree-content-contract.mjs"])
  execFileSync(process.execPath, [resolve(root, "scripts", gate)], { cwd: root, stdio: "inherit" });
const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const dirty = execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], { cwd: root, encoding: "utf8" }).trim().length > 0;
const protectedReview = reviewMode ? protectedReviewBuildIdentity({ env: process.env,
  sourceSha: sha, sourceDirty: dirty, requestedSourceSha: pins[0].slice("--review-source=".length) }) : null;
// Generate for both modes, replacing stale review authority with null locally.
// Builder imports only the static policy; handlers import this generated module
// after the build. It must be included in each traced Node/Edge handler bundle.
await mkdir(templates, { recursive: true });
await writeFile(resolve(templates, "protected-review-build.js"),
  `export const PROTECTED_REVIEW_BUILD = Object.freeze(${JSON.stringify(protectedReview)});\n`);

process.env.SOD_BUILD_TARGET = "2029";
const { build } = await import("vite");
const previewFlags = ["VITE_PUBLIC_FRAME_PREVIEW", "VITE_PUBLIC_FOUNDATION_PREVIEW", "VITE_PUBLIC_LAUNCH_READ_ONLY_PREVIEW", "VITE_INTEGRATED_PREVIEW", "VITE_KINGDOM_PREVIEW", "VITE_BOOK_PUBLICATION_REVIEW_PREVIEW", "VITE_UNLOCKED_2029_PREVIEW", "VITE_FUNCTIONAL_UNIFIED_PREVIEW"];
await build({ root, define: {
  ...Object.fromEntries(previewFlags.map(key => ["import.meta.env." + key, JSON.stringify("false")])),
  "import.meta.env.VITE_PUBLIC_READING_RELEASE": JSON.stringify(PUBLIC_READING_PROFILE_ID),
  __SOD_PUBLIC_READING_PRODUCTION_ARTIFACT__: "true",
}, build: { outDir: output, emptyOutDir: true, manifest: true } });
let document = await readFile(resolve(output, "2029.html"), "utf8");
const entry = document.match(/<script\b[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/);
if (!entry) throw new Error("missing_2029_entry");
document = document.replace(entry[0], publicReadingBootstrap(entry[1], sha));
// The raw build document must only be reachable through the status/metadata
// adapter; / and /?p=... cannot be shadowed by an index.html filesystem match.
await mkdir(templates, { recursive: true });
await writeFile(resolve(templates, "2029.html"), document);
await rm(resolve(output, "2029.html"));
await rm(resolve(output, "index.html"), { force: true });
await rm(resolve(output, "robots.txt"), { force: true });
await rm(resolve(output, "sitemap.xml"), { force: true });
const worker = buildPublicReadingWorker(sha);
for (const name of ["sw.js", "public-reading-sw.js", "preview-readonly-sw.js"]) await writeFile(resolve(output, name), worker);
await mkdir(resolve(output, "rollback"), { recursive: true });
await copyFile(resolve(root, "public/sw.js"), resolve(output, "rollback/legacy-sw.js"));
const hash = data => createHash("sha256").update(data).digest("hex");
const files = [];
async function inventory(directory, prefix = "") {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix + entry.name;
    if (entry.isDirectory()) await inventory(resolve(directory, entry.name), relative + "/");
    else files.push({ path: relative, sha256: hash(await readFile(resolve(directory, entry.name))) });
  }
}
await inventory(output);
await writeFile(resolve(output, "public-reading-artifact.json"), JSON.stringify({
  schema: 1, sourceSha: sha, sourceDirty: dirty, buildTarget: "2029", releaseProfile: PUBLIC_READING_PROFILE_ID,
  policy: PUBLIC_READING_POLICY_ID, activation: PUBLIC_READING_DEPLOYMENT_AUTHORIZATION,
  protectedReview,
  deploymentConfigSha256: hash(await readFile(resolve(root, "public-reading-deploy/vercel.json"))),
  documentTemplateSha256: hash(document), documentTemplatePublic: false,
  deployed: false, productionReady: false, generalProductWrites: false,
  signedLegacyUnsubscribe: "existing-token-bound-mutation-only",
  modelCalls: false, siteFlagsChanged: false, previewBypassFlags: false,
  workerSha256: hash(worker), legacyRollbackWorkerSha256: hash(await readFile(resolve(root, "public/sw.js"))),
  files: files.sort((a, b) => a.path.localeCompare(b.path)),
}, null, 2) + "\n");
console.log(protectedReview ? "Protected Preview review artifact built. Production/cutover remain denied." : "Dormant public-reading artifact built from actual 2029 source. No deployment or cutover is authorized.");
