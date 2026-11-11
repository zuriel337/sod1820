import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import vm from "node:vm";
import { build } from "esbuild";
import { protectedReviewBuildIdentity, protectedReviewRuntimeAuthorized, protectedReviewConfigMaterialization,
  REVIEW_BRANCH, REVIEW_BRANCHES, ADDITIONAL_REVIEW_BRANCHES, PRODUCTION_REVIEW_BRANCH, REVIEW_PROJECT_ID, REVIEW_AUTH_HOST } from "../public-reading-deploy/review-admission.js";

// All platform identities and responses in this file are synthetic. Real Vercel
// identity is never forged for a build or deployment. No fetch may reach network.
const root = fileURLToPath(new URL("..", import.meta.url));
const sha = "a".repeat(40);
const fixtureEnv = Object.freeze({ VERCEL: "1", VERCEL_ENV: "preview", VERCEL_TARGET_ENV: "preview",
  VERCEL_PROJECT_ID: REVIEW_PROJECT_ID, VERCEL_GIT_COMMIT_REF: REVIEW_BRANCH,
  VERCEL_GIT_COMMIT_SHA: sha, VERCEL_DEPLOYMENT_ID: "dpl_SyntheticReview1",
  VERCEL_URL: "sod1820-synthetic1-sod1820-s-projects.vercel.app" });
const fixtureIdentity = protectedReviewBuildIdentity({ env: fixtureEnv,
  sourceSha: sha, sourceDirty: false, requestedSourceSha: sha });
const generatedIdentityPath = resolve(root, "public-reading-deploy/.generated/protected-review-build.js");

test("exact clean source emits a frozen Preview-only receipt and admits only that runtime", () => {
  assert.ok(Object.isFrozen(fixtureIdentity));
  assert.equal(fixtureIdentity.sourceSha, sha);
  assert.equal(fixtureIdentity.deploymentId, fixtureEnv.VERCEL_DEPLOYMENT_ID);
  assert.equal(fixtureIdentity.host, fixtureEnv.VERCEL_URL);
  assert.equal(fixtureIdentity.productionAuthorized, false);
  assert.equal(fixtureIdentity.indexingAuthorized, false);
  assert.equal(protectedReviewRuntimeAuthorized(fixtureIdentity, fixtureEnv), true);
});

test("build identity rejects missing or wrong platform fields, targets, source pins and dirty source", () => {
  const invalid = [undefined, null, {}, ...Object.keys(fixtureEnv).map(key => ({ ...fixtureEnv, [key]: undefined })),
    { ...fixtureEnv, VERCEL_ENV: "production" }, { ...fixtureEnv, VERCEL_TARGET_ENV: "production" },
    { ...fixtureEnv, VERCEL_TARGET_ENV: "staging" }, { ...fixtureEnv, VERCEL_TARGET_ENV: "development" },
    { ...fixtureEnv, VERCEL_PROJECT_ID: "prj_other" }, { ...fixtureEnv, VERCEL_GIT_COMMIT_REF: "main" },
    { ...fixtureEnv, VERCEL_GIT_COMMIT_SHA: "b".repeat(40) },
    ...["sod1820.co.il", "www.sod1820.co.il", "sod1820.vercel.app", "evil.vercel.app",
      "sod1820-git-main-sod1820-s-projects.vercel.app", fixtureEnv.VERCEL_URL + ":443",
      fixtureEnv.VERCEL_URL + "/path", fixtureEnv.VERCEL_URL + ".evil.test"].map(host => ({ ...fixtureEnv, VERCEL_URL: host }))];
  for (const env of invalid) assert.throws(() => protectedReviewBuildIdentity({ env, sourceSha: sha,
    sourceDirty: false, requestedSourceSha: sha }), /identity_rejected/);
  for (const extra of [{ sourceDirty: true }, { sourceSha: "HEAD" }, { requestedSourceSha: null },
    { requestedSourceSha: "b".repeat(40) }, { sourceSha: "b".repeat(40) }])
    assert.throws(() => protectedReviewBuildIdentity({ env: fixtureEnv, sourceSha: sha,
      sourceDirty: false, requestedSourceSha: sha, ...extra }), /identity_rejected/);
});

