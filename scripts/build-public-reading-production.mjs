import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, writeFile, copyFile, mkdir, readdir, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { buildPublicReadingWorker, publicReadingBootstrap, PUBLIC_READING_POLICY_ID } from "../public-reading-deploy/transport.js";
import { SUPABASE_ANON } from "../src/lib/supabase.js";
import { PUBLIC_READING_PROFILE_ID } from "../src/lib/publicReadingRelease2029.js";
import { PUBLIC_READING_DEPLOYMENT_AUTHORIZATION } from "../public-reading-deploy/deployment-policy.js";
import { protectedReviewBuildIdentity, publicCandidateBuildIdentity, protectedReviewConfigMaterialization } from "../public-reading-deploy/review-admission.js";
import { BRAND_APP_ICON_2029, BRAND_LOCKUP_NAV_2029, BRAND_SITE_ICONS_2029 } from "../src/lib/brandAssets2029.js";
import canonicalMiddleware, { config as canonicalMiddlewareConfig } from "../middleware.js";
import publicMiddleware, { config as publicMiddlewareConfig } from "../public-reading-deploy/middleware.js";

// Default artifact stays dormant. A separate explicit deployment-scoped review
// command may admit only an exact Git source with no application edits on the
// existing protected Vercel project. A separate Production-target review flag
// admits only a staged review; domain assignment is an independent platform
// operation that must be disabled and verified by the release operator.
// Its verified config materialization
// remains recorded as dirty. Never clear/fake platform environment variables.
const args = process.argv.slice(2);
const previewReviewMode = args.includes("--protected-review");
const productionReviewMode = args.includes("--protected-production-review");
const publicCandidateMode = args.includes("--public-production-candidate");
const reviewMode = previewReviewMode || productionReviewMode || publicCandidateMode;
const reviewTarget = productionReviewMode || publicCandidateMode ? "production" : "preview";
const pins = args.filter(value => value.startsWith("--review-source="));
if (args.some(value => !["--protected-review", "--protected-production-review", "--public-production-candidate"].includes(value) && !value.startsWith("--review-source="))
  || args.filter(value => ["--protected-review", "--protected-production-review", "--public-production-candidate"].includes(value)).length > 1
  || pins.length > 1 || Boolean(pins.length) !== reviewMode)
  throw new Error("invalid_public_reading_build_arguments");
if ((process.env.VERCEL || process.env.VERCEL_ENV) && !reviewMode)
  throw new Error("public_reading_hosted_activation_requires_separate_guard_approval");
const root = fileURLToPath(new URL("../", import.meta.url));
if (publicMiddleware !== canonicalMiddleware
  || JSON.stringify(publicMiddlewareConfig) !== JSON.stringify(canonicalMiddlewareConfig))
  throw new Error("public_reading_middleware_must_bind_canonical_policy");
const output = resolve(root, "public-reading-deploy/dist");
const templates = resolve(root, "public-reading-deploy/.generated");
for (const gate of ["test-legacy-retired.mjs", "test-one-tree-content-contract.mjs"])
  execFileSync(process.execPath, [resolve(root, "scripts", gate)], { cwd: root, stdio: "inherit" });
const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const trackedStatus = execFileSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=no"], { cwd: root, encoding: "utf8" });
const dirty = trackedStatus.length > 0;
let platformConfigMaterialization = null;
if (reviewMode && trackedStatus === " M vercel.json\0") {
  // Read committed bytes, never a mutable worktree baseline; never reset/copy
  // the materialized file. Any other tracked/index change still fails closed.
  const committedConfig = execFileSync("git", ["show", `${sha}:public-reading-deploy/vercel.json`], { cwd: root, encoding: "utf8" });
  const workingConfig = await readFile(resolve(root, "vercel.json"), "utf8");
  const trackedDiff = execFileSync("git", ["diff", "--raw", "-z", "--no-abbrev", "--no-ext-diff", "--no-textconv", "--", "vercel.json"], { cwd: root, encoding: "utf8" });
  if (protectedReviewConfigMaterialization({ reviewMode, reviewTarget, env: process.env, trackedStatus, trackedDiff,
    committedConfig, workingConfig })) platformConfigMaterialization = { committedConfig, workingConfig, trackedDiff };
}
const protectedReview = reviewMode ? (publicCandidateMode ? publicCandidateBuildIdentity : protectedReviewBuildIdentity)({ env: process.env, reviewTarget,
  sourceSha: sha, sourceDirty: dirty && !platformConfigMaterialization,
  requestedSourceSha: pins[0].slice("--review-source=".length) }) : null;
