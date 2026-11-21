import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, writeFile, copyFile, mkdir, readdir, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { buildPublicReadingWorker, publicReadingBootstrap, PUBLIC_READING_POLICY_ID } from "../public-reading-deploy/transport.js";
import { SUPABASE_ANON } from "../src/lib/supabase.js";
import { PUBLIC_READING_PROFILE_ID } from "../src/lib/publicReadingRelease2029.js";
import { PUBLIC_READING_DEPLOYMENT_AUTHORIZATION } from "../public-reading-deploy/deployment-policy.js";
import { protectedReviewBuildIdentity, publicCandidateBuildIdentity, protectedReviewConfigMaterialization, REALITY_MAP_PREVIEW_BRANCH, MAP_INTEGRATION_REVIEW_BRANCH } from "../public-reading-deploy/review-admission.js";
import { BRAND_APP_ICON_2029, BRAND_LOCKUP_NAV_2029, BRAND_SITE_ICONS_2029 } from "../src/lib/brandAssets2029.js";
import canonicalMiddleware, { config as canonicalMiddlewareConfig } from "../middleware.js";
import { articleFirstFingerprint } from "./lib/article-first-fingerprint.mjs";
import { homePreloadComment, hintLoaderScript2029 } from "../public-reading-deploy/route-preload.js";
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
const mapIntegration = previewReviewMode && protectedReview?.branch === MAP_INTEGRATION_REVIEW_BRANCH;
const realityMapPreview = previewReviewMode && reviewTarget === "preview" && Boolean(protectedReview)
  && (mapIntegration || process.env.VERCEL_GIT_COMMIT_REF === REALITY_MAP_PREVIEW_BRANCH);