test("runtime receipt cannot be activated by environment alone, Production or copied deployment identity", () => {
  for (const identity of [null, undefined, {}, { ...fixtureIdentity, schema: 2 },
    { ...fixtureIdentity, mode: "production" }, { ...fixtureIdentity, productionAuthorized: true },
    { ...fixtureIdentity, indexingAuthorized: true }, { ...fixtureIdentity, target: "production" }])
    assert.equal(protectedReviewRuntimeAuthorized(identity, fixtureEnv), false);
  for (const key of ["sourceSha", "projectId", "deploymentId", "host", "branch"])
    assert.equal(protectedReviewRuntimeAuthorized({ ...fixtureIdentity, [key]: "mismatch" }, fixtureEnv), false, key);
  for (const env of [undefined, null, {}, { ...fixtureEnv, VERCEL_ENV: "production" },
    { ...fixtureEnv, VERCEL_DEPLOYMENT_ID: "dpl_Different" },
    { ...fixtureEnv, VERCEL_URL: "sod1820-other-sod1820-s-projects.vercel.app" }])
    assert.equal(protectedReviewRuntimeAuthorized(fixtureIdentity, env), false);
});

test("only Preview's sole unstaged root config may equal the complete committed nested config", () => {
  const config = { framework: null, redirects: [{ source: "/old", destination: "/post/new", permanent: true },
    { source: "/posts", destination: "/post", permanent: true }], headers: [{ source: "/(.*)",
    headers: [{ key: "Cache-Control", value: "no-store" }] }] };
  const input = { reviewMode: true, env: fixtureEnv, trackedStatus: " M vercel.json\0",
    trackedDiff: `:100644 100644 ${"c".repeat(40)} ${"0".repeat(40)} M\0vercel.json\0`,
    committedConfig: JSON.stringify(config, null, 2), workingConfig: JSON.stringify(config) };
  assert.equal(protectedReviewConfigMaterialization(input), true);
  const keyOrderOnly = { headers: config.headers, redirects: config.redirects, framework: null };
  assert.equal(protectedReviewConfigMaterialization({ ...input, workingConfig: JSON.stringify(keyOrderOnly) }), true);
  for (const configChange of [{ ...config, env: { unexpected: true } },
    { ...config, redirects: [...config.redirects].reverse() },
    { ...config, redirects: [{ ...config.redirects[0], destination: "/2029" }, config.redirects[1]] },
    { ...config, headers: [] }, { ...config, headers: [{ source: "/(.*)",
      headers: [{ key: "Cache-Control", value: "public" }] }] }])
    assert.equal(protectedReviewConfigMaterialization({ ...input, workingConfig: JSON.stringify(configChange) }), false);
  for (const trackedStatus of ["", "M  vercel.json\0", "MM vercel.json\0", " M vercel.json\0 M src/App2029.jsx\0",
    " M public-reading-deploy/vercel.json\0", " M vercel.json\0 M public-reading-deploy/vercel.json\0",
    " D vercel.json\0", " T vercel.json\0", "T  vercel.json\0", "R  vercel.json\0previous.json\0", " M vercel.json\n"])
    assert.equal(protectedReviewConfigMaterialization({ ...input, trackedStatus }), false, JSON.stringify(trackedStatus));
  for (const trackedDiff of [undefined, "", input.trackedDiff.replace("100644 100644", "100644 100755"),
    input.trackedDiff.replace("100644 100644", "100644 120000"),
    input.trackedDiff.replace("100644 100644", "100755 100644"),
    input.trackedDiff + input.trackedDiff.replace("vercel.json", "public-reading-deploy/vercel.json")])
    assert.equal(protectedReviewConfigMaterialization({ ...input, trackedDiff }), false);
  for (const invalid of ["null", "[]", "{broken", "0"])
    assert.equal(protectedReviewConfigMaterialization({ ...input, committedConfig: invalid, workingConfig: invalid }), false);
  for (const extra of [{ reviewMode: false }, { env: undefined }, { env: {} },
    { env: { ...fixtureEnv, VERCEL_ENV: "production" } },
    { env: { ...fixtureEnv, VERCEL_TARGET_ENV: "production" } },
    { env: { ...fixtureEnv, VERCEL_PROJECT_ID: "prj_other" } }])
    assert.equal(protectedReviewConfigMaterialization({ ...input, ...extra }), false);
  // Generic dirty input remains rejected; equality never skips source-pin or
  // platform checks. Only the compiler derives the narrow materialization proof.
  assert.throws(() => protectedReviewBuildIdentity({ env: fixtureEnv, sourceSha: sha,
    sourceDirty: true, requestedSourceSha: sha }), /identity_rejected/);
  for (const extra of [{ requestedSourceSha: "b".repeat(40) },
    { env: { ...fixtureEnv, VERCEL_ENV: "production" } }])
    assert.throws(() => protectedReviewBuildIdentity({ env: fixtureEnv, sourceSha: sha,
      sourceDirty: false, requestedSourceSha: sha, ...extra }), /identity_rejected/);
});

