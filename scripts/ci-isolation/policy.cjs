const fs = require('node:fs');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
function requireIsolation() {
  if (process.env.SOD_CI_ISOLATION !== '1' || !process.env.SOD_CI_AUDIT || !process.env.SOD_CI_PORTS || !process.env.LD_PRELOAD)
    throw new Error('Run with scripts/ci-isolation/run.mjs; safe network configuration required before connecting');
}
function violation(message) {
  requireIsolation();
  fs.appendFileSync(process.env.SOD_CI_AUDIT, `policy:${message}\n`);
  throw new Error(`CI_EGRESS_DENIED: ${message}`);
}
function permitLocalServer(server) {
  requireIsolation();
  const address = server.address();
  if (!address || typeof address === 'string' || !['127.0.0.1', '::1'].includes(address.address)) throw new Error('Only explicitly bound loopback servers may be permitted');
  fs.appendFileSync(process.env.SOD_CI_PORTS, `${address.port}\n`);
  server.once('close',()=>{
    const file=process.env.SOD_CI_PORTS;
    const remaining=fs.readFileSync(file,'utf8').split(/\s+/).filter(p=>p&&p!==String(address.port));
    const temp=file+'.'+process.pid+'.tmp';fs.writeFileSync(temp,remaining.join('\n')+'\n');fs.renameSync(temp,file);
  });
  return `http://${address.address === '::1' ? '[::1]' : address.address}:${address.port}`;
}
function auditCheckpoint() { requireIsolation(); return fs.statSync(process.env.SOD_CI_AUDIT).size; }
function assertClean(since=0) {
  const entries = fs.readFileSync(process.env.SOD_CI_AUDIT, 'utf8').slice(since);
  if (entries.trim()) throw new Error(`CI forbidden I/O occurred, including swallowed failures:\n${entries}`);
}
function frozenSnapshot(file=process.env.SOD_CI_SNAPSHOT, digest=process.env.SOD_CI_SNAPSHOT_SHA256) {
  requireIsolation();
  if (!file || !/^[a-f0-9]{64}$/.test(digest || '')) throw new Error('A frozen SOD_CI_SNAPSHOT + exact SOD_CI_SNAPSHOT_SHA256 is required; no live fallback');
  const bytes=fs.readFileSync(file);
  if(crypto.createHash('sha256').update(bytes).digest('hex') !== digest) throw new Error('Frozen snapshot SHA256 mismatch');
  const data=JSON.parse(zlib.gunzipSync(bytes));
  if(!data || typeof data!=='object' || !Object.keys(data).length) throw new Error('Empty snapshot is not representative test data');
  for(const [key,row] of Object.entries(data)){
    if(!/^(GET|HEAD|POST|OPTIONS) https?:\/\//.test(key)||!row||!Number.isInteger(row.status)||row.status<100||row.status>599||typeof row.body!=='string'||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(row.body))
      throw new Error('Malformed frozen response: '+key.split(' ')[0]);
  }
  return data;
}
const NORMALIZE = u => decodeURIComponent(u).replace(/\d{4}-\d\d-\d\dT[\d:.]+(?:Z|\+00:00| ?00:00)?/g,'TS');
function fixtureKey(req, headers=false) {
  let body=req.postData()||'';try{body=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(body)).sort(([a],[b])=>a.localeCompare(b))));}catch{}
  return `${req.method()} ${NORMALIZE(req.url())} ${body}`+(headers?` ${JSON.stringify(Object.fromEntries(['prefer','range','accept-profile'].map(k=>[k,req.headers()[k]||''])))}`:'');
}
// These existing fire-and-forget effects have no content response contract. They
// execute only against this explicit test substitute, never a live service.
const EFFECTS = /^\/rest\/v1\/(?:rpc\/(?:track_visit|ingest_event|link_identity)|visitor_events|page_views|user_activity)$/;
function requestPolicy(req, localOrigin, fixtures, key=fixtureKey(req)) {
  const u=new URL(req.url()),method=req.method();
  if(u.origin===localOrigin && ['GET','HEAD'].includes(method)) return 'local';
  if(u.origin==='https://linswmnnkjxvweumprav.supabase.co' && EFFECTS.test(u.pathname) && method==='POST') return 'effect-fixture';
  if(!['GET','HEAD','OPTIONS'].includes(method) && !(method==='POST' && /^\/rest\/v1\/rpc\/[^/]+$/.test(u.pathname)))
    return violation(`${method} ${u.origin}${u.pathname}`);
  if(!Object.hasOwn(fixtures,key)) return violation(`unmapped fixture ${method} ${u.origin}${u.pathname}`);
  return 'fixture';
}
const browserArgs=['--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--disable-domain-reliability','--disable-features=MediaRouter,OptimizationHints,DnsOverHttps,UseDnsHttpsSvcb,AsyncDns','--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1, EXCLUDE [::1]'];
async function installTransportBoundary(context) {
  requireIsolation();
  // sendBeacon can be discarded during page close before Playwright receives a
  // request event. Record forbidden invocation through the controller binding
  // before shutdown as well as blocking it. Known telemetry goes to its explicit
  // local response substitute in requestPolicy.
  await context.exposeBinding('__sodCiForbiddenBeacon',(_source,url)=>{try{violation(`beacon ${url}`);}catch{}});
  await context.addInitScript(({effectSource})=>{
    const send=Navigator.prototype.sendBeacon,effects=new RegExp(effectSource);
    Navigator.prototype.sendBeacon=function(url,body){
      const u=new URL(url,location.href);
      if(u.origin==='https://linswmnnkjxvweumprav.supabase.co'&&effects.test(u.pathname))return send.call(this,url,body);
      window.__sodCiForbiddenBeacon(u.origin+u.pathname).catch(()=>{});
      return false;
    };
  },{effectSource:EFFECTS.source});
  await context.routeWebSocket('**/*', socket=>{try{violation(`WebSocket ${new URL(socket.url()).origin}`);}catch{}socket.close();});
}
async function installBrowserBoundary(context,{origin,fixtures,headers=false}) {
  await installTransportBoundary(context);
  await context.route('**/*',async route=>{
    const req=route.request();
    try{
      const key=fixtureKey(req,headers),kind=requestPolicy(req,origin,fixtures,key);
      if(kind==='local')return route.continue();
      if(kind==='effect-fixture')return route.fulfill({status:204,body:''});
      const row=fixtures[key];
      return route.fulfill({status:row.status,body:req.method()==='HEAD'?'':Buffer.from(row.body,'base64'),headers:{'content-type':row.type||'application/json','access-control-allow-origin':'*','access-control-expose-headers':'content-range',...(row.range?{'content-range':row.range}:{})}});
    }catch(error){await route.abort('blockedbyclient');}
  });
}
module.exports={requireIsolation,violation,permitLocalServer,auditCheckpoint,assertClean,frozenSnapshot,fixtureKey,requestPolicy,installBrowserBoundary,installTransportBoundary,browserArgs};
