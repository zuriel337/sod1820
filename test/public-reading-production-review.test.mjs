import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { build } from "esbuild";
import { protectedReviewBuildIdentity, protectedReviewRuntimeAuthorized, protectedReviewConfigMaterialization,
  REVIEW_PROJECT_ID, REVIEW_BRANCH, PRODUCTION_REVIEW_BRANCH } from "../public-reading-deploy/review-admission.js";

// Proposed tests only. Every platform value is a synthetic local fixture, never
// exported into a real Vercel build. No request may reach a live network source.
const root = fileURLToPath(new URL("..", import.meta.url));
const sha = "a".repeat(40);
const env = Object.freeze({ VERCEL: "1", VERCEL_ENV: "production", VERCEL_TARGET_ENV: "production",
  VERCEL_PROJECT_ID: REVIEW_PROJECT_ID, VERCEL_GIT_COMMIT_REF: PRODUCTION_REVIEW_BRANCH,
  VERCEL_GIT_COMMIT_SHA: sha, VERCEL_DEPLOYMENT_ID: "dpl_SyntheticProductionReview1",
  VERCEL_URL: "sod1820-syntheticproduction1-sod1820-s-projects.vercel.app" });
const input = { env, sourceSha: sha, requestedSourceSha: sha, sourceDirty: false, reviewTarget: "production" };
const receipt = protectedReviewBuildIdentity(input);

test("Production target needs explicit staged mode and remains non-cutover", () => {
  assert.equal(receipt.mode, "staged-production-review");
  assert.equal(receipt.target, "production");
  assert.equal(receipt.productionAuthorized, false);
  assert.equal(receipt.indexingAuthorized, false);
  assert.equal(receipt.cutoverAuthorized, false);
  assert.equal(receipt.domainAssignmentAuthorized, false);
  assert.ok(Object.isFrozen(receipt));
  assert.equal(protectedReviewRuntimeAuthorized(receipt, env), true);
  assert.equal(protectedReviewRuntimeAuthorized(null, env), false);
  const { reviewTarget, ...defaultMode } = input;
  assert.throws(() => protectedReviewBuildIdentity(defaultMode), /identity_rejected/);
});

test("staged admission rejects wrong SHA, dirty sources, copied deployment, superseded branches and missing platform identity", () => {
  const badEnvs = [null, {}, ...Object.keys(env).map(key => ({ ...env, [key]: undefined })),
    { ...env, VERCEL_ENV: "preview" }, { ...env, VERCEL_TARGET_ENV: "preview" },
    { ...env, VERCEL_GIT_COMMIT_REF: "gpt/2029-public-cutover-final-preparation-20261103" }, { ...env, VERCEL_GIT_COMMIT_REF: "gpt/2029-residual205-books-personal-20261103" },
    { ...env, VERCEL_PROJECT_ID: "prj_Other" }, { ...env, VERCEL_GIT_COMMIT_SHA: "b".repeat(40) },
    ...["sod1820.co.il", "www.sod1820.co.il", "sod1820.vercel.app", "evil.test",
      "sod1820-git-main-sod1820-s-projects.vercel.app", env.VERCEL_URL + ":443"].map(host => ({ ...env, VERCEL_URL: host }))];
  for (const bad of badEnvs) assert.throws(() => protectedReviewBuildIdentity({ ...input, env: bad }), /identity_rejected/);
  for (const patch of [{ requestedSourceSha: null }, { requestedSourceSha: "HEAD" },
    { requestedSourceSha: "b".repeat(40) }, { sourceDirty: true }, { reviewTarget: "staging" }])
    assert.throws(() => protectedReviewBuildIdentity({ ...input, ...patch }), /identity_rejected/);
  for (const key of ["sourceSha", "projectId", "branch", "deploymentId", "host", "mode", "target"])
    assert.equal(protectedReviewRuntimeAuthorized({ ...receipt, [key]: "mismatch" }, env), false, key);
  for (const key of ["productionAuthorized", "indexingAuthorized", "cutoverAuthorized", "domainAssignmentAuthorized"])
    for (const value of [true, undefined]) assert.equal(protectedReviewRuntimeAuthorized({ ...receipt, [key]: value }, env), false, key);
  for (const key of ["VERCEL_DEPLOYMENT_ID", "VERCEL_URL", "VERCEL_GIT_COMMIT_SHA"])
    assert.equal(protectedReviewRuntimeAuthorized(receipt, { ...env, [key]: "mismatch" }), false, key);
});

test("staged nested-config materialization permits no additional change", () => {
  const config = { framework: null, redirects: [{ source: "/old", destination: "/post/new", permanent: true }], headers: [] };
  const data = { reviewMode: true, reviewTarget: "production", env, trackedStatus: " M vercel.json\0",
    trackedDiff: `:100644 100644 ${"c".repeat(40)} ${"0".repeat(40)} M\0vercel.json\0`,
    committedConfig: JSON.stringify(config), workingConfig: JSON.stringify(config) };
  assert.equal(protectedReviewConfigMaterialization(data), true);
  for (const patch of [{ reviewMode: false }, { reviewTarget: "preview" },
    { trackedStatus: data.trackedStatus + " M src/App2029.jsx\0" },
    { trackedStatus: "M  vercel.json\0" }, { trackedDiff: data.trackedDiff.replace("100644 100644", "100644 120000") },
    { workingConfig: JSON.stringify({ ...config, env: { unlock: true } }) }, { workingConfig: "null" }])
    assert.equal(protectedReviewConfigMaterialization({ ...data, ...patch }), false);
});