test("compiler rejects an absent, duplicate or malformed review mode/pin before compiling", () => {
  for (const args of [["--protected-review"], ["--review-source=" + sha],
    ["--protected-review", "--protected-review", "--review-source=" + sha],
    ["--protected-review", "--review-source=" + sha, "--review-source=" + sha], ["--unknown"]]) {
    const result = spawnSync(process.execPath, ["scripts/build-public-reading-production.mjs", ...args], {
      cwd: root, env: { PATH: process.env.PATH }, encoding: "utf8" });
    assert.notEqual(result.status, 0); assert.match(result.stderr, /invalid_public_reading_build_arguments/);
  }
});

function fixturePlugin(identity = fixtureIdentity) {
  return { name: "isolated-review-identity", setup(builder) {
    builder.onLoad({ filter: /protected-review-build\.js$/ }, args => {
      assert.equal(args.path, generatedIdentityPath);
      return { contents: `export const PROTECTED_REVIEW_BUILD = Object.freeze(${JSON.stringify(identity)});`, loader: "js" };
    });
    // Test the unchanged Edge adapter contract without fetching fonts or rendering
    // an image. The real renderer is covered by its own existing implementation.
    builder.onLoad({ filter: /[/\\]api[/\\]card\.js$/ }, args => args.path === resolve(root, "api/card.js")
      ? { contents: 'export default function () { globalThis.cardCalls++; return new Response("synthetic card", { headers: { "Content-Type": "image/png" } }); }', loader: "js" }
      : undefined);
  } };
}

test("generated receipt is statically traced into Node and Edge-compatible authorization; missing process fails closed", async () => {
  const actual = await build({ entryPoints: [resolve(root, "public-reading-deploy/authorization.js")],
    platform: "browser", format: "iife", globalName: "admission", bundle: true, write: false, metafile: true });
  assert.ok(Object.keys(actual.metafile.inputs).some(path => path.endsWith(".generated/protected-review-build.js")));
  const production = { process: { env: { ...fixtureEnv, VERCEL_ENV: "production" } } };
  vm.runInNewContext(actual.outputFiles[0].text + ';globalThis.result=admission.deploymentAuthorized();', production);
  assert.equal(production.result, false, "actual dormant build remains closed even with platform-shaped values");
  const review = await build({ entryPoints: [resolve(root, "public-reading-deploy/authorization.js")],
    platform: "browser", format: "iife", globalName: "admission", bundle: true, write: false,
    metafile: true, plugins: [fixturePlugin()] });
  for (const [env, expected] of [[fixtureEnv, true], [{ ...fixtureEnv, VERCEL_ENV: "production" }, false], [null, false]]) {
    const context = env ? { process: { env } } : {};
    vm.runInNewContext(review.outputFiles[0].text + ';globalThis.result=admission.deploymentAuthorized();', context);
    assert.equal(context.result, expected);
  }
  const edge = await build({ entryPoints: [resolve(root, "public-reading-deploy/api/card.js")],
    platform: "browser", format: "esm", bundle: true, write: false, metafile: true,
    plugins: [fixturePlugin()] });
  assert.ok(Object.keys(edge.metafile.inputs).some(path => path.endsWith(".generated/protected-review-build.js")));
  assert.ok(!Object.keys(edge.metafile.inputs).some(path => /node:(fs|path|crypto)/.test(path)));
  assert.match(edge.outputFiles[0].text, /SyntheticReview1/);
});