await build({ root, define: {
  "import.meta.env.VITE_MAP_INTEGRATION_REVIEW": JSON.stringify(mapIntegration ? "true" : "false"),
  "import.meta.env.VITE_REALITY_MAP_PREVIEW": JSON.stringify(realityMapPreview ? "true" : "false"),
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
// Slow networks (21.11.2026, route-preload.js): the entry and the entry graph's module hints are applied by the hint loader, which waits for the
// worker's script only when no worker controls the page yet. Same URLs and order; the entry stays first and is still requested once.
const entryGraph = [...document.matchAll(/<link rel="modulepreload" crossorigin href="(\/assets\/[A-Za-z0-9._-]+\.js)">/g)].map(match => match[1]);
document = document.replace(/<link rel="modulepreload" crossorigin href="\/assets\/[A-Za-z0-9._-]+\.js">/g, "");
document = document.replace(entry[0], `${hintLoaderScript2029([entry[1], ...entryGraph.filter(href => href !== entry[1])])}${publicReadingBootstrap(entry[1], sha)}`);
// The Home's own code (public-reading-deploy/route-preload.js): its static import graph beyond the entry, listed in an inert comment that the
// document handler turns into preload hints for the Home address only.
const homePreload = homePreloadComment(JSON.parse(await readFile(resolve(output, ".vite/manifest.json"), "utf8")));
if (!homePreload) throw new Error("missing_home_preload_graph");
// After the bootstrap script, so the entry's own hint keeps its place directly before the bootstrap.
document = document.replace("</head>", `${homePreload}</head>`);
console.log(`home preload: ${(homePreload.match(/"\/assets\//g) || []).length} files; entry graph: ${entryGraph.length + 1} files (applied by the hint loader)`);
// Candidate PWA only: retain the existing installed-app identity/name/start URL.
// Refer to the exact complete 2029 brand asset; do not redraw/crop the mark or
// replace Legacy public/site.webmanifest, logo.png, root HTML or worker.
const previousManifest = JSON.parse(await readFile(resolve(root,"public/site.webmanifest"),"utf8"));
const appManifest = {...previousManifest,id:previousManifest.id||previousManifest.start_url,
  icons:[{src:BRAND_APP_ICON_2029.src,sizes:`${BRAND_APP_ICON_2029.width}x${BRAND_APP_ICON_2029.height}`,type:"image/png",purpose:"any"}]};
await writeFile(resolve(output,"site.webmanifest"),JSON.stringify(appManifest,null,2)+"\n");
document=document.replace('<link rel="icon" href="data:," />',`<link rel="icon" href="${BRAND_LOCKUP_NAV_2029.src}" type="image/webp" />`)
  .replace("</head>",`<link rel="icon" href="${BRAND_SITE_ICONS_2029.png48.src}" type="image/png" sizes="48x48" /><link rel="shortcut icon" href="/favicon.ico" /><link rel="manifest" href="/site.webmanifest" /><link rel="apple-touch-icon" href="${BRAND_APP_ICON_2029.src}" /></head>`);
// The first-document article of an imported Post (public-reading-deploy/api/article-first.js) is laid out by the page's own stylesheets: the
// entry's, the System Frame's and the Post page's, in the order the app loads them. They sit here in an inert template; only a document that
// carries the article turns them into stylesheets (the app's own loader then finds them already present and does not fetch them twice).
// Served only when the committed proof (and its vocabulary) was made for the article being built (scripts/lib/article-first-fingerprint.mjs): with
// a stale proof the template is left out and every Post keeps the existing path (the document handler answers "off").
// The template holds what an article-first document needs and no other document carries (the handler removes it from them):
//   - the first-paint stylesheet: the page's own stylesheets in their load order, without the rules that can never match the first document
//     (scripts/lib/article-first-critical-css.mjs); it takes the place of the head's render-blocking stylesheets;
//   - the full stylesheets (the entry's, the System Frame's and the Post page's), which the handler puts after the article: they no longer
//     hold the article's first paint, they still hold the application's start (scripts wait for parser-inserted stylesheets), and the app's own
//     loader finds them present and does not fetch them twice.
let articleFirstGuard = null;
const articleFirstProof = JSON.parse(await readFile(resolve(root, "public-reading-deploy/article-first-proven.json"), "utf8"));
const articleFirstVocabulary = JSON.parse(await readFile(resolve(root, "public-reading-deploy/article-first-vocabulary.json"), "utf8"));
const articleFirstIdentity = await articleFirstFingerprint(root);
if (articleFirstProof.fingerprint !== articleFirstIdentity.fingerprint || articleFirstVocabulary.fingerprint !== articleFirstIdentity.fingerprint) {
  console.warn(`article-first: OFF in this build: the proof is for ${articleFirstProof.fingerprint || "no fingerprint"}, the pipeline is ${articleFirstIdentity.fingerprint}; run node scripts/build-article-first-proofs.mjs`);
} else {
  const built = JSON.parse(await readFile(resolve(output, ".vite/manifest.json"), "utf8"));
  const closure = keys => { const seen = new Set(), queue = [...keys]; while (queue.length) { const key = queue.shift(); if (!key || seen.has(key) || !built[key]) continue; seen.add(key); queue.push(...(built[key].imports || [])); } return [...seen]; };
  const entryKey = Object.keys(built).find(key => built[key].isEntry);
  const shellKey = Object.keys(built).find(key => built[key].name === "Sod2029Shell" && !built[key].isEntry);
  const pageKeys = ["src/pages/PublicPostAddress2029Page.jsx", "src/pages/Post2029Page.jsx"].filter(key => built[key]);
  if (!entryKey || !shellKey || pageKeys.length !== 2) throw new Error("article_first_css_manifest");
  const css = [];
  for (const keys of [[entryKey], [shellKey], pageKeys]) for (const key of closure(keys)) for (const file of built[key].css || []) if (!css.includes(file)) css.push(file);
  if (!css.length) throw new Error("article_first_css_missing");
  // the vocabulary of the document itself (the head, the opening bar in #root) and of the article-first additions, with the proven articles'
  const { JSDOM } = await import("jsdom");
  const { vocabularyFromJson, emptyVocabulary, addToVocabulary, mergeVocabularies, articleFirstCriticalCss, guardToJson } = await import("./lib/article-first-critical-css.mjs");
  const own = addToVocabulary(emptyVocabulary(), new JSDOM(document).window.document.documentElement);
  own.attributes.set("data-theme-2029", new Set(["dark", "light", "parchment"])); own.attributes.set("data-ssr-standalone", new Set(["true"]));
  const vocabulary = mergeVocabularies(own, vocabularyFromJson(articleFirstVocabulary));
  const texts = await Promise.all(css.map(file => readFile(resolve(output, file), "utf8")));
  const critical = articleFirstCriticalCss(texts, vocabulary);
  if (!critical.css || critical.css.includes("</")) throw new Error("article_first_critical_css");
  console.log(`article-first: first-paint stylesheet ${critical.css.length} B (${critical.kept} rules kept, ${critical.dropped} left out) from ${css.length} stylesheets`);
  document = document.replace("</head>", `<template id="sod29-article-first-css"><style data-sod-article-first-critical>${critical.css}</style>${css.map(file => `<link rel="stylesheet" href="/${file}">`).join("")}</template></head>`);
  // A Post written after the proof (NEW_POST_ARTICLE_FIRST) is checked by the document handler against the names of the rules left out here.
  articleFirstGuard = { fingerprint: articleFirstIdentity.fingerprint, ...guardToJson(critical.guard) };
  console.log(`article-first: new-Post guard ${Object.entries(articleFirstGuard).filter(([key]) => key !== "fingerprint").map(([key, list]) => `${list.length} ${key}`).join(", ")}`);
}
// The raw build document must only be reachable through the status/metadata
// adapter; / and /?p=... cannot be shadowed by an index.html filesystem match.
await mkdir(templates, { recursive: true });
await writeFile(resolve(templates, "2029.html"), document);
// Only with the template: a build without a fresh proof has no guard, and the handler then gives no new Post its article.
if (articleFirstGuard) await writeFile(resolve(templates, "article-first-guard.json"), JSON.stringify(articleFirstGuard));
else await rm(resolve(templates, "article-first-guard.json"), { force: true });
await rm(resolve(output, "2029.html"));
await rm(resolve(output, "index.html"), { force: true });
await rm(resolve(output, "robots.txt"), { force: true });
await rm(resolve(output, "sitemap.xml"), { force: true });
const worker = buildPublicReadingWorker(sha, { anonKey: SUPABASE_ANON, gaId, integrationReview: mapIntegration });
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
    countryPolicySha256: hash(await readFile(resolve(root, "edge-country-policy.js"))),
    bigNumberEligibilitySha256: hash(await readFile(resolve(root, "edge-big-number-eligibility.js"))),
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
// The shell budget guard on the artifact that is really published (scripts/test-2029-shell-budget.mjs, profile "public-reading"): the entry,
// the System Frame and its CSS of THIS output may not grow past their recorded baseline, whatever VITE_* values the build carries. A failure
// fails the build, so a grown release artifact cannot be deployed.
const budget = spawnSync(process.execPath, [resolve(root, "scripts/test-2029-shell-budget.mjs"), "--profile", "public-reading", "--dist", output], { cwd: root, encoding: "utf8" });
process.stdout.write(budget.stdout || ""); process.stderr.write(budget.stderr || "");
if (budget.status !== 0) throw new Error("public_reading_shell_budget_failed");
console.log(publicCandidateMode ? "Public-capable candidate built for protected unrouted acceptance; no traffic switch is authorized." : productionReviewMode ? "Staged Production-target review artifact built. Canonical serving, indexing and cutover remain denied."
  : protectedReview ? "Protected Preview review artifact built. Production/cutover remain denied." : "Dormant public-reading artifact built from actual 2029 source. No deployment or cutover is authorized.");
