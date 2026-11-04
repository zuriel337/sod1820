import assert from "node:assert/strict";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import canonicalMiddleware, {config as canonicalConfig} from "../middleware.js";
import publicMiddleware, {config as publicConfig} from "../public-reading-deploy/middleware.js";
import {PUBLIC_READING_DEPLOYMENT_AUTHORIZATION} from "../public-reading-deploy/deployment-policy.js";
import {PRODUCTION_REVIEW_BRANCH,REVIEW_BRANCH} from "../public-reading-deploy/review-admission.js";

// Repository publication contract only. A PASS is neither a live deployment
// receipt nor permission to merge/deploy a retired branch or move domains.
export function assertPublicationConfig({fallback,publication,launch,builder}) {
  assert.equal(fallback.git?.deploymentEnabled,false,"automatic Git deployment must stay off at fallback root");
  assert.equal(publication.git?.deploymentEnabled,false,"automatic Git deployment must stay off at publication root");
  assert.equal(publication.framework,null);
  assert.equal(publication.outputDirectory,"dist");
  for (const [source,destination] of [["/sitemap.xml","/api/public-sitemap"],["/robots.txt","/api/public-robots"],["/2029.html","/api/public-document?path=/2029"],["/((?!api(?:/|$)).*)","/api/public-document"]])
    assert.ok(publication.rewrites?.some(r=>r.source===source&&r.destination===destination),source+" must reach the public document owner");
  assert.equal(publication.functions?.["api/public-document.js"]?.includeFiles,".generated/2029.html");
  assert.ok(!publication.redirects?.some(r=>r.source==="/"&&/^\/2029(?:\/|$)/.test(r.destination)),"home cannot bounce to a prefixed URL");
  assert.ok(publication.headers?.some(r=>r.source.includes("sw.js")&&r.headers.some(h=>h.key==="Cache-Control"&&h.value==="no-store")&&r.headers.some(h=>h.key==="Service-Worker-Allowed"&&h.value==="/")),"real worker remains uncached and root scoped");
  assert.match(launch,/export const CORE_PUBLIC_LAUNCH_2029 = false;/,"fallback selector is not shared Production state");
  for (const text of ["publicCandidateBuildIdentity","protectedReviewBuildIdentity","public_reading_hosted_activation_requires_separate_guard_approval","public_reading_middleware_must_bind_canonical_policy"])
    assert.ok(builder.includes(text),text+" remains enforced");
  return true;
}
export function readPublicationConfig() {
  const read=path=>fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");
  return {fallback:JSON.parse(read("vercel.json")),publication:JSON.parse(read("public-reading-deploy/vercel.json")),launch:read("src/lib/publicLaunch2029.js"),builder:read("scripts/build-public-reading-production.mjs")};
}
export function assertMainReleaseContract() {
  assertPublicationConfig(readPublicationConfig());
  assert.equal(PRODUCTION_REVIEW_BRANCH,"main","retired cutover branches cannot create new production candidates");
  assert.equal(REVIEW_BRANCH,"gpt/2029-main-live-state-reconcile-20261104","only the explicitly current integration branch is admitted for review");
  assert.deepEqual(PUBLIC_READING_DEPLOYMENT_AUTHORIZATION,{state:"dormant",approvedSourceSha:null,approvedDeploymentId:null,approvedAt:null});
  assert.equal(publicMiddleware,canonicalMiddleware);assert.deepEqual(publicConfig,canonicalConfig);
  return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  assertMainReleaseContract();
  console.log("Main 2029 publication contract: PASS; automatic Git deployment OFF; explicit source-pinned publication only; live state not inferred");
}
