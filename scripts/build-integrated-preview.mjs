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
const GUARD_DEADLINE_MS = 8_000;

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

function assertCleanTrackedSource() {
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
assertCleanTrackedSource();

const [
  { build },
  { NUMBER_REVIEW_PREVIEW_BRANCH_2029, isNumberReviewPreviewBuild2029 },
  { renderPreviewReadonlyWorker, PREVIEW_GUARD_PROTOCOL },
  { createPreviewArtifactInventory },
] = await Promise.all([
  import("vite"),
  import("../src/lib/numberReviewPreview2029.js"),
  import("./preview-readonly-worker.mjs"),
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

const bootstrap = `<script type="module">
const expectedHost=${JSON.stringify(previewHost)};
const workerScript=${JSON.stringify(workerScript)};
const expectedIdentity=Object.freeze(${JSON.stringify(expectedWorkerIdentity)});
const guardDeadlineMs=${GUARD_DEADLINE_MS};
const blocked=()=>new Response(JSON.stringify({error:'preview_guard_pending'}),{status:403,headers:{'Content-Type':'application/json','X-Preview-Write-Blocked':'true'}});
let released=false,closed=false,timer=0;
document.documentElement.dataset.sodPreviewGuard='checking';
const nativeFetch=globalThis.fetch.bind(globalThis);
globalThis.fetch=(input,init)=>{
 const request=input instanceof Request?input:new Request(input,init);
 return !released&&!['GET','HEAD','OPTIONS'].includes(request.method)?Promise.resolve(blocked()):nativeFetch(input,init);
};
const xhrOpen=globalThis.XMLHttpRequest?.prototype.open;
const xhrSend=globalThis.XMLHttpRequest?.prototype.send;
if(xhrOpen&&xhrSend){
 globalThis.XMLHttpRequest.prototype.open=function(method,...args){this.__sodPreviewMethod=String(method||'GET').toUpperCase();return xhrOpen.call(this,method,...args);};
 globalThis.XMLHttpRequest.prototype.send=function(...args){if(!released&&!['GET','HEAD','OPTIONS'].includes(this.__sodPreviewMethod||'GET'))throw new DOMException('Preview guard pending','SecurityError');return xhrSend.apply(this,args);};
}
const nativeBeacon=typeof navigator.sendBeacon==='function'?navigator.sendBeacon.bind(navigator):null;
if(nativeBeacon){try{navigator.sendBeacon=(...args)=>released?nativeBeacon(...args):false;}catch{}}
const blockForm=event=>{if(!released&&String(event.target?.method||'get').toUpperCase()==='POST'){event.preventDefault();event.stopImmediatePropagation();}};
document.addEventListener('submit',blockForm,true);
const releaseTransportGuard=()=>{
 released=true;
 globalThis.fetch=nativeFetch;
 if(xhrOpen&&xhrSend){globalThis.XMLHttpRequest.prototype.open=xhrOpen;globalThis.XMLHttpRequest.prototype.send=xhrSend;}
 if(nativeBeacon){try{navigator.sendBeacon=nativeBeacon;}catch{}}
 document.removeEventListener('submit',blockForm,true);
};
const fail=()=>{
 closed=true;
 document.documentElement.dataset.sodPreviewGuard='blocked';
 const render=()=>{
  const body=document.body||document.documentElement.appendChild(document.createElement('body'));
  body.textContent='לא ניתן לאמת את מצב הקריאה בלבד של הפריוויו. יש לרענן את הדף.';
 };
 document.body?render():document.addEventListener('DOMContentLoaded',render,{once:true});
};
const sameIdentity=value=>{
 if(!value||typeof value!=='object')return false;
 const keys=Object.keys(expectedIdentity);
 return keys.length===Object.keys(value).length&&keys.every(key=>JSON.stringify(value[key])===JSON.stringify(expectedIdentity[key]));
};
const attest=worker=>new Promise((resolve,reject)=>{
 const channel=new MessageChannel();
 const nonce=crypto.randomUUID?crypto.randomUUID():String(Math.random());
 channel.port1.onmessage=event=>{
  const data=event.data;
  if(data?.type==='SOD_PREVIEW_GUARD_ATTESTATION'&&data.nonce===nonce&&sameIdentity(data.identity))resolve(data.identity);
  else reject(new Error('preview_guard_attestation_mismatch'));
 };
 try{worker.postMessage({type:'SOD_PREVIEW_GUARD_CHALLENGE',nonce},[channel.port2]);}catch(error){reject(error);}
});
const waitForVerifiedController=registration=>new Promise(resolve=>{
 const attempted=new WeakSet();
 const bound=new WeakSet();
 const bind=worker=>{
  if(!worker||bound.has(worker))return;
  bound.add(worker);
  worker.addEventListener('statechange',check);
 };
 const check=()=>{
  if(closed)return;
  bind(registration.installing);bind(registration.waiting);bind(registration.active);
  const worker=navigator.serviceWorker.controller;
  const exact=worker?.scriptURL===new URL(workerScript,location.href).href&&worker.state==='activated'&&registration.active?.scriptURL===worker.scriptURL;
  if(!exact||attempted.has(worker))return;
  attempted.add(worker);
  attest(worker).then(identity=>{
   if(!closed&&navigator.serviceWorker.controller===worker&&registration.active?.scriptURL===worker.scriptURL)resolve({worker,identity});
  }).catch(()=>{});
 };
 navigator.serviceWorker.addEventListener('controllerchange',check);
 registration.addEventListener('updatefound',check);
 check();
});
const verify=async()=>{
 if(!('serviceWorker'in navigator)||location.hostname.toLowerCase()!==expectedHost)throw new Error('preview_guard_host_mismatch');
 const registration=await navigator.serviceWorker.register(workerScript,{scope:'/',updateViaCache:'none'});
 try{await registration.update();}catch(error){if(!registration.installing)throw error;}
 return waitForVerifiedController(registration);
};
try{
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{closed=true;reject(new Error('preview_guard_deadline'));},guardDeadlineMs);});
 await Promise.race([verify(),deadline]);
 if(closed)throw new Error('preview_guard_closed');
 clearTimeout(timer);
 releaseTransportGuard();
 document.documentElement.dataset.sodPreviewGuard=expectedIdentity.guardIdentitySha256;
 await import('__ENTRY__');
}catch{clearTimeout(timer);fail();}
</script>`;

let html = await readFile(resolve(output, "2029.html"), "utf8");
const entry = html.match(/<script\b[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/);
if (!entry) throw new Error("missing2029Entry");
html = html.replace(entry[0], bootstrap.replace("__ENTRY__", entry[1]));
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
  guardDeadlineMs: GUARD_DEADLINE_MS,
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