// Reuse the existing verified-origin configuration. A Vercel-owned alias alone
// does not prove its callback was accepted in Supabase. The owner deferred that
// dashboard step, so an unconfirmed origin must remain disabled before the SDK.
let configuredOAuthOrigins;
try { configuredOAuthOrigins = JSON.parse(process.env.VITE_AUTH_VERIFIED_PREVIEW_ORIGINS || "[]"); }
catch { configuredOAuthOrigins = []; }
const oauthOrigins = protectedReview?.authHost && Array.isArray(configuredOAuthOrigins)
  && configuredOAuthOrigins.includes("https://" + protectedReview.authHost)
  ? ["https://" + protectedReview.authHost] : [];
// Generate for both modes, replacing stale review authority with null locally.
// Builder imports only the static policy; handlers import this generated module
// after the build. It must be included in each traced Node/Edge handler bundle.
await mkdir(templates, { recursive: true });
await writeFile(resolve(templates, "protected-review-build.js"),
  `export const PROTECTED_REVIEW_BUILD = Object.freeze(${JSON.stringify(protectedReview)});\n`);

process.env.SOD_BUILD_TARGET = "2029";
const { build, loadEnv } = await import("vite");
const gaId = process.env.VITE_GA_ID || loadEnv("production", root, "VITE_GA_ID").VITE_GA_ID || "";
// Public marketing identifiers (Meta Pixel, AdSense publisher/slots) are public client identifiers; they come from the build
// environment exactly like the GA id and are baked here so the artifact does not depend on implicit Vite env loading.
const marketingKeys = ["VITE_META_PIXEL_ID", "VITE_ADSENSE_CLIENT", "VITE_ADSENSE_SLOT_POST", "VITE_ADSENSE_SLOT_LIST"];
const marketingEnv = Object.fromEntries(marketingKeys.map(key => [key, process.env[key] || loadEnv("production", root, key)[key] || ""]));
const previewFlags = ["VITE_PUBLIC_FRAME_PREVIEW", "VITE_PUBLIC_FOUNDATION_PREVIEW", "VITE_PUBLIC_LAUNCH_READ_ONLY_PREVIEW", "VITE_INTEGRATED_PREVIEW", "VITE_KINGDOM_PREVIEW", "VITE_BOOK_PUBLICATION_REVIEW_PREVIEW", "VITE_UNLOCKED_2029_PREVIEW", "VITE_FUNCTIONAL_UNIFIED_PREVIEW"];
await build({ root, define: {
  ...Object.fromEntries(previewFlags.map(key => ["import.meta.env." + key, JSON.stringify("false")])),
  "import.meta.env.VITE_PUBLIC_READING_RELEASE": JSON.stringify(PUBLIC_READING_PROFILE_ID),
  "import.meta.env.VITE_AUTH_VERIFIED_PREVIEW_ORIGINS": JSON.stringify(JSON.stringify(oauthOrigins)),
  "import.meta.env.VITE_GA_ID": JSON.stringify(gaId),
  ...Object.fromEntries(marketingKeys.map(key => ["import.meta.env." + key, JSON.stringify(marketingEnv[key])])),
  __SOD_PUBLIC_READING_PRODUCTION_ARTIFACT__: "true",
}, build: { outDir: output, emptyOutDir: true, manifest: true } });
let document = await readFile(resolve(output, "2029.html"), "utf8");
const entry = document.match(/<script\b[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/);
if (!entry) throw new Error("missing_2029_entry");
// The bootstrap imports the entry only after the worker is admitted (register, activate, policy
// handshake: several round trips), so without a hint the entry download starts after that wait.
// A module preload of the same URL fetches it in parallel and stores it in the document's module
// map; the bootstrap's import() then consumes that map entry (still one request). The URL is the
// exact string the bootstrap imports, which publicReadingBootstrap restricts to /assets/<name>.js.
// transport.js (worker, handshake, policy id) is not involved: this is document markup only.
document = document.replace(entry[0], `<link rel="modulepreload" crossorigin href="${entry[1]}">${publicReadingBootstrap(entry[1], sha)}`);
// Candidate PWA only: retain the existing installed-app identity/name/start URL.
// Refer to the exact complete 2029 brand asset; do not redraw/crop the mark or
// replace Legacy public/site.webmanifest, logo.png, root HTML or worker.
const previousManifest = JSON.parse(await readFile(resolve(root,"public/site.webmanifest"),"utf8"));
const appManifest = {...previousManifest,id:previousManifest.id||previousManifest.start_url,
  icons:[{src:BRAND_APP_ICON_2029.src,sizes:`${BRAND_APP_ICON_2029.width}x${BRAND_APP_ICON_2029.height}`,type:"image/png",purpose:"any"}]};
await writeFile(resolve(output,"site.webmanifest"),JSON.stringify(appManifest,null,2)+"\n");
document=document.replace('<link rel="icon" href="data:," />',`<link rel="icon" href="${BRAND_LOCKUP_NAV_2029.src}" type="image/webp" />`)
  .replace("</head>",`<link rel="icon" href="${BRAND_SITE_ICONS_2029.png48.src}" type="image/png" sizes="48x48" /><link rel="shortcut icon" href="/favicon.ico" /><link rel="manifest" href="/site.webmanifest" /><link rel="apple-touch-icon" href="${BRAND_APP_ICON_2029.src}" /></head>`);
// The raw build document must only be reachable through the status/metadata
// adapter; / and /?p=... cannot be shadowed by an index.html filesystem match.
await mkdir(templates, { recursive: true });
await writeFile(resolve(templates, "2029.html"), document);
await rm(resolve(output, "2029.html"));
await rm(resolve(output, "index.html"), { force: true });
await rm(resolve(output, "robots.txt"), { force: true });
await rm(resolve(output, "sitemap.xml"), { force: true });
const worker = buildPublicReadingWorker(sha, { anonKey: SUPABASE_ANON, gaId });
for (const name of ["sw.js", "public-reading-sw.js", "preview-readonly-sw.js"]) await writeFile(resolve(output, name), worker);
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
  applicationSourceDirty: dirty && !platformConfigMaterialization,
  policy: PUBLIC_READING_POLICY_ID, activation: PUBLIC_READING_DEPLOYMENT_AUTHORIZATION,
  measurement: { gaConfigured: /^G-[A-Z0-9]{5,20}$/.test(gaId), publicCanonicalHostsOnly: true,
    rumSource: "events.performance.web_vital", anonymousRum: true, marketingEnabled: false },
  protectedReview, productionReviewOnly: productionReviewMode,
  cutoverAuthorized: false, domainAssignmentAuthorized: false,
  // sourceDirty above is the raw Git observation and stays true on Vercel.
  // This separate receipt proves only the known nested-config materialization.
  platformConfigMaterialization: platformConfigMaterialization ? {
    kind: "vercel-selected-nested-config-at-root", sourceSha: sha,
    committedPath: "public-reading-deploy/vercel.json", materializedPath: "vercel.json",
    trackedStatus: " M vercel.json", completeJsonEquivalent: true, arrayOrderPreserved: true,
    committedMode: "100644", materializedMode: "100644",
    gitRawDiff: platformConfigMaterialization.trackedDiff,
    committedConfigSha256: hash(platformConfigMaterialization.committedConfig),
    materializedConfigSha256: hash(platformConfigMaterialization.workingConfig),
  } : null,
  deploymentConfigSha256: hash(await readFile(resolve(root, "public-reading-deploy/vercel.json"))),
  // Source binding is an expectation, not proof of invocation. Hosted browser
  // and blocked-bot checks must independently accept the deployed Edge entry.
  middlewareEntry: {
    path: "public-reading-deploy/middleware.js", canonicalPath: "middleware.js",
    matcher: publicMiddlewareConfig.matcher,
    sha256: hash(await readFile(resolve(root, "public-reading-deploy/middleware.js"))),
    canonicalSha256: hash(await readFile(resolve(root, "middleware.js"))),
    coreSha256: hash(await readFile(resolve(root, "middleware-core.js"))),
    routeLegitimacySha256: hash(await readFile(resolve(root, "route-legitimacy.js"))),
    hostedInvocation: "requires-separate-positive-and-negative-acceptance",
  },
  documentTemplateSha256: hash(document), documentTemplatePublic: false,
  deployed: false, productionReady: false, generalProductWrites: false,
  publicCandidatePrepared: publicCandidateMode, publicTrafficTransferred: false,
  canonicalServingRequiresSeparateTrafficApproval: true,
  signedLegacyUnsubscribe: "existing-token-bound-mutation-only",
  adminActions: "explicit-server-verified-admin-only",
  accountEntry: "existing-site-auth-default", newSignup: true,
  socialLogin: oauthOrigins.length ? "exact-verified-branch-preview-callback" : "pending-exact-callback-confirmation",
  oauthCallback: protectedReview?.authHost ? "https://" + protectedReview.authHost + "/auth/callback" : null,
  siteUpdatesSignup: "pending-shared-purpose-contract",
  modelCalls: "explicit-admin-action-under-existing-server-policy", automaticModelCalls: false, siteFlagsChanged: false, previewBypassFlags: false,
  workerSha256: hash(worker),
  files: files.sort((a, b) => a.path.localeCompare(b.path)),
}, null, 2) + "\n");
console.log(publicCandidateMode ? "Public-capable candidate built for protected unrouted acceptance; no traffic switch is authorized." : productionReviewMode ? "Staged Production-target review artifact built. Canonical serving, indexing and cutover remain denied."
  : protectedReview ? "Protected Preview review artifact built. Production/cutover remain denied." : "Dormant public-reading artifact built from actual 2029 source. No deployment or cutover is authorized.");
