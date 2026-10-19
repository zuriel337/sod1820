export const PREVIEW_GUARD_DEADLINE_MS = 8_000;

function json(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

export function renderPreviewReadonlyBootstrap({
  host,
  workerScript,
  expectedIdentity,
  entry,
  guardDeadlineMs = PREVIEW_GUARD_DEADLINE_MS,
}) {
  if (typeof host !== "string" || !host) throw new Error("Preview bootstrap requires an exact host");
  if (typeof workerScript !== "string" || !workerScript.startsWith("/preview-readonly-sw.js?content=")) {
    throw new Error("Preview bootstrap requires a content-bound worker URL");
  }
  if (!expectedIdentity || typeof expectedIdentity !== "object") throw new Error("Preview bootstrap requires an identity");
  if (typeof entry !== "string" || !entry.startsWith("/assets/") || !entry.endsWith(".js")) {
    throw new Error("Preview bootstrap requires an exact built entry");
  }
  if (!Number.isSafeInteger(guardDeadlineMs) || guardDeadlineMs < 1_000 || guardDeadlineMs > 20_000) {
    throw new Error("Preview bootstrap guard deadline is out of bounds");
  }

  return `<script id="sod-preview-readonly-bootstrap" type="module">
const expectedHost=${json(host)};
const workerScript=${json(workerScript)};
const expectedIdentity=Object.freeze(${json(expectedIdentity)});
const guardDeadlineMs=${guardDeadlineMs};
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
 await import(${json(entry)});
}catch{clearTimeout(timer);fail();}
</script>`;
}
