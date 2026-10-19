// Hosted, static, read-only acceptance Preview for the Legacy-first Hybrid tree.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  approvedHybridPreviewHost,
  HOSTED_HYBRID_BRANCH as REQUIRED_BRANCH,
} from "./hybrid-preview-source-boundary.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "hybrid-preview-dist");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const GIT_BOUND_BUILD_INPUTS = Object.freeze([
  "public",
  "src",
  "api",
  "config",
  "scripts",
  "2029.html",
  "index.html",
  "vite.config.js",
  "vercel.json",
  "package.json",
  "package-lock.json",
  ":(top,glob).env*",
  ":(top,glob)*.config.*",
]);

function assertCleanBuildSource() {
  const raw = execFileSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], {
    cwd: root,
    encoding: "utf8",
  });
  let nodeModulesSymlinkOnly = false;
  const rejected = raw.split("\0").filter(Boolean).filter((entry) => {
    if (!entry.startsWith("?? ")) return true;
    const path = entry.slice(3);
    if (path === "node_modules" || path.startsWith("node_modules/")) {
      nodeModulesSymlinkOnly = true;
      return false;
    }
    return true;
  });
  const ignoredInputs = execFileSync("git", [
    "ls-files", "--others", "--ignored", "--exclude-standard", "-z", "--",
    ...GIT_BOUND_BUILD_INPUTS,
  ], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
  rejected.push(...ignoredInputs.map((path) => `!! ${path}`));
  if (rejected.length) throw new Error(`Hosted Hybrid Preview source checkout must be clean: ${rejected.join(", ")}`);
  return { nodeModulesSymlinkOnly };
}

// All external identity gates run before the local builder can remove or create output.
if (process.env.SOD_BUILD_TARGET !== "hybrid") {
  throw new Error("Hosted Hybrid Preview requires external SOD_BUILD_TARGET=hybrid");
}
if (process.env.VERCEL_ENV !== "preview" || process.env.VERCEL_GIT_COMMIT_REF !== REQUIRED_BRANCH) {
  throw new Error(`Hosted Hybrid Preview requires VERCEL_ENV=preview and branch=${REQUIRED_BRANCH}`);
}
const commit = process.env.VERCEL_GIT_COMMIT_SHA || "";
if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error("Exact 40-hex Hybrid Preview source commit required");
const previewHost = approvedHybridPreviewHost(process.env.VERCEL_URL || "");
if (!previewHost) throw new Error("Approved exact VERCEL_URL Hybrid Preview host required");
const checkoutCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
if (checkoutCommit !== commit) throw new Error("VERCEL_GIT_COMMIT_SHA must match the checked-out Hybrid source commit");
const sourceState = assertCleanBuildSource();
const isShallow = execFileSync("git", ["rev-parse", "--is-shallow-repository"], {
  cwd: root,
  encoding: "utf8",
}).trim() === "true";

execFileSync(process.execPath, ["scripts/build-hybrid-preview.mjs"], {
  cwd: root,
  env: {
    ...process.env,
    ...(sourceState.nodeModulesSymlinkOnly ? { SOD_HYBRID_ALLOW_DIRTY: "1" } : {}),
    ...(isShallow ? { SOD_HYBRID_HOSTED_SHALLOW: "1" } : {}),
  },
  stdio: "inherit",
});

const [
  { renderPreviewReadonlyWorker, PREVIEW_GUARD_PROTOCOL },
  { renderPreviewReadonlyBootstrap, PREVIEW_GUARD_DEADLINE_MS },
  { createPreviewArtifactInventory },
  { loadHybridRoutePolicy },
] = await Promise.all([
  import("./preview-readonly-worker.mjs"),
  import("./preview-readonly-bootstrap.mjs"),
  import("./preview-artifact-inventory.mjs"),
  import("./hybrid-preview-routing.mjs"),
]);

const policy = await loadHybridRoutePolicy();
const localReceiptPath = resolve(output, "hybrid-preview-build.json");
const localReceipt = JSON.parse(await readFile(localReceiptPath, "utf8"));
if (localReceipt.head !== commit || localReceipt.hostedPreviewReady !== false) {
  throw new Error("Local Hybrid artifact identity did not match the hosted source");
}

const rendered = renderPreviewReadonlyWorker({
  commit,
  branch: REQUIRED_BRANCH,
  host: previewHost,
  buildTarget: "hybrid",
});
const workerBytes = Buffer.from(rendered.worker);
const workerContentSha256 = sha256(workerBytes);
const workerScript = `/preview-readonly-sw.js?content=${workerContentSha256}`;
const expectedWorkerIdentity = Object.freeze({
  ...rendered.previewIdentity,
  workerContentSha256,
});
await writeFile(resolve(output, "preview-readonly-sw.js"), workerBytes);
await writeFile(resolve(output, "sw.js"), workerBytes);