test("actual hosted adapters preserve old URLs/canonical metadata while review stays noindex and rejects spoofing", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "public-review-adapters-"));
  try {
    const result = await build({ stdin: { contents: `
      export { publicReadingDocumentHandler } from ${JSON.stringify(resolve(root, "public-reading-deploy/api/public-document.js"))};
      export { publicReadingSitemapHandler } from ${JSON.stringify(resolve(root, "public-reading-deploy/api/public-sitemap.js"))};
      export { publicReadingRobotsHandler } from ${JSON.stringify(resolve(root, "public-reading-deploy/api/public-robots.js"))};
      export { publicReadingReadOnlyApi } from ${JSON.stringify(resolve(root, "public-reading-deploy/read-only-api.js"))};
      export { default as card } from ${JSON.stringify(resolve(root, "public-reading-deploy/api/card.js"))};
      export { deploymentAuthorized } from ${JSON.stringify(resolve(root, "public-reading-deploy/authorization.js"))};
    `, resolveDir: root, loader: "js" }, platform: "node", format: "esm", bundle: true,
      write: false, metafile: true, plugins: [fixturePlugin()] });
    assert.ok(Object.keys(result.metafile.inputs).some(path => path.endsWith(".generated/protected-review-build.js")));
    const bundle = resolve(directory, "adapters.mjs");
    await writeFile(bundle, result.outputFiles[0].text);
    const script = String.raw`
      import assert from "node:assert/strict";
      import { publicReadingDocumentHandler, publicReadingSitemapHandler, publicReadingRobotsHandler,
        publicReadingReadOnlyApi, card, deploymentAuthorized } from "./adapters.mjs";
      const SITE = "https://sod1820.co.il", origin = "https://" + process.env.VERCEL_URL;
      const response = () => ({ code: null, headers: new Map(), body: "",
        setHeader(k,v) { this.headers.set(k.toLowerCase(),v); }, status(v) { this.code=v; return this; },
        send(v) { this.body=String(v); return this; }, json(v) { return this.send(JSON.stringify(v)); } });
      const req = (path, extras={}) => ({ url:path, method:"GET", headers:{host:process.env.VERCEL_URL},
        query:Object.fromEntries(new URL(path,origin).searchParams), ...extras });
      const html = '<html><head><title>fallback</title></head><body>existing body</body></html>';
      const legacy={id:1,wp_id:100,slug:"old-post",title:"Old",source:"wordpress",tags:[],categories:[],date:"2020-01-01"};
      const modern={...legacy,id:2,wp_id:36936,slug:"new-post",title:"Native",source:"sod1820",date:"2026-01-01"};
      let next=legacy, calls=0;
      globalThis.fetch=async url=>{ calls++; assert.match(String(url),/\/rest\/v1\/posts\?/);
        if(next===null) throw Error("synthetic outage");
        return new Response(JSON.stringify(Array.isArray(next)?next:[next]),{headers:{"Content-Type":"application/json"}}); };
      assert.equal(deploymentAuthorized(),true);
      const document=publicReadingDocumentHandler({readDocument:async()=>html});
      for(const [path,row,canonical] of [["/old-post?x=1&x=2&encoded=%2f%2F+%20&path=%2Fkept",legacy,"/old-post"],
        ["/post/old-post",legacy,"/old-post"],["/new-post",modern,"/post/new-post"],
        ["/post/new-post",modern,"/post/new-post"],["/?p=100",legacy,"/old-post"],
        ["/%D7%A9%D7%9C%D7%95%D7%9D",{...legacy,slug:"%d7%a9%d7%9c%d7%95%d7%9d"},"/%D7%A9%D7%9C%D7%95%D7%9D"]]) {
        next=row; const out=response(); await document(req(path),out);
        assert.equal(out.code,200,path); assert.equal(out.headers.get("location"),undefined);
        assert.equal(out.headers.get("cache-control"),"no-store");
        assert.equal(out.headers.get("x-robots-tag"),"noindex, nofollow, noarchive");
        assert.ok(out.body.includes('rel="canonical" href="'+SITE+canonical+'"'),path);
        assert.ok(out.body.includes('property="og:url" content="'+SITE+canonical+'"'),path);
        assert.ok(!out.body.includes(origin)); assert.ok(out.body.includes("existing body"));
        assert.equal((out.body.match(/name="robots"/g)||[]).length,1);
      }
      next=legacy;
      const head=response();await document(req("/old-post",{method:"HEAD"}),head);
      assert.equal(head.code,200);assert.equal(head.body,"");assert.match(head.headers.get("x-robots-tag"),/noindex/);
      for(const [value,code]of[[[],404],[null,503]]){next=value;const out=response();await document(req("/old-post"),out);
        assert.equal(out.code,code);assert.match(out.headers.get("x-robots-tag"),/noindex/);}
      const before=calls;
      for(const [headers,method,code]of[[{host:"sod1820.co.il"},"GET",421],
        [{host:"www.sod1820.co.il"},"GET",421],[{host:"sod1820.vercel.app"},"GET",421],
        [{host:"evil.test","x-forwarded-host":process.env.VERCEL_URL},"GET",421],
        [{host:process.env.VERCEL_URL,"x-forwarded-proto":"http"},"GET",421],
        [{host:process.env.VERCEL_URL},"POST",405]]){
        const out=response();await document(req("/old-post",{headers,method}),out);assert.equal(out.code,code);}
      assert.equal(calls,before,"rejected requests must not read a source");
      let observed;
      const exact=publicReadingDocumentHandler({readDocument:async()=>html,
        metadataHandler:async(request,out)=>{observed=request;out.status(200).send('<head><link rel="canonical" href="'+SITE+'/old-post"/></head>');}});
      const address="/old-post?part=2&part=7&encoded=%2f%2F+%20&path=%2Fkept";
      const preserved=response();await exact(req(address),preserved);assert.equal(observed.url,address);
      assert.equal(observed.query.path,"/old-post");assert.equal(preserved.headers.get("location"),undefined);
      assert.match(preserved.body,/name="robots" content="noindex, nofollow, noarchive"/);
      const robots=response();publicReadingRobotsHandler()(req("/robots.txt"),robots);
      assert.equal(robots.code,200);assert.equal(robots.body,"User-agent: *\nDisallow: /\n");
      assert.match(robots.headers.get("x-robots-tag"),/noindex/);assert.ok(!robots.body.includes("Sitemap:"));
      const sitemap=publicReadingSitemapHandler({handler:async(request,out)=>{
        assert.equal(request.publicReadingProductionArtifact,true);
        out.setHeader("X-Robots-Tag","index, follow");out.setHeader("Cache-Control","public, max-age=3600");
        return out.status(200).send('<urlset><url><loc>'+SITE+'/old-post</loc></url></urlset>');}});
      const xml=response();await sitemap(req("/sitemap.xml"),xml);
      assert.equal(xml.code,200);assert.equal(xml.headers.get("cache-control"),"no-store");
      assert.equal(xml.headers.get("x-robots-tag"),"noindex, nofollow, noarchive");assert.ok(xml.body.includes(SITE));
      const xmlHead=response();await sitemap(req("/sitemap.xml",{method:"HEAD"}),xmlHead);assert.equal(xmlHead.body,"");
      let apiCalls=0;
      const api=publicReadingReadOnlyApi((request,out)=>{apiCalls++;assert.equal(request.headers.authorization,undefined);
        assert.equal(request.headers.cookie,undefined);return out.status(200).json({state:"ready"});});
      const read=response();await api(req("/api/contributor-interactions",{headers:{host:process.env.VERCEL_URL,authorization:"synthetic",cookie:"synthetic"}}),read);
      assert.equal(read.code,200);
      const write=response();await api(req("/api/contributor-interactions",{method:"POST"}),write);
      assert.equal(write.code,405);assert.equal(apiCalls,1);
      globalThis.cardCalls=0;
      const image=await card(new Request(origin+"/api/card?n=1820"));assert.equal(image.status,200);
      assert.match(image.headers.get("x-robots-tag"),/noindex/);assert.equal(image.headers.get("cache-control"),"no-store");
      assert.equal((await card(new Request(SITE+"/api/card"))).status,421);
      assert.equal((await card(new Request(origin+"/api/card",{method:"POST"}))).status,405);
      assert.equal(globalThis.cardCalls,1);
      // Mutating synthetic test process identity cannot admit Production or an
      // unrelated deployment, even with a matching forged request header.
      process.env.VERCEL_ENV="production";
      const denied=response();await document(req("/?approved=true",{publicReadingProductionArtifact:true}),denied);
      assert.equal(denied.code,503);assert.equal((await card(new Request(origin+"/api/card"))).status,503);
      assert.equal(calls,before);console.log(JSON.stringify({pass:true,liveNetworkCalls:0}));
    `;
    await writeFile(resolve(directory, "scenario.mjs"), script);
    const execution = spawnSync(process.execPath, [resolve(directory, "scenario.mjs")], {
      env: { PATH: process.env.PATH, ...fixtureEnv }, encoding: "utf8", timeout: 15000 });
    assert.equal(execution.status, 0, execution.stderr);
    assert.deepEqual(JSON.parse(execution.stdout.trim()), { pass: true, liveNetworkCalls: 0 });
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("artifact root config cannot shadow the pinned review command; default package build stays dormant", async () => {
  const config = JSON.parse(await readFile(resolve(root, "public-reading-deploy/vercel.json"), "utf8"));
  const pkg = JSON.parse(await readFile(resolve(root, "public-reading-deploy/package.json"), "utf8"));
  assert.equal(config.buildCommand, undefined);
  assert.equal(pkg.scripts.build, "node ../scripts/build-public-reading-production.mjs");
});

test("default artifact records raw dirtiness without any platform materialization authority", async () => {
  const artifact = JSON.parse(await readFile(resolve(root, "public-reading-deploy/dist/public-reading-artifact.json"), "utf8"));
  assert.equal(typeof artifact.sourceDirty, "boolean");
  assert.equal(artifact.applicationSourceDirty, artifact.sourceDirty);
  assert.equal(artifact.platformConfigMaterialization, null);
  assert.equal(artifact.protectedReview, null);
  assert.equal(artifact.productionReady, false);
});

test('stable Auth alias needs the exact generated Preview platform proof; canonical and unrelated aliases remain denied',async()=>{
 const env={...fixtureEnv,VERCEL_BRANCH_URL:REVIEW_AUTH_HOST};
 const identity=protectedReviewBuildIdentity({env,sourceSha:sha,sourceDirty:false,requestedSourceSha:sha});
 assert.equal(identity.authHost,REVIEW_AUTH_HOST);assert.equal(protectedReviewRuntimeAuthorized(identity,env),true);
 for(const badEnv of [{...env,VERCEL_BRANCH_URL:'evil.vercel.app'},{...env,VERCEL_BRANCH_URL:undefined},{...env,VERCEL_ENV:'production'},{...env,VERCEL_TARGET_ENV:'production'}])assert.equal(protectedReviewRuntimeAuthorized(identity,badEnv),false);
 assert.equal(protectedReviewRuntimeAuthorized({...identity,authHost:'evil.vercel.app'},env),false);
 const bundle=await build({entryPoints:[resolve(root,'public-reading-deploy/authorization.js')],platform:'browser',format:'iife',globalName:'admission',bundle:true,write:false,plugins:[fixturePlugin(identity)]});
 const ctx={process:{env}};vm.runInNewContext(bundle.outputFiles[0].text,ctx);
 assert.equal(ctx.admission.publicReadingOriginAllowed('https://'+REVIEW_AUTH_HOST),true);
 assert.equal(ctx.admission.publicReadingOriginAllowed('https://'+fixtureEnv.VERCEL_URL),true);
 for(const origin of ['https://sod1820.co.il','https://www.sod1820.co.il','https://sod1820.vercel.app','https://other.vercel.app','https://'+REVIEW_AUTH_HOST+'.evil.invalid'])assert.equal(ctx.admission.publicReadingOriginAllowed(origin),false,origin);
 ctx.process.env={...env,VERCEL_ENV:'production'};assert.equal(ctx.admission.deploymentAuthorized(),false);
});

test("an additional review branch is an exact, Preview-only allowlist entry; nothing else is admitted", () => {
  const extra = ADDITIONAL_REVIEW_BRANCHES[0];
  assert.deepEqual([...ADDITIONAL_REVIEW_BRANCHES], ["claude/number-typography-v2-20261111"]);
  assert.deepEqual([...REVIEW_BRANCHES], [REVIEW_BRANCH, extra]);
  assert.ok(Object.isFrozen(REVIEW_BRANCHES) && Object.isFrozen(ADDITIONAL_REVIEW_BRANCHES));
  const env = { ...fixtureEnv, VERCEL_GIT_COMMIT_REF: extra };
  const identity = protectedReviewBuildIdentity({ env, sourceSha: sha, sourceDirty: false, requestedSourceSha: sha });
  assert.equal(identity.branch, extra);
  assert.equal(identity.mode, "protected-preview-review");
  assert.equal(identity.productionAuthorized, false);
  assert.equal(identity.indexingAuthorized, false);
  assert.equal(protectedReviewRuntimeAuthorized(identity, env), true);
  // The receipt is bound to the branch it was built on and to every platform field.
  assert.equal(protectedReviewRuntimeAuthorized(identity, { ...env, VERCEL_GIT_COMMIT_REF: REVIEW_BRANCH }), false);
  assert.equal(protectedReviewRuntimeAuthorized(identity, { ...env, VERCEL_DEPLOYMENT_ID: "dpl_Other" }), false);
  assert.equal(protectedReviewRuntimeAuthorized(identity, { ...env, VERCEL_URL: "sod1820-other-sod1820-s-projects.vercel.app" }), false);
  // No pattern, prefix, case or look-alike is admitted, and the Production target never admits an additional branch.
  for (const ref of ["claude/number-typography-v2-20261111/x", "claude/number-typography-v2-20261111 ", "CLAUDE/number-typography-v2-20261111",
    "claude/number-typography-v2", "claude/other-branch", "gpt/other-branch", "refs/heads/" + extra, "", undefined, null, 1]) {
    assert.throws(() => protectedReviewBuildIdentity({ env: { ...fixtureEnv, VERCEL_GIT_COMMIT_REF: ref }, sourceSha: sha,
      sourceDirty: false, requestedSourceSha: sha }), /identity_rejected/, String(ref));
  }
  assert.throws(() => protectedReviewBuildIdentity({ env: { ...fixtureEnv, VERCEL_ENV: "production", VERCEL_TARGET_ENV: "production", VERCEL_GIT_COMMIT_REF: extra },
    sourceSha: sha, sourceDirty: false, requestedSourceSha: sha, reviewTarget: "production" }), /identity_rejected/);
  assert.equal(PRODUCTION_REVIEW_BRANCH, "main");
});

test("the stable auth callback host stays with the original review branch only", () => {
  const extra = ADDITIONAL_REVIEW_BRANCHES[0];
  const withHost = (ref) => ({ ...fixtureEnv, VERCEL_GIT_COMMIT_REF: ref, VERCEL_BRANCH_URL: REVIEW_AUTH_HOST });
  assert.equal(protectedReviewBuildIdentity({ env: withHost(REVIEW_BRANCH), sourceSha: sha, sourceDirty: false, requestedSourceSha: sha }).authHost, REVIEW_AUTH_HOST);
  assert.equal(protectedReviewBuildIdentity({ env: withHost(extra), sourceSha: sha, sourceDirty: false, requestedSourceSha: sha }).authHost, undefined);
});