test("compiler rejects combined/duplicate/missing-pin staged commands before build", () => {
  for (const args of [["--protected-production-review"], ["--protected-review", "--protected-production-review", "--review-source=" + sha],
    ["--protected-production-review", "--protected-production-review", "--review-source=" + sha],
    ["--protected-production-review", "--review-source=" + sha, "--review-source=" + sha]]) {
    const result = spawnSync(process.execPath, ["scripts/build-public-reading-production.mjs", ...args], {
      cwd: root, env: { PATH: process.env.PATH }, encoding: "utf8" });
    assert.notEqual(result.status, 0); assert.match(result.stderr, /invalid_public_reading_build_arguments/);
  }
});

test("staged adapters accept only their immutable host and stay noindex before public source reads", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "staged-production-review-test-"));
  try {
    const result = await build({ stdin: { contents: `
      export { deploymentAuthorized, protectedReviewOrigin, publicReadingOriginAllowed } from ${JSON.stringify(resolve(root, "public-reading-deploy/authorization.js"))};
      export { publicReadingDocumentHandler } from ${JSON.stringify(resolve(root, "public-reading-deploy/api/public-document.js"))};
      export { publicReadingRobotsHandler } from ${JSON.stringify(resolve(root, "public-reading-deploy/api/public-robots.js"))};
      export { publicReadingSitemapHandler } from ${JSON.stringify(resolve(root, "public-reading-deploy/api/public-sitemap.js"))};
    `, resolveDir: root, loader: "js" }, platform: "node", format: "esm", bundle: true, write: false,
      plugins: [{ name: "local-staged-receipt-only", setup(builder) {
        builder.onLoad({ filter: /protected-review-build\.js$/ }, args => {
          assert.equal(args.path, resolve(root, "public-reading-deploy/.generated/protected-review-build.js"));
          return { contents: `export const PROTECTED_REVIEW_BUILD = Object.freeze(${JSON.stringify(receipt)});`, loader: "js" };
        });
      } }] });
    await writeFile(resolve(directory, "adapters.mjs"), result.outputFiles[0].text);
    const script = String.raw`
      import assert from "node:assert/strict";
      import { deploymentAuthorized, protectedReviewOrigin, publicReadingOriginAllowed,
        publicReadingDocumentHandler, publicReadingRobotsHandler, publicReadingSitemapHandler } from "./adapters.mjs";
      globalThis.fetch = () => { throw Error("live network is forbidden"); };
      const origin="https://"+process.env.VERCEL_URL;
      const res=()=>({code:null,headers:new Map(),body:"",setHeader(k,v){this.headers.set(k.toLowerCase(),v);},status(c){this.code=c;return this;},send(b){this.body=String(b);return this;}});
      const req=(host=process.env.VERCEL_URL)=>({method:"GET",url:"/",headers:{host},query:{}});
      assert.equal(deploymentAuthorized(),true);assert.equal(protectedReviewOrigin(),origin);
      let reads=0;
      const document=publicReadingDocumentHandler({readDocument:async()=>'<html><head></head><body>same product</body></html>',metadataHandler:async(_r,o)=>{reads++;o.status(200).send('<head><title>Public</title><meta name="robots" content="index,follow"/></head>');}});
      for(const host of ["sod1820.co.il","www.sod1820.co.il","sod1820.vercel.app","evil.test"]){
        assert.equal(publicReadingOriginAllowed("https://"+host),false);
        const o=res();await document(req(host),o);assert.equal(o.code,421);
      }
      assert.equal(reads,0);
      const good=res();await document(req(),good);assert.equal(good.code,200);assert.match(good.headers.get("x-robots-tag"),/noindex/);assert.equal(reads,1);
      const robots=res();publicReadingRobotsHandler()(req(),robots);assert.equal(robots.code,200);assert.equal(robots.body,"User-agent: *\nDisallow: /\n");
      const xml=res();await publicReadingSitemapHandler({handler:async(_r,o)=>{o.setHeader("X-Robots-Tag","index,follow");return o.status(200).send("<urlset/>");}})(req(),xml);
      assert.equal(xml.code,200);assert.match(xml.headers.get("x-robots-tag"),/noindex/);
    `;
    await writeFile(resolve(directory, "check.mjs"), script);
    const child = spawnSync(process.execPath, [resolve(directory, "check.mjs")], {
      env: { PATH: process.env.PATH, ...env }, encoding: "utf8" });
    assert.equal(child.status, 0, child.stderr || child.stdout);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