const LOCAL_GUARD = /<script id="sod-hybrid-local-readonly">[\s\S]*?<\/script>/g;
const MODULE_ENTRY = /<script\b[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g;

async function sealHostedDocument(name, runtime) {
  const path = resolve(output, name);
  let html = await readFile(path, "utf8");
  const localGuards = [...html.matchAll(LOCAL_GUARD)];
  const entries = [...html.matchAll(MODULE_ENTRY)];
  if (localGuards.length !== 1) throw new Error(`${name} must contain exactly one local Hybrid guard`);
  if (entries.length !== 1) throw new Error(`${name} must contain exactly one module entry`);
  if (!html.includes(`name="sod-hybrid-runtime" content="${runtime}"`)) {
    throw new Error(`${name} runtime marker mismatch`);
  }
  if (!html.includes('name="robots" content="noindex,nofollow,noarchive"')) {
    throw new Error(`${name} must remain noindex`);
  }
  html = html.replace(LOCAL_GUARD, "");
  html = html.replace(entries[0][0], renderPreviewReadonlyBootstrap({
    host: previewHost,
    workerScript,
    expectedIdentity: expectedWorkerIdentity,
    entry: entries[0][1],
    guardDeadlineMs: PREVIEW_GUARD_DEADLINE_MS,
  }));
  if (html.includes("sod-hybrid-local-readonly")) throw new Error(`${name} retained the local-only guard`);
  await writeFile(path, html);
  return { path: name, sha256: sha256(html), bytes: Buffer.byteLength(html), runtime };
}

const [legacy, index, candidate2029] = await Promise.all([
  sealHostedDocument("legacy.html", "legacy"),
  sealHostedDocument("index.html", "2029"),
  sealHostedDocument("2029.html", "2029"),
]);
const manifestBytes = await readFile(resolve(output, ".vite/manifest.json"));
const policyBytes = await readFile(resolve(root, "config/hybrid-preview-routes.json"));
const fallbackWorkerBytes = await readFile(resolve(output, "sw.js"));
const hostedHybridReceipt = {
  ...localReceipt,
  schemaVersion: 2,
  status: policy.status,
  branch: REQUIRED_BRANCH,
  head: commit,
  sourceClean: true,
  host: previewHost,
  buildTarget: "hybrid",
  vercelEnv: "preview",
  routePolicySha256: sha256(policyBytes),
  documents: { legacy, index, candidate2029 },
  hostedPreviewReady: true,
  hostedPreviewBlocker: null,
  readOnly: true,
  workerScript,
  workerContentSha256,
  guardProtocol: PREVIEW_GUARD_PROTOCOL,
  guardIdentitySha256: rendered.guardIdentitySha256,
  guardDeadlineMs: PREVIEW_GUARD_DEADLINE_MS,
};
await writeFile(localReceiptPath, `${JSON.stringify(hostedHybridReceipt, null, 2)}\n`);
const hybridReceiptBytes = await readFile(localReceiptPath);

const { receipt, inventory } = await createPreviewArtifactInventory(output, {
  commit,
  branch: REQUIRED_BRANCH,
  host: previewHost,
  buildTarget: "hybrid",
  vercelEnv: "preview",
  sourceClean: true,
  workerScript,
  workerContentSha256,
  guardProtocol: PREVIEW_GUARD_PROTOCOL,
  guardIdentitySha256: rendered.guardIdentitySha256,
  guardDeadlineMs: PREVIEW_GUARD_DEADLINE_MS,
  manifestSha256: sha256(manifestBytes),
  htmlSha256: candidate2029.sha256,
  indexHtmlSha256: index.sha256,
  legacyHtmlSha256: legacy.sha256,
  workerSha256: sha256(workerBytes),
  fallbackWorkerSha256: sha256(fallbackWorkerBytes),
  hybridBuildReceiptSha256: sha256(hybridReceiptBytes),
  routePolicySha256: sha256(policyBytes),
  defaultRuntime: policy.defaultRuntime,
  candidate2029RouteCount: policy.candidate2029Routes.length,
  explicitLegacyRouteCount: policy.explicitLegacyRoutes.length,
  readOnly: true,
});
console.log(`Hosted Hybrid Preview built from clean ${receipt.commit}; ${inventory.artifacts.length} artifacts sealed; Legacy and 2029 wait for the exact read-only controller.`);
