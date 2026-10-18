import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFile, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadHybridRoutePolicy } from "./hybrid-preview-routing.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "hybrid-preview-dist");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const policy = await loadHybridRoutePolicy();
const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const branch = execFileSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8" }).trim();

function requireAncestor(sha, label) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", sha, head], { cwd: root, stdio: "ignore" });
  } catch {
    throw new Error(`Hybrid HEAD does not contain the exact ${label} source ${sha}`);
  }
}

requireAncestor(policy.sources.legacySha, "Legacy");
requireAncestor(policy.sources.candidateSha, "2029 candidate");

const dirty = execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], {
  cwd: root,
  encoding: "utf8",
}).trim();
if (dirty && process.env.SOD_HYBRID_ALLOW_DIRTY !== "1") {
  throw new Error("Hybrid Preview build requires a clean source checkout; commit local work first");
}

await rm(output, { recursive: true, force: true });
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const runBuild = (script) => execFileSync(npm, ["run", script, "--", "--outDir", "hybrid-preview-dist"], {
  cwd: root,
  env: { ...process.env, SOD_DEPLOY_ENV: "hybrid-local" },
  stdio: "inherit",
});

runBuild("build:legacy");
await copyFile(resolve(output, "index.html"), resolve(output, "legacy.html"));
runBuild("build:2029");

const readOnlyBootstrap = `<script id="sod-hybrid-local-readonly">
(()=>{const safe=new Set(['GET','HEAD','OPTIONS']);const reads=new Set(['gematria_api','fn_method_value','fn_method_profile','gematria_method_trace','fn_zero_scale','posts_by_number_strict','fn_number_lookup','fn_number_opening_projection_2029','fn_number_dossier','fn_number_journey','fn_verses_by_gematria','lang_links_list','number_neighbors','fn_all_methods','world_group_source_arrivals_v3','world_group_source_arrivals_v2','convergence_meter','get_category_videos','notification_prefs_guest_get_v1']);const allowed=(method,raw)=>{const url=new URL(raw,location.href);const rpc=url.pathname.match(/^\\/rest\\/v1\\/rpc\\/(.+)$/)?.[1];return safe.has(String(method||'GET').toUpperCase())||(url.hostname==='linswmnnkjxvweumprav.supabase.co'&&String(method).toUpperCase()==='POST'&&reads.has(rpc));};const nativeFetch=globalThis.fetch.bind(globalThis);globalThis.fetch=(input,init)=>{const request=input instanceof Request?input:new Request(input,init);if(allowed(request.method,request.url))return nativeFetch(input,init);return Promise.resolve(new Response(JSON.stringify({error:'hybrid_local_read_only'}),{status:403,headers:{'Content-Type':'application/json','X-Hybrid-Write-Blocked':'true'}}));};const xhrOpen=globalThis.XMLHttpRequest?.prototype.open;const xhrSend=globalThis.XMLHttpRequest?.prototype.send;if(xhrOpen&&xhrSend){globalThis.XMLHttpRequest.prototype.open=function(method,url,...rest){this.__sodHybridAllowed=allowed(method,url);return xhrOpen.call(this,method,url,...rest);};globalThis.XMLHttpRequest.prototype.send=function(...args){if(!this.__sodHybridAllowed)throw new DOMException('Hybrid Preview is read-only','SecurityError');return xhrSend.apply(this,args);};}if(typeof navigator.sendBeacon==='function'){try{navigator.sendBeacon=()=>false;}catch{}}document.addEventListener('submit',event=>{if(String(event.target?.method||'get').toUpperCase()==='POST'){event.preventDefault();event.stopImmediatePropagation();}},true);document.documentElement.dataset.sodHybridGuard='local-read-only';})();
</script>`;

async function sealDocument(name, runtime) {
  const path = resolve(output, name);
  let html = await readFile(path, "utf8");
  const markers = `<meta name="robots" content="noindex,nofollow,noarchive"><meta name="sod-hybrid-runtime" content="${runtime}">`;
  html = html.replace(/<head(\s[^>]*)?>/i, (head) => `${head}${markers}${readOnlyBootstrap}`);
  await writeFile(path, html);
  return { path: name, sha256: sha256(html), bytes: Buffer.byteLength(html) };
}

const legacy = await sealDocument("legacy.html", "legacy");
const index = await sealDocument("index.html", "legacy");
const candidate2029 = await sealDocument("2029.html", "2029");
const policyBytes = await readFile(resolve(root, "config/hybrid-preview-routes.json"));
const receipt = {
  schemaVersion: 1,
  status: policy.status,
  branch,
  head,
  sourceClean: !dirty,
  sources: policy.sources,
  defaultRuntime: policy.defaultRuntime,
  routePolicySha256: sha256(policyBytes),
  candidate2029RouteCount: policy.candidate2029Routes.length,
  explicitLegacyRouteCount: policy.explicitLegacyRoutes.length,
  documents: { legacy, index, candidate2029 },
  hostedPreviewReady: false,
  hostedPreviewBlocker: "local guard only; hosted service-worker attestation and Vercel config are intentionally not enabled",
};
await writeFile(resolve(output, "hybrid-preview-build.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ output, head, sourceClean: !dirty, routes2029: receipt.candidate2029RouteCount, hostedPreviewReady: false }));
