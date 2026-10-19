// Disposable static Preview output. It never deploys Edge functions or live migrations.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "preview-deploy/dist");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const REQUIRED_BRANCH = "gpt/perf-unified-wave4-preview-20261018";
const GIT_BOUND_VITE_INPUTS = Object.freeze([
  "public",
  "src",
  "2029.html",
  "index.html",
  "vite.config.js",
  "package.json",
  "package-lock.json",
  "preview-deploy/evidence",
  ":(top,glob).env*",
  ":(top,glob)*.config.*",
]);

function approvedPreviewHost(raw) {
  if (typeof raw !== "string" || raw !== raw.trim() || raw !== raw.toLowerCase()) return "";
  if (!/^sod1820-[a-z0-9](?:[a-z0-9-]*[a-z0-9])?-sod1820-s-projects\.vercel\.app$/.test(raw)) return "";
  if (raw === "sod1820-sod1820-s-projects.vercel.app") return "";
  try {
    const parsed = new URL(`https://${raw}`);
    return parsed.hostname === raw && parsed.host === raw && parsed.pathname === "/" ? raw : "";
  } catch {
    return "";
  }
}

function assertCleanBuildSource() {
  const raw = execFileSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], {
    cwd: root,
    encoding: "utf8",
  });
  const rejected = raw.split("\0").filter(Boolean).filter((entry) => {
    if (!entry.startsWith("?? ")) return true;
    const path = entry.slice(3);
    // Installed dependencies and ignored build caches are not source artifacts.
    // The exact root symlink is allowed because node_modules/ ignores directory
    // contents but Git reports a node_modules symlink as a nonignored entry.
    return path !== "node_modules" && !path.startsWith("node_modules/");
  });
  // `git status` intentionally omits ignored files, but Vite still consumes
  // ignored public assets and mode-specific .env files. Ask Git only about the
  // bounded input roots; this does not traverse node_modules or generated output.
  const ignoredInputs = execFileSync("git", [
    "ls-files", "--others", "--ignored", "--exclude-standard", "-z", "--",
    ...GIT_BOUND_VITE_INPUTS,
  ], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
  rejected.push(...ignoredInputs.map((path) => `!! ${path}`));
  if (rejected.length) throw new Error(`Preview source checkout must be clean: ${rejected.join(", ")}`);
}

// These gates consume exact external inputs. They run before Vite is imported and
// before the output directory can be created or emptied.
if (process.env.SOD_BUILD_TARGET !== "2029") throw new Error("Integrated Preview requires external SOD_BUILD_TARGET=2029");
if (process.env.VERCEL_ENV !== "preview" || process.env.VERCEL_GIT_COMMIT_REF !== REQUIRED_BRANCH) {
  throw new Error(`Integrated Preview requires VERCEL_ENV=preview and branch=${REQUIRED_BRANCH}`);
}
const commit = process.env.VERCEL_GIT_COMMIT_SHA || "";
if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error("Exact 40-hex preview source commit required");
const previewHost = approvedPreviewHost(process.env.VERCEL_URL || "");
if (!previewHost) throw new Error("Approved exact VERCEL_URL Preview host required");
const checkoutCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
if (checkoutCommit !== commit) throw new Error("VERCEL_GIT_COMMIT_SHA must match the checked-out source commit");
assertCleanBuildSource();

const [
  { build },
  { NUMBER_REVIEW_PREVIEW_BRANCH_2029, isNumberReviewPreviewBuild2029 },
  { renderPreviewReadonlyWorker, PREVIEW_GUARD_PROTOCOL },
  { renderPreviewReadonlyBootstrap, PREVIEW_GUARD_DEADLINE_MS },
  { createPreviewArtifactInventory },
] = await Promise.all([
  import("vite"),
  import("../src/lib/numberReviewPreview2029.js"),
  import("./preview-readonly-worker.mjs"),
  import("./preview-readonly-bootstrap.mjs"),
  import("./preview-artifact-inventory.mjs"),
]);
if (NUMBER_REVIEW_PREVIEW_BRANCH_2029 !== REQUIRED_BRANCH || !isNumberReviewPreviewBuild2029(process.env)) {
  throw new Error("Number review Preview build identity mismatch");
}

await build({
  root,
  define: {
    "import.meta.env.VITE_INTEGRATED_PREVIEW": '"true"',
    "import.meta.env.VITE_KINGDOM_PREVIEW": '"true"',
    __SOD_NUMBER_REVIEW_PREVIEW_HOST__: JSON.stringify(previewHost),
  },
  build: { outDir: output, emptyOutDir: true, manifest: true },
});

const rendered = renderPreviewReadonlyWorker({ commit, branch: REQUIRED_BRANCH, host: previewHost });
const workerBytes = Buffer.from(rendered.worker);
const workerContentSha256 = sha256(workerBytes);
const workerScript = `/preview-readonly-sw.js?content=${workerContentSha256}`;
const expectedWorkerIdentity = {
  ...rendered.previewIdentity,
  workerContentSha256,
};
await writeFile(resolve(output, "preview-readonly-sw.js"), workerBytes);
// A push opt-in must never replace the Preview guard with the production push worker.
await writeFile(resolve(output, "sw.js"), workerBytes);

const bootstrap = (entry) => renderPreviewReadonlyBootstrap({
  host: previewHost,
  workerScript,
  expectedIdentity: expectedWorkerIdentity,
  entry,
  guardDeadlineMs: PREVIEW_GUARD_DEADLINE_MS,
});

let html = await readFile(resolve(output, "2029.html"), "utf8");
const entry = html.match(/<script\b[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/);
if (!entry) throw new Error("missing2029Entry");
html = html.replace(entry[0], bootstrap(entry[1]));
await writeFile(resolve(output, "2029.html"), html);
await writeFile(resolve(output, "index.html"), html);

await mkdir(resolve(output, "preview-evidence"), { recursive: true });
for (const name of ["corrected-answer.png", "fresh-session-next-question.png", "failed-save-reopens-question.png", "fresh-session-completes-pending-save.png"]) {
  await copyFile(resolve(root, "preview-deploy/evidence", name), resolve(output, "preview-evidence", name));
}

const manifestBytes = await readFile(resolve(output, ".vite/manifest.json"));
const htmlBytes = await readFile(resolve(output, "2029.html"));
const indexBytes = await readFile(resolve(output, "index.html"));
const fallbackWorkerBytes = await readFile(resolve(output, "sw.js"));
const { receipt, inventory } = await createPreviewArtifactInventory(output, {
  commit,
  branch: REQUIRED_BRANCH,
  host: previewHost,
  buildTarget: "2029",
  vercelEnv: "preview",
  sourceClean: true,
  workerScript,
  workerContentSha256,
  guardProtocol: PREVIEW_GUARD_PROTOCOL,
  guardIdentitySha256: rendered.guardIdentitySha256,
  guardDeadlineMs: PREVIEW_GUARD_DEADLINE_MS,
  manifestSha256: sha256(manifestBytes),
  htmlSha256: sha256(htmlBytes),
  indexHtmlSha256: sha256(indexBytes),
  workerSha256: sha256(workerBytes),
  fallbackWorkerSha256: sha256(fallbackWorkerBytes),
  readOnly: true,
  numberReviewPreviewOpen: true,
  previewOverrides: ["lock_number"],
});
console.log(`Static integrated Preview built from clean ${receipt.commit}; ${inventory.artifacts.length} artifacts sealed; exact read-only controller attested before App2029.`);
